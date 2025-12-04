#!/bin/bash

# ===================================================================
#  Judging Server 
#  Runs as root, managed by systemd.
#  Fetches evaluation binaries from S3 via API and runs them against submissions.
# ===================================================================

# --- Configuration ---
export readonly SOCKET_PATH="/var/run/judging.sock"
export readonly ALLOWED_GROUP="jupyterhub-users"
export readonly ENV_FILE="/root/.env"
export readonly EVAL_CACHE_DIR="/tmp/nsm-eval-cache"
export readonly REMOTE_PRODUCER="/opt/nsm/remote/producer.sh"

# --- Cleanup Function ---
cleanup() {
    echo "Server shutting down."
    rm -f "$SOCKET_PATH"
}
trap cleanup EXIT

# --- Pre-flight Checks (Server-side) ---
if [[ "$EUID" -ne 0 ]]; then
    echo "Error: This server must be started as root." >&2
    exit 1
fi
if ! command -v socat &>/dev/null; then
    echo "Error: 'socat' is not installed. Please run 'sudo apt-get install socat' or 'sudo yum install socat'." >&2
    exit 1
fi
if ! command -v jq &>/dev/null; then
    echo "Error: 'jq' is not installed. Please run 'sudo apt-get install jq' or 'sudo yum install jq'." >&2
    exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: Environment file not found at '$ENV_FILE'" >&2
    exit 1
fi

# Create eval cache directory if it doesn't exist
mkdir -p "$EVAL_CACHE_DIR"
chmod 700 "$EVAL_CACHE_DIR"

# --- Convert directory username to email ---
# abc_at_xyz_com -> abc@xyz.com
# Replace _at_ with @, then remaining underscores with .
username_to_email() {
    local username="$1"
    # Replace _at_ with @, then all remaining underscores with .
    echo "$username" | sed 's/_at_/@/' | sed 's/_/./g'
}

# --- Fetch user ID by email from API ---
fetch_user_id_by_email() {
    local email="$1"
    
    # URL encode the email for query parameter
    local encoded_email=$(echo "$email" | sed 's/@/%40/g')
    
    # Query users list with pagination - search through results
    local response=$(curl -s -X GET \
        -H "Authorization: Bearer $API_TOKEN" \
        "${BACKEND_URI}/api/v1/users?limit=100")
    
    # Extract user ID where email matches
    local user_id=$(echo "$response" | jq -r --arg email "$email" '.data[] | select(.email == $email) | .id')
    
    if [ -z "$user_id" ] || [ "$user_id" == "null" ]; then
        echo ""
        return 1
    fi
    
    echo "$user_id"
    return 0
}

# --- Fetch assignment details from API ---
fetch_assignment_details() {
    local workshop_id="$1"
    local assignment_id="$2"
    
    local response=$(curl -s -X GET \
        -H "Authorization: Bearer $API_TOKEN" \
        "${BACKEND_URI}/api/v1/workshops/${workshop_id}/assignments/${assignment_id}")
    
    echo "$response"
}

# --- Get presigned download URL from API ---
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

# --- Get latest attempt number for participant's assignment submissions ---
get_latest_attempt_number() {
    local participant_id="$1"
    local assignment_id="$2"
    
    # Use submissions endpoint with filters for participant and assignment
    local response=$(curl -s -X GET \
        -H "Authorization: Bearer $API_TOKEN" \
        "${BACKEND_URI}/api/v1/submissions?participantId=${participant_id}&assignmentId=${assignment_id}&limit=100")
    
    # Response is paginated: { data: [...], pagination: {...} }
    # Get max attempt number from submissions
    local max_attempt=$(echo "$response" | jq -r '[.data[].attemptNumber] | max // 0')
    
    if [ -z "$max_attempt" ] || [ "$max_attempt" == "null" ]; then
        echo "0"
        return 0
    fi
    
    echo "$max_attempt"
    return 0
}

# --- Download evaluation binary using presigned URL ---
download_eval_binary() {
    local assignment_id="$1"
    local s3_key="$2"
    local output_path="$EVAL_CACHE_DIR/eval_${assignment_id}"
    
    # Check if binary already cached (skip cache for now to always get fresh)
    # Uncomment below to enable caching:
    # if [ -f "$output_path" ] && [ -x "$output_path" ]; then
    #     echo "$output_path"
    #     return 0
    # fi
    
    # Get presigned download URL from API
    echo "Getting presigned download URL for: $s3_key" >&2
    local download_url=$(get_presigned_download_url "$s3_key")
    
    if [ -z "$download_url" ]; then
        echo "Error: Failed to get presigned download URL" >&2
        return 1
    fi
    
    # Download using the presigned URL
    echo "Downloading evaluation binary..." >&2
    if ! curl -s -o "$output_path" "$download_url"; then
        echo "Error: Failed to download evaluation binary" >&2
        return 1
    fi
    
    # Convert any Windows line endings (CRLF) to Unix (LF)
    # This fixes "cannot execute binary file" errors for scripts uploaded from Windows
    if file "$output_path" | grep -q "text"; then
        echo "Detected text file, converting line endings..." >&2
        sed -i 's/\r$//' "$output_path"
    fi
    
    # Make it executable
    chmod +x "$output_path"
    echo "$output_path"
    return 0
}

