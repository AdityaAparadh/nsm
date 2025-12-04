#!/bin/bash

# Script to create/update local users for workshop participants
# This script must be run as root
# Usage: ./load-workshop-users.sh <json_file_with_users>
# The JSON file should contain an array of user emails

# Don't use set -e as arithmetic operations can return non-zero

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Error: This script must be run as root" >&2
    exit 1
fi

# Check if JSON file argument is provided
if [ -z "$1" ]; then
    echo "Error: Please provide a JSON file with user emails" >&2
    echo "Usage: $0 <json_file_with_users>" >&2
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

# Ensure jupyterhub_users group exists
if ! getent group jupyterhub_users > /dev/null 2>&1; then
    echo "Creating group 'jupyterhub_users'..."
    groupadd jupyterhub_users
fi

# Read users from JSON file
USERS=$(jq -r '.[]' "$JSON_FILE" 2>/dev/null)

if [ -z "$USERS" ]; then
    echo "No users found in the JSON file" >&2
    exit 1
fi

SUCCESS_COUNT=0
FAIL_COUNT=0

# Process each user email
while IFS= read -r email; do
    # Skip empty lines
    [ -z "$email" ] && continue
    
    # Convert email to username (replace @ and . with _)
    # This creates a valid Linux username from the email
    username=$(echo "$email" | sed 's/@/_at_/g' | sed 's/\./_/g' | tr '[:upper:]' '[:lower:]')
    
    # Truncate username if too long (Linux usernames max 32 chars)
    username=$(echo "$username" | cut -c1-32)
    
    echo "Processing user: $email -> $username"
    
    # Check if user exists
    if id "$username" &>/dev/null; then
        echo "  User '$username' already exists"
        
        # Check if user is in jupyterhub_users group
        if groups "$username" | grep -q '\bjupyterhub_users\b'; then
            echo "  User '$username' is already in group 'jupyterhub_users'"
        else
            echo "  Adding user '$username' to group 'jupyterhub_users'"
            if usermod -aG jupyterhub_users "$username"; then
                echo "  Successfully added to group"
            else
                echo "  Failed to add to group" >&2
                ((FAIL_COUNT++)) || true
                continue
            fi
        fi
    else
        echo "  Creating user '$username'"
        
        # Create user with home directory, no password (login via JupyterHub)
        if useradd -m -s /bin/bash -G jupyterhub_users "$username"; then
            echo "  Successfully created user '$username'"
            
            # Set a random password (user won't use it, authenticates via JupyterHub)
            # This is for security - prevents empty password login
            RANDOM_PASS=$(openssl rand -base64 32)
            echo "$username:$RANDOM_PASS" | chpasswd
            
            # Create .jupyterhub directory if needed
            JUPYTER_DIR="/home/$username/.jupyter"
            mkdir -p "$JUPYTER_DIR"
            chown "$username:$username" "$JUPYTER_DIR"
            chmod 700 "$JUPYTER_DIR"
        else
            echo "  Failed to create user '$username'" >&2
            ((FAIL_COUNT++)) || true
            continue
        fi
    fi
    
    ((SUCCESS_COUNT++)) || true
    
done <<< "$USERS"

echo ""
echo "Summary:"
echo "  Processed: $SUCCESS_COUNT users successfully"
echo "  Failed: $FAIL_COUNT users"

# Clean up JSON file
rm -f "$JSON_FILE"

exit 0
