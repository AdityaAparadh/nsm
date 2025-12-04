#!/bin/bash

# ===================================================================
#  Remote Evaluation Producer
#  Publishes evaluation jobs to RabbitMQ for serial processing.
#  Called by the judge server when assignment has REMOTE evaluation type.
# ===================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
VENV_PYTHON="/home/aditya/Projects/nsm/remote/.venv/bin/python3"

# Load environment
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

# Default values
RABBITMQ_HOST="${RABBITMQ_HOST:-localhost}"
RABBITMQ_PORT="${RABBITMQ_PORT:-5672}"
RABBITMQ_USER="${RABBITMQ_USER:-nsm}"
RABBITMQ_PASS="${RABBITMQ_PASS:-nsm_password}"
RABBITMQ_QUEUE="${RABBITMQ_QUEUE:-evaluation_queue}"

# Usage
usage() {
    echo "Usage: $0 <workshopId> <assignmentId> <participantId> <participantEmail> <filePath> <s3EvalBinaryKey>"
    exit 1
}

if [ $# -lt 6 ]; then
    usage
fi

WORKSHOP_ID="$1"
ASSIGNMENT_ID="$2"
PARTICIPANT_ID="$3"
PARTICIPANT_EMAIL="$4"
FILE_PATH="$5"
S3_EVAL_BINARY_KEY="$6"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Use Python with pika to publish
"$VENV_PYTHON" - "$WORKSHOP_ID" "$ASSIGNMENT_ID" "$PARTICIPANT_ID" "$PARTICIPANT_EMAIL" "$FILE_PATH" "$S3_EVAL_BINARY_KEY" "$TIMESTAMP" "$RABBITMQ_HOST" "$RABBITMQ_PORT" "$RABBITMQ_USER" "$RABBITMQ_PASS" "$RABBITMQ_QUEUE" << 'PYTHON_SCRIPT'
import pika
import json
import sys

# Get arguments
workshop_id = int(sys.argv[1])
assignment_id = int(sys.argv[2])
participant_id = int(sys.argv[3])
participant_email = sys.argv[4]
file_path = sys.argv[5]
s3_eval_binary_key = sys.argv[6]
timestamp = sys.argv[7]
rabbitmq_host = sys.argv[8]
rabbitmq_port = int(sys.argv[9])
rabbitmq_user = sys.argv[10]
rabbitmq_pass = sys.argv[11]
rabbitmq_queue = sys.argv[12]

# Build payload
payload = {
    "workshopId": workshop_id,
    "assignmentId": assignment_id,
    "participantId": participant_id,
    "participantEmail": participant_email,
    "filePath": file_path,
    "s3EvalBinaryKey": s3_eval_binary_key,
    "submittedAt": timestamp,
    "status": "PENDING"
}

try:
    credentials = pika.PlainCredentials(rabbitmq_user, rabbitmq_pass)
    parameters = pika.ConnectionParameters(
        host=rabbitmq_host,
        port=rabbitmq_port,
        credentials=credentials
    )
    
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    
    # Declare queue (creates if doesn't exist)
    channel.queue_declare(queue=rabbitmq_queue, durable=True)
    
    # Publish message
    channel.basic_publish(
        exchange='',
        routing_key=rabbitmq_queue,
        body=json.dumps(payload),
        properties=pika.BasicProperties(
            delivery_mode=2,  # Make message persistent
            content_type='application/json'
        )
    )
    
    connection.close()
    print("Job queued successfully")
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
PYTHON_SCRIPT
