#!/bin/bash

# ===================================================================
#  Workshop Setup Server - Runs as root
#  Listens on a UNIX socket for requests from non-root clients.
# ===================================================================

# --- Configuration ---
readonly SOCKET_PATH="/var/run/workshop_setup.sock"
readonly ALLOWED_GROUP="jupyterhub-users"
readonly ENV_FILE="/root/.env"

# --- Cleanup Function ---
# Ensures the socket is removed when the script exits
cleanup() {
    echo "Server shutting down. Removing socket."
    rm -f "$SOCKET_PATH"
}
trap cleanup EXIT

# --- Pre-flight Checks (Server-side) ---
if [[ "$EUID" -ne 0 ]]; then
    echo "Error: This server must be started as root." >&2
    exit 1
fi
if ! command -v unzip &>/dev/null; then
    echo "Error: 'unzip' command is not installed on the server." >&2
    exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: Environment file not found at '$ENV_FILE'" >&2
    exit 1
fi

# Load environment variables
set -a
source "$ENV_FILE"
set +a

# Validate assignment files exist
if [ -z "$TOTAL_ASSIGNMENTS" ] || [ "$TOTAL_ASSIGNMENTS" -eq 0 ]; then
    echo "Error: No assignments configured" >&2
    exit 1
fi

echo "Checking for ${TOTAL_ASSIGNMENTS} assignment files..."
for i in $(seq 1 $TOTAL_ASSIGNMENTS); do
    ASSIGNMENT_ID_VAR="ASSIGNMENT_${i}_ID"
    ASSIGNMENT_ID=${!ASSIGNMENT_ID_VAR}
    
    if [ -n "$ASSIGNMENT_ID" ]; then
        ASSIGNMENT_FILE="/root/assignment_${ASSIGNMENT_ID}_home.zip"
        if [[ ! -r "$ASSIGNMENT_FILE" ]]; then
            echo "Warning: Assignment file not found: $ASSIGNMENT_FILE" >&2
        fi
    fi
done

# --- Main Server Logic in a Function ---
handle_request() {
    # 1. Read the username sent by the client
    read -r CALLING_USER
    if [[ -z "$CALLING_USER" ]]; then
        echo "Error: Received an empty request." >&2
        return
    fi
    
    echo "--- Received request for user: $CALLING_USER ---"

    # 2. Get user's home directory and Group ID
    local USER_HOME=$(getent passwd "$CALLING_USER" | cut -d: -f6)
    local USER_GID=$(id -g "$CALLING_USER")

    if [[ -z "$USER_HOME" ]] || [[ -z "$USER_GID" ]]; then
        echo "Error: Could not find user '$CALLING_USER' on this system." >&2
        return
    fi

    local DEST_DIR="$USER_HOME/workshop"
    echo "Target directory: $DEST_DIR"

    # 3. Handle existing directory backup
    if [[ -e "$DEST_DIR" ]]; then
        echo "'$DEST_DIR' already exists. Backing it up."
        local i=1
        while [[ -e "${DEST_DIR}.old.${i}" ]]; do ((i++)); done
        local BACKUP_NAME="${DEST_DIR}.old.${i}"
        
        echo "Renaming existing directory to '$BACKUP_NAME'"
        if ! mv "$DEST_DIR" "$BACKUP_NAME"; then
            echo "Error: Failed to rename the existing directory." >&2
            return
        fi
    fi

    # 4. Create directory and extract all assignments
    echo "Creating new workshop directory..."
    if ! mkdir "$DEST_DIR"; then
        echo "Error: Failed to create new directory at '$DEST_DIR'." >&2
        return
    fi

    # Extract all assignment files into organized subdirectories
    echo "Extracting all ${TOTAL_ASSIGNMENTS} assignment files..."
    local EXTRACTION_SUCCESS=true
    local EXTRACTED_COUNT=0

    for i in $(seq 1 $TOTAL_ASSIGNMENTS); do
        local ASSIGNMENT_ID_VAR="ASSIGNMENT_${i}_ID"
        local ASSIGNMENT_ID=${!ASSIGNMENT_ID_VAR}
        
        if [ -n "$ASSIGNMENT_ID" ]; then
            local ASSIGNMENT_FILE="/root/assignment_${ASSIGNMENT_ID}_home.zip"
            if [[ -r "$ASSIGNMENT_FILE" ]]; then
                # Create assignment-specific subdirectory
                local assignment_dir="$DEST_DIR/assignment_$ASSIGNMENT_ID"
                echo "Creating directory: $assignment_dir"
                
                if ! mkdir -p "$assignment_dir"; then
                    echo "Error: Failed to create assignment directory: $assignment_dir" >&2
                    EXTRACTION_SUCCESS=false
                    break
                fi
                
                # Extract assignment files
                echo "Extracting: $ASSIGNMENT_FILE -> $assignment_dir"
                if ! unzip -q "$ASSIGNMENT_FILE" -d "$assignment_dir"; then
                    echo "Error: Failed to extract $ASSIGNMENT_FILE" >&2
                    EXTRACTION_SUCCESS=false
                    break
                fi
                
                ((EXTRACTED_COUNT++))
            else
                echo "Warning: Assignment file not found: $ASSIGNMENT_FILE" >&2
            fi
        fi
    done

    # Check if all extractions were successful
    if [ "$EXTRACTION_SUCCESS" != true ]; then
        echo "Error: Failed to extract some assignment files. Cleaning up..." >&2
        rm -rf "$DEST_DIR"
        return
    fi

    # 5. Set correct ownership (CRITICAL STEP)
    echo "Setting correct ownership for all workshop files..."
    if ! chown -R "$CALLING_USER:$USER_GID" "$DEST_DIR"; then
        echo "Warning: Could not set final ownership." >&2
    fi

    echo "Workshop setup complete for $CALLING_USER!"
    echo "Extracted $EXTRACTED_COUNT assignments into: $DEST_DIR"
}

# --- Server Start ---
# Remove old socket if it exists
rm -f "$SOCKET_PATH"

# Listen forever, handling one request at a time
echo "Starting workshop setup server..."
while true; do
    # Create a listening socket with nc and send it to the background
    nc -lU "$SOCKET_PATH" > >(handle_request) &
    NC_PID=$!

    # Crucially, wait a moment for the socket file to be created by nc
    sleep 0.1

    # SET PERMISSIONS IMMEDIATELY after the socket is created
    if [ -S "$SOCKET_PATH" ]; then
        echo "Socket created, setting permissions..."
        chgrp "$ALLOWED_GROUP" "$SOCKET_PATH"
        chmod 660 "$SOCKET_PATH"
    else
        echo "Error: netcat failed to create the socket file." >&2
    fi

    # Wait for the current netcat process to finish before looping
    wait $NC_PID
    echo "Connection handled. Listening for next connection on $SOCKET_PATH..."
done
