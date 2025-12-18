#!/bin/bash
# MongoDB Partner Solutions Library - Setup Script
# This script prepares the environment and seeds data for all solutions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "MongoDB Partner Solutions Library Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Step 1: Setup environment file
echo ""
echo "Step 1: Setting up environment file..."
if [ ! -f "$ROOT_DIR/.env" ]; then
    if [ -f "$ROOT_DIR/.env.example" ]; then
        cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
        print_status "Created .env from .env.example"
    else
        print_error ".env.example not found!"
        exit 1
    fi
else
    print_status ".env already exists"
fi

# Step 2: Ensure required environment variables exist
echo ""
echo "Step 2: Checking required environment variables..."

# Add MONGO_URI if not present (alias for MONGODB_URI, needed by Cohere)
if ! grep -q "^MONGO_URI=" "$ROOT_DIR/.env"; then
    MONGODB_URI=$(grep "^MONGODB_URI=" "$ROOT_DIR/.env" | cut -d'=' -f2-)
    echo "MONGO_URI=$MONGODB_URI" >> "$ROOT_DIR/.env"
    print_status "Added MONGO_URI environment variable"
else
    print_status "MONGO_URI already set"
fi

# Add MONGODB_DB if not present (needed by LangChain)
if ! grep -q "^MONGODB_DB=" "$ROOT_DIR/.env"; then
    echo "MONGODB_DB=langchain_research_agent" >> "$ROOT_DIR/.env"
    print_status "Added MONGODB_DB environment variable"
else
    print_status "MONGODB_DB already set"
fi

# Step 3: Build and start containers
echo ""
echo "Step 3: Building and starting Docker containers..."
cd "$ROOT_DIR"
docker compose -f docker/docker-compose.yml --env-file "$ROOT_DIR/.env" up -d --build

print_status "All containers started"

# Step 4: Wait for services to be ready
echo ""
echo "Step 4: Waiting for services to initialize (30 seconds)..."
sleep 30

# Step 5: Setup vector indexes and seed data
echo ""
echo "Step 5: Setting up vector indexes and seeding data..."

# Install Python dependencies for setup scripts
pip install pymongo python-dotenv -q

# Run Anthropic vector index setup
echo "  - Setting up Anthropic vector indexes..."
cd "$ROOT_DIR/reference/maap-anthropic-qs"
if [ -f "mongodb_create_vectorindex.py" ] && [ -f "data.json" ]; then
    python mongodb_create_vectorindex.py 2>&1 | while read line; do echo "    $line"; done
    print_status "Anthropic vector indexes created"
else
    print_warning "Anthropic setup files not found, skipping"
fi

# Run Temporal Fraud Detection MongoDB setup (runs inside container)
echo "  - Setting up Temporal Fraud Detection MongoDB collections and vector indexes..."
cd "$ROOT_DIR"
docker compose -f docker/docker-compose.yml --env-file "$ROOT_DIR/.env" exec -T temporal-fraud-detection-api python -m scripts.setup_mongodb 2>&1 | while read line; do echo "    $line"; done && \
    print_status "Temporal Fraud Detection MongoDB setup completed" || \
    print_warning "Temporal Fraud Detection MongoDB setup failed (may already be configured)"

# Run Cohere Semantic Search MongoDB setup
echo "  - Setting up Cohere Semantic Search vector indexes..."
cd "$ROOT_DIR/reference/maap-cohere-qs/deployment"
if [ -f "mongodb_create_vectorindex.py" ] && [ -f "data.json" ]; then
    python mongodb_create_vectorindex.py 2>&1 | while read line; do echo "    $line"; done
    print_status "Cohere vector indexes created"
else
    print_warning "Cohere setup files not found, skipping"
fi

# Run other solution setup scripts if they exist
for solution_dir in "$ROOT_DIR/reference/"*/; do
    solution_name=$(basename "$solution_dir")
    setup_script="$solution_dir/setup_indexes.py"
    if [ -f "$setup_script" ] && [ "$solution_name" != "maap-anthropic-qs" ]; then
        echo "  - Setting up $solution_name indexes..."
        cd "$solution_dir"
        python setup_indexes.py 2>&1 | while read line; do echo "    $line"; done
        print_status "$solution_name indexes created"
    fi
done

cd "$ROOT_DIR"

# Step 6: Verify all services are running
echo ""
echo "Step 6: Verifying services..."

services=(
    "3100:Web UI"
    "8502:Anthropic"
    "8503:Cohere"
    "8504:LangChain"
    "8505:Temporal Fraud"
    "8506:Fireworks"
    "8507:TogetherAI"
    "8088:Temporal UI"
)

all_ok=true
for service in "${services[@]}"; do
    port=$(echo "$service" | cut -d: -f1)
    name=$(echo "$service" | cut -d: -f2)
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:$port" 2>/dev/null || echo "000")
    if [ "$status" = "200" ]; then
        print_status "$name (port $port) - Running"
    else
        print_warning "$name (port $port) - Not responding (HTTP $status)"
        all_ok=false
    fi
done

echo ""
echo "=========================================="
if [ "$all_ok" = true ]; then
    print_status "Setup complete! All services are running."
else
    print_warning "Setup complete with warnings. Some services may need attention."
fi
echo "=========================================="
echo ""
echo "Access the application at:"
echo "  - Web UI: http://localhost:3100"
echo "  - Or use your server's public IP/hostname"
echo ""
