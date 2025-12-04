# Remote Evaluation System

This system provides serial, fair evaluation for competitive/timed assignments using RabbitMQ as a message queue.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  JupyterHub     │     │    RabbitMQ     │     │  Remote Worker  │
│  (judge_server) │────▶│   (Queue)       │────▶│  (worker.py)    │
│                 │     │                 │     │                 │
│  REMOTE type    │     │  evaluation_    │     │  Serial         │
│  assignments    │     │  queue          │     │  Processing     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

1. **Judge Server** (`/services/evaluate/judge_server.sh`) - Receives evaluation requests from participants
2. **Producer** (`producer.sh`) - Publishes REMOTE evaluation jobs to RabbitMQ
3. **RabbitMQ** - Message queue ensuring serial, fair processing (FIFO)
4. **Worker** (`worker.py`) - Consumes and processes jobs one at a time

## Setup

### 1. Start RabbitMQ

```bash
cd /home/aditya/Projects/nsm/remote
docker-compose up -d
```

RabbitMQ Management UI: http://localhost:15672 (nsm/nsm_password)

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration:
# - BACKEND_URI: Your backend API URL
# - API_TOKEN: JWT token for API authentication
```

### 3. Install Python Dependencies (on remote worker machine)

```bash
pip install -r requirements.txt
```

### 4. Deploy Producer Script

The producer script needs to be available on the JupyterHub server:

```bash
sudo mkdir -p /opt/nsm/remote
sudo cp producer.sh /opt/nsm/remote/
sudo cp .env /opt/nsm/remote/
sudo chmod +x /opt/nsm/remote/producer.sh
```

### 5. Start the Worker

```bash
./worker.py
```

Or as a systemd service:

```bash
sudo cp remote-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable remote-worker
sudo systemctl start remote-worker
```

## Usage

When an assignment is created with `evaluationType: REMOTE`:

1. Participant submits: `evaluate <assignment_id> <filepath>`
2. Judge server checks evaluationType
3. If REMOTE → Job queued via producer.sh → User gets "Queued" message
4. Worker processes job serially → Creates submission record
5. Participant can check results later

## Files

| File | Description |
|------|-------------|
| `docker-compose.yml` | RabbitMQ with management UI |
| `.env.example` | Configuration template |
| `producer.sh` | Publishes jobs to RabbitMQ |
| `worker.py` | Python worker for serial processing |
| `worker.sh` | Bash worker alternative |
| `requirements.txt` | Python dependencies |

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RABBITMQ_HOST` | RabbitMQ host | localhost |
| `RABBITMQ_PORT` | RabbitMQ AMQP port | 5672 |
| `RABBITMQ_USER` | RabbitMQ username | nsm |
| `RABBITMQ_PASS` | RabbitMQ password | nsm_password |
| `RABBITMQ_QUEUE` | Queue name | evaluation_queue |
| `BACKEND_URI` | Backend API URL | http://localhost:3000 |
| `API_TOKEN` | JWT token for API | (required) |

## Monitoring

### Check Queue Status

```bash
# Via Management UI
http://localhost:15672

# Via CLI
docker exec nsm-rabbitmq rabbitmqctl list_queues
```

### View Worker Logs

```bash
sudo journalctl -u remote-worker -f
```

## Troubleshooting

### Worker can't connect to RabbitMQ

```bash
# Check if RabbitMQ is running
docker ps | grep rabbitmq

# Check logs
docker logs nsm-rabbitmq
```

### Jobs not being processed

```bash
# Check queue has consumers
docker exec nsm-rabbitmq rabbitmqctl list_consumers

# Check worker is running
systemctl status remote-worker
```

### Permission errors

Ensure the worker has:
- Read access to submission files (if on same machine)
- Network access to RabbitMQ and Backend API
- Write access to evaluation cache directory
