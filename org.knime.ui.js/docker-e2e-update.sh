#!/usr/bin/env bash

# Get the absolute directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Path to the bitbucket-pipelines.yml file in the parent directory
YML_FILE="$SCRIPT_DIR/../bitbucket-pipelines.yml"

# Ensure the file exists
if [[ ! -f "$YML_FILE" ]]; then
  echo "Error: $YML_FILE not found"
  exit 1
fi

# Extract the Playwright image
IMAGE=$(grep 'image:' "$YML_FILE" | grep -oE 'mcr\.microsoft\.com/playwright:[^ ]+')

# Check if image was found
if [[ -z "$IMAGE" ]]; then
  echo "Playwright image not found in $YML_FILE"
  exit 1
fi

echo "Using image: $IMAGE"

if [[ -d node_modules ]]; then
  echo "Found node_modules folder backing up to .node_modules_backup ..."
  rm -rf .node_modules_backup
  mv node_modules .node_modules_backup
fi

# Run Docker with piped commands
docker run -it --rm \
  -v "$(pwd)":/usr/src/project \
  --ipc=host \
  "$IMAGE" bash -c '
    cd /usr/src/project/
    echo "Installing Corepack and enabling it..."
    npm install -g corepack
    echo "Enabling Corepack non-interactively..."
    export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 
    corepack enable
    echo "Installing project dependencies with pnpm..."
    pnpm install --frozen-lockfile
    echo "Running E2E update tests..."
    pnpm run test:e2e:update
  '

# Cleanup and restore node_modules
echo "Cleaning up container-installed node_modules..."
rm -rf node_modules .pnpm-store

if [[ -d .node_modules_backup ]]; then
  echo "Restoring original node_modules..."
  mv .node_modules_backup node_modules
fi

echo "Done."

