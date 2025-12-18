#!/bin/bash
# MongoDB Partner Solutions Library - Docker Setup Script
# Easy deployment using pre-built ECR images
#
# Usage:
#   1. git clone https://github.com/mohammaddaoudfarooqi/solutions-library.git
#   2. cd solutions-library
#   3. cp .env.example .env
#   4. # Edit .env with your credentials
#   5. ./scripts/docker_setup.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.ecr.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }

ECR_REGISTRY="public.ecr.aws"

echo "=========================================="
echo "MongoDB Partner Solutions Library Setup"
echo "=========================================="
echo ""

# Step 0: Setup ECR Public access
setup_ecr_access() {
    print_info "Setting up ECR Public access..."

    # First, clear any cached expired credentials
    docker logout "$ECR_REGISTRY" 2>/dev/null || true

    # If AWS CLI is available, authenticate for better pull rates
    if command -v aws &> /dev/null; then
        print_info "AWS CLI found, authenticating with ECR Public..."
        if aws ecr-public get-login-password --region us-east-1 2>/dev/null | \
            docker login --username AWS --password-stdin "$ECR_REGISTRY" 2>/dev/null; then
            print_status "Authenticated with ECR Public"
        else
            print_warning "Could not authenticate with AWS (anonymous access will be used)"
        fi
    else
        print_info "AWS CLI not found, using anonymous access to ECR Public"
    fi
}

