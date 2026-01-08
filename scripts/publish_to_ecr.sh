#!/bin/bash
# MongoDB Partner Solutions Library - ECR Publish Script
# Builds multi-platform Docker images and pushes to AWS ECR Public
#
# Usage: ./scripts/publish_to_ecr.sh
#
# Prerequisites:
# - AWS CLI configured with appropriate credentials
# - Docker with buildx support
# - ECR repository created: public.ecr.aws/s2e1n3u8/solutions-library

set -e

# Configuration
ECR_REGISTRY="public.ecr.aws/s2e1n3u8"
ECR_REPO_PREFIX="solutions-library"
PLATFORMS="linux/amd64,linux/arm64"
AWS_REGION="us-east-1"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

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

# Service definitions: name|context|dockerfile
# Each service will be pushed as: $ECR_REGISTRY/$ECR_REPO_PREFIX/<name>:latest
declare -a SERVICES=(
    "web|apps/web|Dockerfile"
    "admin-api|services/admin-api|Dockerfile"
    "temporal-fraud-detection|reference/maap-temporal-ai-agent-qs|Dockerfile"
    "cohere-semantic-search|reference/maap-cohere-qs|Dockerfile"
    "langchain-research-agent|reference/langchain-qs|Dockerfile"
    "fireworks-backend|reference/mdb-bfsi-credit-reco-genai/backend_agentic|Dockerfile"
    "fireworks-frontend|reference/mdb-bfsi-credit-reco-genai/frontend|Dockerfile"
    "anthropic-logger|reference/maap-anthropic-qs/MAAP-AWS-Anthropic/logger|Dockerfile"
    "anthropic-loader|reference/maap-anthropic-qs/MAAP-AWS-Anthropic/loader|Dockerfile"
    "anthropic-main|reference/maap-anthropic-qs/MAAP-AWS-Anthropic/main|Dockerfile"
    "anthropic-ui|reference/maap-anthropic-qs/MAAP-AWS-Anthropic/ui|Dockerfile"
    "anthropic-nginx|reference/maap-anthropic-qs/MAAP-AWS-Anthropic/nginx|Dockerfile"
)

# Track failed builds
declare -a FAILED_BUILDS=()

echo "=========================================="
echo "MongoDB Solutions Library - ECR Publisher"
echo "=========================================="
echo ""

# Function: Authenticate with ECR Public
authenticate_ecr() {
    print_info "Authenticating with AWS ECR Public..."

    if ! aws ecr-public get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ECR_REGISTRY"; then
        print_error "Failed to authenticate with ECR. Check your AWS credentials."
        exit 1
    fi

    print_status "ECR authentication successful"
}

# Function: Setup Docker Buildx
setup_buildx() {
    print_info "Setting up Docker Buildx..."

    # Check if buildx is available
    if ! docker buildx version > /dev/null 2>&1; then
        print_error "Docker Buildx is not available. Please install Docker Desktop or enable buildx."
        exit 1
    fi

    # Create builder if it doesn't exist
    if ! docker buildx inspect solutions-builder > /dev/null 2>&1; then
        print_info "Creating new buildx builder: solutions-builder"
        docker buildx create --name solutions-builder --use --bootstrap
    else
        print_info "Using existing buildx builder: solutions-builder"
        docker buildx use solutions-builder
    fi

    # Bootstrap the builder
    docker buildx inspect --bootstrap > /dev/null 2>&1

    print_status "Buildx ready"
}

# Function: Build and push a single service
build_and_push() {
    local service_name="$1"
    local context_path="$2"
    local dockerfile="$3"

    local full_context="${ROOT_DIR}/${context_path}"
    local full_image="${ECR_REGISTRY}/${ECR_REPO_PREFIX}/${service_name}:latest"

    echo ""
    echo "======================================"
    print_info "Building: ${service_name}"
    echo "  Context: ${context_path}"
    echo "  Dockerfile: ${dockerfile}"
    echo "  Image: ${full_image}"
    echo "  Platforms: ${PLATFORMS}"
    echo "======================================"

    # Verify context exists
    if [ ! -d "$full_context" ]; then
        print_error "Context directory not found: ${full_context}"
        FAILED_BUILDS+=("$service_name")
        return 1
    fi

    # Verify Dockerfile exists
    if [ ! -f "${full_context}/${dockerfile}" ]; then
        print_error "Dockerfile not found: ${full_context}/${dockerfile}"
        FAILED_BUILDS+=("$service_name")
        return 1
    fi

    # Create ECR repository if it doesn't exist
    local repo_name="${ECR_REPO_PREFIX}/${service_name}"
    print_info "Ensuring repository exists: ${repo_name}"
    if ! aws ecr-public describe-repositories --region "$AWS_REGION" --repository-names "$repo_name" >/dev/null 2>&1; then
        print_info "Creating repository: ${repo_name}"
        if ! aws ecr-public create-repository --repository-name "$repo_name" --region "$AWS_REGION" >/dev/null 2>&1; then
            print_warning "Could not create repository (may already exist or permission issue)"
        else
            print_status "Repository created: ${repo_name}"
        fi
    else
        print_info "Repository already exists: ${repo_name}"
    fi

    # Build and push
    if docker buildx build \
        --platform "${PLATFORMS}" \
        --file "${full_context}/${dockerfile}" \
        --tag "${full_image}" \
        --push \
        "${full_context}"; then
        print_status "Successfully built and pushed: ${service_name}"
        return 0
    else
        print_error "Failed to build: ${service_name}"
        FAILED_BUILDS+=("$service_name")
        return 1
    fi
}

# Function: Main build loop
build_all_services() {
    local total=${#SERVICES[@]}
    local current=0

    print_info "Building ${total} services..."

    for service_def in "${SERVICES[@]}"; do
        current=$((current + 1))

        # Parse service definition
        IFS='|' read -r name context dockerfile <<< "$service_def"

        echo ""
        echo "[$current/$total] Processing ${name}..."

        build_and_push "$name" "$context" "$dockerfile" || true
    done
}

# Function: Print summary
print_summary() {
    echo ""
    echo "=========================================="
    echo "Build Summary"
    echo "=========================================="

    local total=${#SERVICES[@]}
    local failed=${#FAILED_BUILDS[@]}
    local success=$((total - failed))

    echo "Total services: ${total}"
    echo "Successful: ${success}"
    echo "Failed: ${failed}"

    if [ ${failed} -gt 0 ]; then
        echo ""
        print_error "Failed builds:"
        for name in "${FAILED_BUILDS[@]}"; do
            echo "  - ${name}"
        done
        echo ""
        print_warning "Some builds failed. Check the logs above for details."
        return 1
    else
        echo ""
        print_status "All images built and pushed successfully!"
        echo ""
        echo "Images are available at:"
        for service_def in "${SERVICES[@]}"; do
            IFS='|' read -r name _ _ <<< "$service_def"
            echo "  ${ECR_REGISTRY}/${ECR_REPO_PREFIX}/${name}:latest"
        done
        return 0
    fi
}

# Main execution
main() {
    cd "$ROOT_DIR"

    # Step 1: Authenticate with ECR
    authenticate_ecr

    # Step 2: Setup buildx
    setup_buildx

    # Step 3: Build and push all services
    build_all_services

    # Step 4: Print summary
    print_summary
}

# Run main
main "$@"
