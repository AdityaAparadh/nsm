#!/bin/bash

# ===================================================================
#  Remote Evaluation Worker
#  Consumes evaluation jobs from RabbitMQ and processes them serially.
#  This ensures fair evaluation for competitive/timed assignments.
# ===================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
EVAL_CACHE_DIR="/tmp/nsm-remote-eval-cache"

# --- Cleanup ---
cleanup() {
    echo "Worker shutting down..."
    exit 0
}
trap cleanup SIGTERM SIGINT

# --- Load Environment ---
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
else
    echo "Error: Environment file not found at $ENV_FILE" >&2
    exit 1
fi

# Default values
RABBITMQ_HOST="${RABBITMQ_HOST:-localhost}"
RABBITMQ_PORT="${RABBITMQ_PORT:-5672}"
RABBITMQ_USER="${RABBITMQ_USER:-nsm}"
RABBITMQ_PASS="${RABBITMQ_PASS:-nsm_password}"
RABBITMQ_QUEUE="${RABBITMQ_QUEUE:-evaluation_queue}"

# Validate required environment variables
if [ -z "$BACKEND_URI" ] || [ -z "$API_TOKEN" ]; then
    echo "Error: BACKEND_URI and API_TOKEN must be set in $ENV_FILE" >&2
    exit 1
fi

# Create cache directory
mkdir -p "$EVAL_CACHE_DIR"

echo "=========================================="
echo "  Remote Evaluation Worker"
echo "=========================================="
echo "RabbitMQ: ${RABBITMQ_HOST}:${RABBITMQ_PORT}"
echo "Queue: ${RABBITMQ_QUEUE}"
echo "Backend: ${BACKEND_URI}"
echo "=========================================="

# --- Helper Functions ---

# Get presigned download URL from API
get_presigned_download_url() {
    local s3_key="$1"
    
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $API_TOKEN" \
        -d "{\"s3Key\": \"$s3_key\"}" \
        "${BACKEND_URI}/api/v1/storage/download-url")
    
    local download_url=$(echo "$response" | jq -r '.downloadUrl')
    
    if [ -z "$download_url" ] || [ "$download_url" == "null" ]; then
        echo ""
        return 1
    fi
    
    echo "$download_url"
    return 0
}

# Download evaluation binary
download_eval_binary() {
    local assignment_id="$1"
    local s3_key="$2"
    local output_path="$EVAL_CACHE_DIR/eval_${assignment_id}"
    
    # Get presigned download URL
    local download_url=$(get_presigned_download_url "$s3_key")
    
    if [ -z "$download_url" ]; then
        echo "Error: Failed to get presigned download URL" >&2
        return 1
    fi
    
    # Download
    if ! curl -s -o "$output_path" "$download_url"; then
        echo "Error: Failed to download evaluation binary" >&2
        return 1
    fi
    
    # Fix line endings for scripts
    if file "$output_path" | grep -q "text"; then
        sed -i 's/\r$//' "$output_path"
    fi
    
    chmod +x "$output_path"
    echo "$output_path"
    return 0
}

# Get latest attempt number
get_latest_attempt_number() {
    local participant_id="$1"
    local assignment_id="$2"
    
    local response=$(curl -s -X GET \
        -H "Authorization: Bearer $API_TOKEN" \
        "${BACKEND_URI}/api/v1/submissions?participantId=${participant_id}&assignmentId=${assignment_id}&limit=100")
    
    local max_attempt=$(echo "$response" | jq -r '[.data[].attemptNumber] | max // 0')
    
    if [ -z "$max_attempt" ] || [ "$max_attempt" == "null" ]; then
        echo "0"
        return 0
    fi
    
    echo "$max_attempt"
    return 0
}

# Create submission via API
create_submission() {
    local participant_id="$1"
    local assignment_id="$2"
    local score="$3"
    local attempt_number="$4"
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $API_TOKEN" \
        -d "{\"participantId\": $participant_id, \"assignmentId\": $assignment_id, \"score\": $score, \"attemptNumber\": $attempt_number}" \
        "$BACKEND_URI/api/v1/submissions")
    
    local http_status=$(echo "$response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$http_status" -eq 201 ] || [ "$http_status" -eq 200 ]; then
        return 0
    else
        return 1
    fi
}

