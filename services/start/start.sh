#!/bin/bash

# User-side script to initialize/reset their home directory with workshop content
# Usage: ./start.sh

set -e

HOME_ZIP="/usr/local/share/jupyterhub_home.zip"
USER_HOME="$HOME"

# Check if home zip exists
if [ ! -f "$HOME_ZIP" ]; then
    echo "Error: Workshop not loaded. Please contact your instructor." >&2
    exit 1
fi

# Check if unzip is available
if ! command -v unzip &> /dev/null; then
    echo "Error: unzip is required but not installed" >&2
    exit 1
fi

echo "Refreshing workshop environment..."

# Find the next available prev directory number
find_next_prev_dir() {
    local base_name="prev"
    local counter=1
    local target_dir="$USER_HOME/$base_name"
    
    if [ ! -e "$target_dir" ]; then
        echo "$target_dir"
        return
    fi
    
    counter=2
    while true; do
        target_dir="$USER_HOME/${base_name}${counter}"
        if [ ! -e "$target_dir" ]; then
            echo "$target_dir"
            return
        fi
        ((counter++))
        
        if [ $counter -gt 100 ]; then
            echo ""
            return
        fi
    done
}

PREV_DIR=$(find_next_prev_dir)

if [ -z "$PREV_DIR" ]; then
    echo "Error: Too many backup directories. Please clean up." >&2
    exit 1
fi

PREV_DIR_NAME=$(basename "$PREV_DIR")

# Create the prev directory
mkdir -p "$PREV_DIR"

# Move all files and directories except prev directories
for item in "$USER_HOME"/*; do
    [ ! -e "$item" ] && continue
    
    item_name=$(basename "$item")
    
    # Skip prev directories (prev, prev2, prev3, etc.)
    if [[ "$item_name" =~ ^prev[0-9]*$ ]]; then
        continue
    fi
    
    mv "$item" "$PREV_DIR/" 2>/dev/null || true
done

# Unzip the workshop home content
if unzip -q -o "$HOME_ZIP" -d "$USER_HOME"; then
    echo ""
    echo "✓ Home directory refreshed"
    echo "✓ Previous progress saved to ~/$PREV_DIR_NAME"
else
    echo "Error: Failed to extract workshop content" >&2
    echo "Your previous files are in ~/$PREV_DIR_NAME" >&2
    exit 1
fi