# --- Main Handler Function ---
handle_request() {
    read -r REQUEST_DATA
    echo "Received request: $REQUEST_DATA"
    
    # Parse assignment ID and filepath from request format: ASSIGNMENT_ID|FILEPATH
    ASSIGNMENT_ID="${REQUEST_DATA%%|*}"
    FILEPATH="${REQUEST_DATA##*|}"
    
    # Validate input
    if [ -z "$ASSIGNMENT_ID" ] || [ -z "$FILEPATH" ]; then
        echo "Error: Invalid request format. Expected: ASSIGNMENT_ID|FILEPATH"
        return
    fi
    
    if ! [[ "$ASSIGNMENT_ID" =~ ^[0-9]+$ ]]; then
        echo "Error: Invalid assignment ID format"
        return
    fi
    
    echo "Processing assignment ID: $ASSIGNMENT_ID"
    echo "File path: $FILEPATH"
    
    # Validate filepath format - expects /home/{username}/...
    if ! [[ "$FILEPATH" =~ ^/home/[^/]+/.+ ]]; then
        echo "Error: Invalid filepath. Submissions must be from a '/home/*' directory."
        return
    fi
    
    if [ ! -f "$FILEPATH" ]; then
        echo "Error: File '$FILEPATH' does not exist on the server."
        return
    fi
    
    # Extract username from filepath: /home/{username}/...
    DIR_USERNAME=$(echo "$FILEPATH" | sed -n 's|^/home/\([^/]*\)/.*|\1|p')
    if [ -z "$DIR_USERNAME" ]; then
        echo "Error: Could not extract username from filepath."
        return
    fi
    echo "Extracted directory username: $DIR_USERNAME"
    
    # Convert directory username to email
    USER_EMAIL=$(username_to_email "$DIR_USERNAME")
    echo "Converted to email: $USER_EMAIL"
    
    # Fetch user ID from API using email
    echo "Fetching user ID from API..."
    PARTICIPANT_ID=$(fetch_user_id_by_email "$USER_EMAIL")
    if [ -z "$PARTICIPANT_ID" ]; then
        echo "Error: Could not find user with email: $USER_EMAIL"
        return
    fi
    echo "Found participant ID: $PARTICIPANT_ID"
    
    # Fetch assignment details from API
    echo "Fetching assignment details from API..."
    ASSIGNMENT_RESPONSE=$(fetch_assignment_details "$WORKSHOP_ID" "$ASSIGNMENT_ID")
    
    # Parse assignment details
    ASSIGNMENT_NAME=$(echo "$ASSIGNMENT_RESPONSE" | jq -r '.name')
    S3_EVAL_BINARY_KEY=$(echo "$ASSIGNMENT_RESPONSE" | jq -r '.s3EvalBinaryKey')
    EVALUATION_TYPE=$(echo "$ASSIGNMENT_RESPONSE" | jq -r '.evaluationType // "LOCAL"')
    
    if [ -z "$ASSIGNMENT_NAME" ] || [ "$ASSIGNMENT_NAME" == "null" ]; then
        echo "Error: Assignment ID $ASSIGNMENT_ID not found in workshop $WORKSHOP_ID"
        echo "API Response: $ASSIGNMENT_RESPONSE"
        return
    fi
    
    echo "Processing assignment: $ASSIGNMENT_NAME (ID: $ASSIGNMENT_ID)"
    echo "Evaluation type: $EVALUATION_TYPE"
    
    if [ -z "$S3_EVAL_BINARY_KEY" ] || [ "$S3_EVAL_BINARY_KEY" == "null" ]; then
        echo "Error: S3 evaluation binary key not configured for assignment $ASSIGNMENT_ID"
        return
    fi
    
    echo "S3 eval binary key: $S3_EVAL_BINARY_KEY"
    
    # ============================================================
    # REMOTE Evaluation - Queue job for serial processing
    # ============================================================
    if [ "$EVALUATION_TYPE" == "REMOTE" ]; then
        echo "Routing to REMOTE evaluation queue..."
        
        if [ ! -x "$REMOTE_PRODUCER" ]; then
            echo "Error: Remote producer not found or not executable at $REMOTE_PRODUCER"
            return
        fi
        
        # Get current attempt count before queuing
        CURRENT_ATTEMPTS=$(get_latest_attempt_number "$PARTICIPANT_ID" "$ASSIGNMENT_ID")
        
        # Call producer to queue the job
        QUEUE_RESULT=$("$REMOTE_PRODUCER" \
            "$WORKSHOP_ID" \
            "$ASSIGNMENT_ID" \
            "$PARTICIPANT_ID" \
            "$USER_EMAIL" \
            "$FILEPATH" \
            "$S3_EVAL_BINARY_KEY" 2>&1)
        QUEUE_EXIT=$?
        
        if [ $QUEUE_EXIT -eq 0 ]; then
            # Return structured response for client to poll
            echo "Queued"
            echo "POLL_INFO:${PARTICIPANT_ID}:${ASSIGNMENT_ID}:${CURRENT_ATTEMPTS}"
        else
            echo "Error: Failed to queue evaluation job"
            echo "$QUEUE_RESULT"
        fi
        return
    fi
    
    # ============================================================
    # LOCAL Evaluation - Process immediately
    # ============================================================
    
    # Download evaluation binary using presigned URL from API
    EVAL_BINARY=$(download_eval_binary "$ASSIGNMENT_ID" "$S3_EVAL_BINARY_KEY")
    if [ $? -ne 0 ] || [ -z "$EVAL_BINARY" ]; then
        echo "Error: Failed to download evaluation binary for assignment $ASSIGNMENT_ID"
        return
    fi
    
    echo "Running evaluation binary: $EVAL_BINARY"
    
    # Execute the evaluation binary with the user's file
    SCORE=$("$EVAL_BINARY" "$FILEPATH" 2>&1)
    EVAL_EXIT_CODE=$?
    
    if [ $EVAL_EXIT_CODE -ne 0 ]; then
        echo "Error: Evaluation binary failed to execute (exit code: $EVAL_EXIT_CODE)."
        echo "Output: $SCORE"
        return
    fi
    
    # Extract just the score (last line, in case there's other output)
    SCORE=$(echo "$SCORE" | tail -n 1)
    
    # Validate score is numeric
    if ! [[ "$SCORE" =~ ^[+-]?[0-9]+\.?[0-9]*$ ]]; then
        echo "Error: Invalid score returned by evaluator: '$SCORE'"
        return
    fi
    
    echo "Score received from evaluator: $SCORE"
    
    # Get the latest attempt number for this participant's assignment
    echo "Fetching previous submissions to determine attempt number..."
    LATEST_ATTEMPT=$(get_latest_attempt_number "$PARTICIPANT_ID" "$ASSIGNMENT_ID")
    ATTEMPT_NUMBER=$((LATEST_ATTEMPT + 1))
    echo "This is attempt number: $ATTEMPT_NUMBER"
    
    # Create submission record via API
    echo "Creating submission record via API..."
    HTTP_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $API_TOKEN" \
        -d "{\"participantId\": $PARTICIPANT_ID, \"assignmentId\": $ASSIGNMENT_ID, \"score\": $SCORE, \"attemptNumber\": $ATTEMPT_NUMBER}" \
        "$BACKEND_URI/api/v1/submissions")
    
    HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
    HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$HTTP_STATUS" -eq 201 ] || [ "$HTTP_STATUS" -eq 200 ]; then
        echo "Successfully created submission record (HTTP $HTTP_STATUS)"
        echo "Score: $SCORE"
    else
        echo "Error: Failed to create submission record (HTTP $HTTP_STATUS)"
        echo "Response: $HTTP_BODY"
    fi
}

# --- SCRIPT START ---

echo "Loading environment from $ENV_FILE..."
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Validate required environment variables
if [ -z "$BACKEND_URI" ] || [ -z "$API_TOKEN" ] || [ -z "$WORKSHOP_ID" ]; then
    echo "CRITICAL ERROR: Missing required variables from $ENV_FILE (BACKEND_URI, API_TOKEN, WORKSHOP_ID). Shutting down." >&2
    exit 1
fi

echo "Environment loaded successfully."
echo "Backend URI: $BACKEND_URI"
echo "Workshop ID: $WORKSHOP_ID"

export -f handle_request
export -f download_eval_binary
export -f get_presigned_download_url
export -f get_latest_attempt_number
export -f fetch_assignment_details
export -f fetch_user_id_by_email
export -f username_to_email

rm -f "$SOCKET_PATH"
echo "Starting judging server with socat..."

# Create socket with permissions allowing group read/write
# perm=0666 allows all users to read/write to the socket
socat "UNIX-LISTEN:$SOCKET_PATH,fork,perm=0666" "EXEC:bash -c handle_request"
