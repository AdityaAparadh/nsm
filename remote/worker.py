#!/home/aditya/Projects/nsm/remote/.venv/bin/python3
"""
Remote Evaluation Worker
Consumes evaluation jobs from RabbitMQ and processes them serially.
This ensures fair evaluation for competitive/timed assignments.
"""

import os
import sys
import json
import time
import subprocess
import tempfile
import requests
import pika
from pathlib import Path

# Configuration
SCRIPT_DIR = Path(__file__).parent.absolute()
ENV_FILE = SCRIPT_DIR / '.env'
EVAL_CACHE_DIR = Path('/tmp/nsm-remote-eval-cache')

# Load environment from .env file
def load_env():
    if ENV_FILE.exists():
        with open(ENV_FILE) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ.setdefault(key.strip(), value.strip())

load_env()

# Configuration from environment
RABBITMQ_HOST = os.environ.get('RABBITMQ_HOST', 'localhost')
RABBITMQ_PORT = int(os.environ.get('RABBITMQ_PORT', 5672))
RABBITMQ_USER = os.environ.get('RABBITMQ_USER', 'nsm')
RABBITMQ_PASS = os.environ.get('RABBITMQ_PASS', 'nsm_password')
RABBITMQ_QUEUE = os.environ.get('RABBITMQ_QUEUE', 'evaluation_queue')
BACKEND_URI = os.environ.get('BACKEND_URI', 'http://localhost:3000')
API_TOKEN = os.environ.get('API_TOKEN', '')