# --- Process a single job ---
process_job() {
    local message="$1"
    
    echo ""
    echo "--- Processing Job ---"
    echo "Received at: $(date)"
    
    # Parse message
    local workshop_id=$(echo "$message" | jq -r '.workshopId')
    local assignment_id=$(echo "$message" | jq -r '.assignmentId')
    local participant_id=$(echo "$message" | jq -r '.participantId')
    local participant_email=$(echo "$message" | jq -r '.participantEmail')
    local file_path=$(echo "$message" | jq -r '.filePath')
    local s3_eval_key=$(echo "$message" | jq -r '.s3EvalBinaryKey')
    
    echo "Workshop: $workshop_id, Assignment: $assignment_id"
    echo "Participant: $participant_email (ID: $participant_id)"
    echo "File: $file_path"
    
    # Validate required fields
    if [ -z "$assignment_id" ] || [ "$assignment_id" == "null" ] || \
       [ -z "$participant_id" ] || [ "$participant_id" == "null" ] || \
       [ -z "$file_path" ] || [ "$file_path" == "null" ] || \
       [ -z "$s3_eval_key" ] || [ "$s3_eval_key" == "null" ]; then
        echo "Error: Missing required fields in job message"
        return 1
    fi
    
    # Check if file exists
    if [ ! -f "$file_path" ]; then
        echo "Error: Submitted file not found: $file_path"
        return 1
    fi
    
    # Download evaluation binary
    echo "Downloading evaluation binary..."
    local eval_binary=$(download_eval_binary "$assignment_id" "$s3_eval_key")
    if [ $? -ne 0 ] || [ -z "$eval_binary" ]; then
        echo "Error: Failed to download evaluation binary"
        return 1
    fi
    
    # Execute evaluation
    echo "Running evaluation..."
    local score=$("$eval_binary" "$file_path" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        echo "Error: Evaluation failed (exit code: $exit_code)"
        echo "Output: $score"
        return 1
    fi
    
    # Extract score (last line)
    score=$(echo "$score" | tail -n 1)
    
    # Validate score is numeric
    if ! [[ "$score" =~ ^[+-]?[0-9]+\.?[0-9]*$ ]]; then
        echo "Error: Invalid score from evaluator: '$score'"
        return 1
    fi
    
    echo "Score: $score"
    
    # Get attempt number
    local latest_attempt=$(get_latest_attempt_number "$participant_id" "$assignment_id")
    local attempt_number=$((latest_attempt + 1))
    echo "Attempt number: $attempt_number"
    
    # Create submission
    echo "Creating submission record..."
    if create_submission "$participant_id" "$assignment_id" "$score" "$attempt_number"; then
        echo "✓ Submission created successfully"
        return 0
    else
        echo "Error: Failed to create submission record"
        return 1
    fi
}

# --- Main Worker Loop ---
echo ""
echo "Starting worker loop..."
echo "Waiting for jobs..."

# Use Python for consuming (more reliable than shell-based AMQP)
python3 << 'PYTHON_SCRIPT'
import pika
import json
import subprocess
import os
import sys

# Configuration from environment
RABBITMQ_HOST = os.environ.get('RABBITMQ_HOST', 'localhost')
RABBITMQ_PORT = int(os.environ.get('RABBITMQ_PORT', 5672))
RABBITMQ_USER = os.environ.get('RABBITMQ_USER', 'nsm')
RABBITMQ_PASS = os.environ.get('RABBITMQ_PASS', 'nsm_password')
RABBITMQ_QUEUE = os.environ.get('RABBITMQ_QUEUE', 'evaluation_queue')

def process_message(ch, method, properties, body):
    """Process a single message from the queue."""
    try:
        message = body.decode('utf-8')
        print(f"\n[x] Received job", flush=True)
        
        # Call the bash function to process the job
        # We pass the message as an argument
        result = subprocess.run(
            ['bash', '-c', f'source {os.path.dirname(os.path.abspath(__file__))}/worker.sh; process_job \'{message}\''],
            capture_output=False,
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        # Acknowledge the message (remove from queue)
        ch.basic_ack(delivery_tag=method.delivery_tag)
        print(f"[x] Job completed", flush=True)
        
    except Exception as e:
        print(f"[!] Error processing job: {e}", file=sys.stderr, flush=True)
        # Negative acknowledge - requeue the message
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

def main():
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    parameters = pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        port=RABBITMQ_PORT,
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300
    )
    
    while True:
        try:
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()
            
            # Declare queue
            channel.queue_declare(queue=RABBITMQ_QUEUE, durable=True)
            
            # Fair dispatch - only send one message at a time
            channel.basic_qos(prefetch_count=1)
            
            # Set up consumer
            channel.basic_consume(
                queue=RABBITMQ_QUEUE,
                on_message_callback=process_message,
                auto_ack=False
            )
            
            print(f'[*] Connected to RabbitMQ. Waiting for messages...', flush=True)
            channel.start_consuming()
            
        except pika.exceptions.AMQPConnectionError as e:
            print(f'[!] Connection lost: {e}. Reconnecting in 5 seconds...', file=sys.stderr, flush=True)
            import time
            time.sleep(5)
        except KeyboardInterrupt:
            print('\n[*] Interrupted. Shutting down...', flush=True)
            break

if __name__ == '__main__':
    main()
PYTHON_SCRIPT