# Step 1: Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    local missing=()

    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing+=("docker")
    fi

    # Check Docker Compose (try both v2 and v1)
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        missing+=("docker-compose")
    fi

    # Check .env file
    if [ ! -f "$ROOT_DIR/.env" ]; then
        echo ""
        print_error ".env file not found!"
        echo ""
        echo "Please create your environment file:"
        echo "  1. cp .env.example .env"
        echo "  2. Edit .env with your MongoDB URI and API keys"
        echo ""
        exit 1
    fi

    if [ ${#missing[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing[*]}"
        echo ""
        echo "Please install the missing tools:"
        echo "  - Docker: https://docs.docker.com/get-docker/"
        echo "  - Docker Compose: https://docs.docker.com/compose/install/"
        echo ""
        exit 1
    fi

    print_status "All prerequisites met"
}

# Step 2: Validate environment variables
validate_environment() {
    print_info "Validating environment configuration..."

    local warnings=()

    # Required variables
    local required_vars=(
        "MONGODB_URI"
    )

    # Optional but recommended variables
    local recommended_vars=(
        "ANTHROPIC_API_KEY"
        "COHERE_API_KEY"
        "FIREWORKS_API_KEY"
        "TOGETHER_API_KEY"
        "GROQ_API_KEY"
    )

    # Check required variables
    for var in "${required_vars[@]}"; do
        value=$(grep "^${var}=" "$ROOT_DIR/.env" 2>/dev/null | cut -d'=' -f2-)
        if [ -z "$value" ] || [[ "$value" == *"<"*">"* ]] || [[ "$value" == *"your_"* ]]; then
            print_error "Required variable ${var} is not configured in .env"
            echo "Please edit .env and set a valid value for ${var}"
            exit 1
        fi
    done

    # Check recommended variables
    for var in "${recommended_vars[@]}"; do
        value=$(grep "^${var}=" "$ROOT_DIR/.env" 2>/dev/null | cut -d'=' -f2-)
        if [ -z "$value" ] || [[ "$value" == *"your_"* ]]; then
            warnings+=("$var")
        fi
    done

    # Ensure MONGO_URI alias exists (needed by Cohere solution)
    if ! grep -q "^MONGO_URI=" "$ROOT_DIR/.env"; then
        MONGODB_URI=$(grep "^MONGODB_URI=" "$ROOT_DIR/.env" | cut -d'=' -f2-)
        echo "MONGO_URI=$MONGODB_URI" >> "$ROOT_DIR/.env"
        print_status "Added MONGO_URI environment variable"
    fi

    # Ensure MONGODB_DB exists (needed by LangChain solution)
    if ! grep -q "^MONGODB_DB=" "$ROOT_DIR/.env"; then
        echo "MONGODB_DB=langchain_research_agent" >> "$ROOT_DIR/.env"
        print_status "Added MONGODB_DB environment variable"
    fi

    if [ ${#warnings[@]} -gt 0 ]; then
        print_warning "The following API keys may not be configured: ${warnings[*]}"
        echo "  Some solutions may not work without these keys."
    fi

    print_status "Environment configuration validated"
}

# Step 3: Pull images from ECR
pull_images() {
    print_info "Pulling Docker images from ECR (this may take a few minutes)..."

    if docker compose -f "$COMPOSE_FILE" --env-file "$ROOT_DIR/.env" pull; then
        print_status "All images pulled successfully"
    else
        print_error "Failed to pull images. Check your network connection."
        exit 1
    fi
}

# Step 4: Start services
start_services() {
    print_info "Starting all services..."

    if docker compose -f "$COMPOSE_FILE" --env-file "$ROOT_DIR/.env" up -d; then
        print_status "All services started"
    else
        print_error "Failed to start services"
        echo "Check logs with: docker compose -f $COMPOSE_FILE logs"
        exit 1
    fi
}

# Step 5: Wait for services to initialize
wait_for_services() {
    print_info "Waiting for services to initialize (60 seconds)..."

    local dots=""
    for i in {1..12}; do
        dots="${dots}."
        echo -ne "\r  Initializing${dots}     "
        sleep 5
    done
    echo ""

    print_status "Services should be ready"
}

# Step 6: Setup vector indexes and seed data
setup_data() {
    print_info "Setting up vector indexes and seeding data..."

    # Temporal Fraud Detection MongoDB setup (runs inside container)
    echo "  - Setting up Temporal Fraud Detection..."
    if docker compose -f "$COMPOSE_FILE" --env-file "$ROOT_DIR/.env" \
        exec -T temporal-fraud-detection-api python -m scripts.setup_mongodb 2>/dev/null; then
        print_status "Temporal Fraud Detection MongoDB setup completed"
    else
        print_warning "Temporal Fraud Detection MongoDB setup skipped (may already be configured)"
    fi

    # Anthropic vector index setup (requires local Python)
    if command -v python3 &> /dev/null || command -v python &> /dev/null; then
        local python_cmd="python3"
        command -v python3 &> /dev/null || python_cmd="python"

        # Install dependencies if needed
        $python_cmd -m pip install pymongo python-dotenv -q 2>/dev/null || true

        # Anthropic setup
        echo "  - Setting up Anthropic vector indexes..."
        if [ -f "$ROOT_DIR/reference/maap-anthropic-qs/mongodb_create_vectorindex.py" ]; then
            cd "$ROOT_DIR/reference/maap-anthropic-qs"
            if $python_cmd mongodb_create_vectorindex.py 2>/dev/null; then
                print_status "Anthropic vector indexes created"
            else
                print_warning "Anthropic vector index setup skipped (may already exist)"
            fi
            cd "$ROOT_DIR"
        fi

        # Cohere setup
        echo "  - Setting up Cohere vector indexes..."
        if [ -f "$ROOT_DIR/reference/maap-cohere-qs/deployment/mongodb_create_vectorindex.py" ]; then
            cd "$ROOT_DIR/reference/maap-cohere-qs/deployment"
            if $python_cmd mongodb_create_vectorindex.py 2>/dev/null; then
                print_status "Cohere vector indexes created"
            else
                print_warning "Cohere vector index setup skipped (may already exist)"
            fi
            cd "$ROOT_DIR"
        fi
    else
        print_warning "Python not found. Skipping vector index setup."
        echo "  You may need to manually run vector index setup scripts."
    fi
}

# Step 7: Verify services
verify_services() {
    print_info "Verifying services..."

    local services=(
        "3100:Web UI"
        "8502:Anthropic"
        "8503:Cohere"
        "8504:LangChain"
        "8505:Temporal Fraud"
        "8506:Fireworks"
        "8507:TogetherAI"
        "8088:Temporal UI"
    )

    local all_ok=true
    for service in "${services[@]}"; do
        port=$(echo "$service" | cut -d: -f1)
        name=$(echo "$service" | cut -d: -f2)
        status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:$port" 2>/dev/null || echo "000")
        if [ "$status" = "200" ] || [ "$status" = "302" ] || [ "$status" = "304" ]; then
            print_status "$name (port $port) - Running"
        else
            print_warning "$name (port $port) - Not responding (HTTP $status)"
            all_ok=false
        fi
    done

    echo ""
    return 0
}

# Step 8: Print summary
print_summary() {
    echo "=========================================="
    echo "Setup Complete!"
    echo "=========================================="
    echo ""
    echo "Access the Solutions Library:"
    echo ""
    echo "  Main UI:         http://localhost:3100"
    echo "                   http://localhost (via gateway)"
    echo ""
    echo "  Partner Solutions:"
    echo "    Anthropic:     http://localhost:8502"
    echo "    Cohere:        http://localhost:8503"
    echo "    LangChain:     http://localhost:8504"
    echo "    Temporal:      http://localhost:8505"
    echo "    Fireworks:     http://localhost:8506"
    echo "    TogetherAI:    http://localhost:8507"
    echo ""
    echo "  Infrastructure:"
    echo "    Temporal UI:   http://localhost:8088"
    echo "    API Gateway:   http://localhost:8080"
    echo ""
    echo "Useful commands:"
    echo "  View logs:       docker compose -f docker/docker-compose.ecr.yml logs -f"
    echo "  Stop services:   docker compose -f docker/docker-compose.ecr.yml down"
    echo "  Restart:         docker compose -f docker/docker-compose.ecr.yml restart"
    echo ""
}

# Main execution
main() {
    cd "$ROOT_DIR"

    # Step 1: Check prerequisites
    echo ""
    echo "Step 1/8: Checking prerequisites..."
    check_prerequisites

    # Step 2: Validate environment
    echo ""
    echo "Step 2/8: Validating environment..."
    validate_environment

    # Step 3: Setup ECR access
    echo ""
    echo "Step 3/8: Setting up ECR access..."
    setup_ecr_access

    # Step 4: Pull images
    echo ""
    echo "Step 4/8: Pulling Docker images..."
    pull_images

    # Step 5: Start services
    echo ""
    echo "Step 5/8: Starting services..."
    start_services

    # Step 6: Wait for initialization
    echo ""
    echo "Step 6/8: Waiting for initialization..."
    wait_for_services

    # Step 7: Setup data
    echo ""
    echo "Step 7/8: Setting up data..."
    setup_data

    # Step 8: Verify services
    echo ""
    echo "Step 8/8: Verifying services..."
    verify_services

    # Print summary
    print_summary
}

# Run main
main "$@"