class EvaluationWorker:
    def __init__(self):
        EVAL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {API_TOKEN}',
            'Content-Type': 'application/json'
        })
    
    def get_presigned_download_url(self, s3_key: str) -> str | None:
        """Get presigned download URL from API."""
        try:
            response = self.session.post(
                f'{BACKEND_URI}/api/v1/storage/download-url',
                json={'s3Key': s3_key}
            )
            response.raise_for_status()
            return response.json().get('downloadUrl')
        except Exception as e:
            print(f"  Error getting download URL: {e}", file=sys.stderr)
            return None
    
    def download_eval_binary(self, assignment_id: int, s3_key: str) -> str | None:
        """Download evaluation binary from S3."""
        output_path = EVAL_CACHE_DIR / f'eval_{assignment_id}'
        
        # Get presigned URL
        download_url = self.get_presigned_download_url(s3_key)
        if not download_url:
            return None
        
        # Download file
        try:
            response = requests.get(download_url)
            response.raise_for_status()
            
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            # Check if it's a text file and fix line endings
            with open(output_path, 'rb') as f:
                content = f.read()
            
            if b'\r\n' in content:
                content = content.replace(b'\r\n', b'\n')
                with open(output_path, 'wb') as f:
                    f.write(content)
            
            # Make executable
            output_path.chmod(0o755)
            
            return str(output_path)
        except Exception as e:
            print(f"  Error downloading binary: {e}", file=sys.stderr)
            return None
    
    def get_latest_attempt_number(self, participant_id: int, assignment_id: int) -> int:
        """Get the latest attempt number for a participant's assignment."""
        try:
            response = self.session.get(
                f'{BACKEND_URI}/api/v1/submissions',
                params={
                    'participantId': participant_id,
                    'assignmentId': assignment_id,
                    'limit': 100
                }
            )
            response.raise_for_status()
            data = response.json()
            
            attempts = [s.get('attemptNumber', 0) for s in data.get('data', [])]
            return max(attempts) if attempts else 0
        except Exception as e:
            print(f"  Error getting attempt number: {e}", file=sys.stderr)
            return 0
    
    def create_submission(self, participant_id: int, assignment_id: int, score: float, attempt_number: int) -> bool:
        """Create submission record via API."""
        try:
            response = self.session.post(
                f'{BACKEND_URI}/api/v1/submissions',
                json={
                    'participantId': participant_id,
                    'assignmentId': assignment_id,
                    'score': score,
                    'attemptNumber': attempt_number
                }
            )
            return response.status_code in [200, 201]
        except Exception as e:
            print(f"  Error creating submission: {e}", file=sys.stderr)
            return False
    
    def process_job(self, message: dict) -> bool:
        """Process a single evaluation job."""
        print("\n" + "=" * 50)
        print(f"Processing Job at {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 50)
        
        # Extract job details
        workshop_id = message.get('workshopId')
        assignment_id = message.get('assignmentId')
        participant_id = message.get('participantId')
        participant_email = message.get('participantEmail', 'unknown')
        file_path = message.get('filePath')
        s3_eval_key = message.get('s3EvalBinaryKey')
        
        print(f"  Workshop: {workshop_id}, Assignment: {assignment_id}")
        print(f"  Participant: {participant_email} (ID: {participant_id})")
        print(f"  File: {file_path}")
        
        # Validate required fields
        if not all([assignment_id, participant_id, file_path, s3_eval_key]):
            print("  Error: Missing required fields")
            return False
        
        # Check if file exists
        if not Path(file_path).exists():
            print(f"  Error: File not found: {file_path}")
            return False
        
        # Download evaluation binary
        print("  Downloading evaluation binary...")
        eval_binary = self.download_eval_binary(assignment_id, s3_eval_key)
        if not eval_binary:
            print("  Error: Failed to download evaluation binary")
            return False
        
        # Run evaluation
        print("  Running evaluation...")
        try:
            result = subprocess.run(
                [eval_binary, file_path],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                print(f"  Error: Evaluation failed (exit code: {result.returncode})")
                print(f"  Output: {result.stdout}")
                print(f"  Stderr: {result.stderr}")
                return False
            
            # Get score from last line of output
            output_lines = result.stdout.strip().split('\n')
            score_str = output_lines[-1] if output_lines else '0'
            
            try:
                score = float(score_str)
            except ValueError:
                print(f"  Error: Invalid score: {score_str}")
                return False
            
            print(f"  Score: {score}")
            
        except subprocess.TimeoutExpired:
            print("  Error: Evaluation timed out")
            return False
        except Exception as e:
            print(f"  Error running evaluation: {e}")
            return False
        
        # Get attempt number
        latest_attempt = self.get_latest_attempt_number(participant_id, assignment_id)
        attempt_number = latest_attempt + 1
        print(f"  Attempt number: {attempt_number}")
        
        # Create submission
        print("  Creating submission record...")
        if self.create_submission(participant_id, assignment_id, score, attempt_number):
            print("  ✓ Submission created successfully")
            return True
        else:
            print("  Error: Failed to create submission")
            return False


def main():
    print("=" * 50)
    print("  Remote Evaluation Worker")
    print("=" * 50)
    print(f"RabbitMQ: {RABBITMQ_HOST}:{RABBITMQ_PORT}")
    print(f"Queue: {RABBITMQ_QUEUE}")
    print(f"Backend: {BACKEND_URI}")
    print("=" * 50)
    
    if not API_TOKEN:
        print("Error: API_TOKEN is not set", file=sys.stderr)
        sys.exit(1)
    
    worker = EvaluationWorker()
    
    # RabbitMQ connection
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    parameters = pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        port=RABBITMQ_PORT,
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300
    )
    
    def callback(ch, method, properties, body):
        try:
            message = json.loads(body.decode('utf-8'))
            success = worker.process_job(message)
            
            # Acknowledge message
            ch.basic_ack(delivery_tag=method.delivery_tag)
            
            if success:
                print("[✓] Job completed successfully")
            else:
                print("[✗] Job failed")
                
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON message: {e}", file=sys.stderr)
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            print(f"Error processing job: {e}", file=sys.stderr)
            # Requeue on unexpected errors
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    while True:
        try:
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()
            
            # Declare queue
            channel.queue_declare(queue=RABBITMQ_QUEUE, durable=True)
            
            # Fair dispatch - process one message at a time
            channel.basic_qos(prefetch_count=1)
            
            # Set up consumer
            channel.basic_consume(
                queue=RABBITMQ_QUEUE,
                on_message_callback=callback,
                auto_ack=False
            )
            
            print(f"\n[*] Connected. Waiting for jobs...")
            channel.start_consuming()
            
        except pika.exceptions.AMQPConnectionError as e:
            print(f"[!] Connection lost: {e}. Reconnecting in 5s...", file=sys.stderr)
            time.sleep(5)
        except KeyboardInterrupt:
            print("\n[*] Shutting down...")
            break


if __name__ == '__main__':
    main()
