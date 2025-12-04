#!/bin/bash

# Script to load workshop: create users, update env, and download home zip
# This script must be run as root
# Usage: ./load-workshop.sh <json_config_file>
# The JSON config file should contain:
#   - users: array of user emails
#   - workshopId: the workshop ID
#   - homeZipUrl: presigned URL to download the home zip (optional)

# Don't use set -e as arithmetic operations can return non-zero

ENV_FILE="/root/.env"
HOME_ZIP_PATH="/usr/local/share/jupyterhub_home.zip"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Error: This script must be run as root" >&2
    exit 1
fi

# Check if JSON file argument is provided
if [ -z "$1" ]; then
    echo "Error: Please provide a JSON config file" >&2
    echo "Usage: $0 <json_config_file>" >&2
    exit 1
fi

JSON_FILE="$1"

# Check if file exists
if [ ! -f "$JSON_FILE" ]; then
    echo "Error: File '$JSON_FILE' not found" >&2
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed" >&2
    exit 1
fi

# Read config from JSON file
WORKSHOP_ID=$(jq -r '.workshopId' "$JSON_FILE" 2>/dev/null)
HOME_ZIP_URL=$(jq -r '.homeZipUrl // empty' "$JSON_FILE" 2>/dev/null)
USERS=$(jq -r '.users[]' "$JSON_FILE" 2>/dev/null)

echo "=========================================="
echo "Loading Workshop: $WORKSHOP_ID"
echo "=========================================="

# ==================== STEP 1: Update ENV file ====================
echo ""
echo "Step 1: Updating environment file..."

if [ -f "$ENV_FILE" ]; then
    # Update WORKSHOP_ID if it exists, otherwise append it
    if grep -q "^WORKSHOP_ID=" "$ENV_FILE"; then
        sed -i "s/^WORKSHOP_ID=.*/WORKSHOP_ID=$WORKSHOP_ID/" "$ENV_FILE"
        echo "  Updated WORKSHOP_ID to $WORKSHOP_ID in $ENV_FILE"
    else
        echo "WORKSHOP_ID=$WORKSHOP_ID" >> "$ENV_FILE"
        echo "  Added WORKSHOP_ID=$WORKSHOP_ID to $ENV_FILE"
    fi
else
    echo "  Warning: $ENV_FILE does not exist, creating it..."
    echo "WORKSHOP_ID=$WORKSHOP_ID" > "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    echo "  Created $ENV_FILE with WORKSHOP_ID=$WORKSHOP_ID"
fi

# ==================== STEP 2: Download Home Zip ====================
echo ""
echo "Step 2: Downloading workshop home zip..."

if [ -n "$HOME_ZIP_URL" ]; then
    # Create directory if it doesn't exist
    mkdir -p "$(dirname "$HOME_ZIP_PATH")"
    
    # Download the file using curl
    if curl -fsSL -o "$HOME_ZIP_PATH" "$HOME_ZIP_URL"; then
        # Set permissions: readable by all, writable only by root
        chmod 644 "$HOME_ZIP_PATH"
        chown root:root "$HOME_ZIP_PATH"
        echo "  Successfully downloaded home zip to $HOME_ZIP_PATH"
        echo "  File size: $(du -h "$HOME_ZIP_PATH" | cut -f1)"
    else
        echo "  Warning: Failed to download home zip from S3" >&2
    fi
else
    echo "  No home zip URL provided, skipping download"
fi

# ==================== STEP 3: Create/Update Users ====================
echo ""
echo "Step 3: Creating/updating local users..."

# Ensure jupyterhub_users group exists
if ! getent group jupyterhub_users > /dev/null 2>&1; then
    echo "  Creating group 'jupyterhub_users'..."
    groupadd jupyterhub_users
fi

if [ -z "$USERS" ]; then
    echo "  No users found in the config file"
else
    SUCCESS_COUNT=0
    FAIL_COUNT=0

    # Process each user email
    while IFS= read -r email; do
        # Skip empty lines
        [ -z "$email" ] && continue
        
        # Convert email to username (replace @ and . with _)
        username=$(echo "$email" | sed 's/@/_at_/g' | sed 's/\./_/g' | tr '[:upper:]' '[:lower:]')
        
        # Truncate username if too long (Linux usernames max 32 chars)
        username=$(echo "$username" | cut -c1-32)
        
        echo "  Processing user: $email -> $username"
        
        # Check if user exists
        if id "$username" &>/dev/null; then
            echo "    User already exists"
            
            # Check if user is in jupyterhub_users group
            if groups "$username" | grep -q '\bjupyterhub_users\b'; then
                echo "    Already in group 'jupyterhub_users'"
            else
                echo "    Adding to group 'jupyterhub_users'"
                if usermod -aG jupyterhub_users "$username"; then
                    echo "    Successfully added to group"
                else
                    echo "    Failed to add to group" >&2
                    ((FAIL_COUNT++)) || true
                    continue
                fi
            fi
        else
            echo "    Creating user..."
            
            # Create user with home directory, no password (login via JupyterHub)
            if useradd -m -s /bin/bash -G jupyterhub_users "$username"; then
                echo "    Successfully created user"
                
                # Set a random password (user won't use it, authenticates via JupyterHub)
                RANDOM_PASS=$(openssl rand -base64 32)
                echo "$username:$RANDOM_PASS" | chpasswd
                
                # Create .jupyter directory if needed
                JUPYTER_DIR="/home/$username/.jupyter"
                mkdir -p "$JUPYTER_DIR"
                chown "$username:$username" "$JUPYTER_DIR"
                chmod 700 "$JUPYTER_DIR"
            else
                echo "    Failed to create user" >&2
                ((FAIL_COUNT++)) || true
                continue
            fi
        fi
        
        ((SUCCESS_COUNT++)) || true
        
    done <<< "$USERS"

    echo ""
    echo "  User Summary:"
    echo "    Processed: $SUCCESS_COUNT users successfully"
    echo "    Failed: $FAIL_COUNT users"
fi

# Clean up JSON file
rm -f "$JSON_FILE"

echo ""
echo "=========================================="
echo "Workshop load complete!"
echo "=========================================="

exit 0
