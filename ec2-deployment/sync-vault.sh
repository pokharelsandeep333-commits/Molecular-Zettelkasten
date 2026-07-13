#!/bin/bash

# Configuration
VAULT_DIR="/path/to/your/LLM-Wiki" # Update this to the actual absolute path on your EC2 instance

# Ensure we're in the right directory
cd "$VAULT_DIR" || exit

# Fetch the latest changes from the remote
git fetch origin main

# Check if there are updates
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u})

if [ $LOCAL = $REMOTE ]; then
    echo "$(date): Vault is up-to-date."
else
    echo "$(date): Updates found. Pulling latest notes..."
    # Pull the changes
    git pull origin main
    
    # Optional: If your Next.js app needs to clear cache or do something on vault update,
    # you can trigger it here, but generally Next.js server-side reads the file directly.
fi
