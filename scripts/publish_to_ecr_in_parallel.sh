#!/bin/bash
# MongoDB Partner Solutions Library - Parallel ECR Publish Script
# Builds multi-platform Docker images in parallel and pushes to AWS ECR Public
#
# Usage: ./scripts/publish_to_ecr_in_parallel.sh
#
# Environment Variables:
#   MAX_PARALLEL_JOBS - Concurrent builds (default: 4)
#   BUILD_TIMEOUT     - Seconds per build (default: 1800)
#   PLATFORMS         - Target platforms (default: linux/amd64,linux/arm64)
#   NO_CACHE          - Skip caching if true (default: false)
#   BUILD_VERSION     - Override version tag (optional)
#
# Prerequisites:
# - AWS CLI configured with appropriate credentials
# - Docker with buildx support
# - Git repository

set -euo pipefail

# ==============================================================================
# Configuration
# ==============================================================================

ECR_REGISTRY="public.ecr.aws/s2e1n3u8"
ECR_REPO_PREFIX="solutions-library"
AWS_REGION="us-east-1"

MAX_PARALLEL_JOBS=${MAX_PARALLEL_JOBS:-4}
BUILD_TIMEOUT=${BUILD_TIMEOUT:-1800}
PLATFORMS=${PLATFORMS:-"linux/amd64,linux/arm64"}
NO_CACHE=${NO_CACHE:-false}
BUILD_VERSION=${BUILD_VERSION:-""}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# ==============================================================================
# Colors for output
# ==============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# ==============================================================================
# Service definitions: name|context|dockerfile
# ==============================================================================

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

# ==============================================================================
# Global variables
# ==============================================================================

GIT_SHA=""
GIT_BRANCH=""
GIT_DIRTY=""
BUILD_TIME=""
LOG_DIR=""
RESULTS_DIR=""
ORDERED_PLATFORMS=""
START_TIME=""

declare -a BUILD_PIDS=()
declare -a BUILD_NAMES=()

# ==============================================================================
# Cleanup trap
# ==============================================================================

cleanup() {
    local exit_code=$?

    # Kill any running background jobs
    if [ ${#BUILD_PIDS[@]} -gt 0 ]; then
        for pid in "${BUILD_PIDS[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
            fi
        done
    fi
    jobs -p 2>/dev/null | xargs -r kill 2>/dev/null || true

    # Remove temp results directory
    if [ -n "${RESULTS_DIR:-}" ] && [ -d "$RESULTS_DIR" ]; then
        rm -rf "$RESULTS_DIR"
    fi

    # Log files are kept for debugging
    exit $exit_code
}

trap cleanup EXIT INT TERM

# ==============================================================================
# Helper functions
# ==============================================================================

sanitize_name() {
    local name="$1"
    # Replace non-alphanumeric chars (except dash/underscore) with dash
    echo "$name" | sed 's/[^a-zA-Z0-9_-]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//'
}

sanitize_branch() {
    local branch="$1"
    # Replace slashes and special chars with dash, lowercase
    echo "$branch" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-50
}

get_content_hash() {
    local context_path="$1"
    local hash=""

    # Compute SHA256 of source files, excluding build artifacts
    # Use timeout to prevent hanging on large directories
    hash=$(timeout 30 find "$context_path" \
        -type f \
        ! -path "*/.git/*" \
        ! -path "*/node_modules/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        ! -path "*/__pycache__/*" \
        ! -path "*/venv/*" \
        ! -path "*/.venv/*" \
        ! -path "*/.next/*" \
        ! -path "*/coverage/*" \
        ! -path "*/.nyc_output/*" \
        ! -name "*.pyc" \
        ! -name "*.pyo" \
        -print0 2>/dev/null | \
        xargs -0 sha256sum 2>/dev/null | \
        sort | \
        sha256sum | \
        cut -c1-12) || true

    # Fallback to timestamp if hash fails
    if [ -z "$hash" ]; then
        hash=$(date +%s | sha256sum | cut -c1-12)
    fi

    echo "$hash"
}

get_current_arch() {
    local arch
    arch=$(uname -m)

    case "$arch" in
        x86_64)
            echo "amd64"
            ;;
        aarch64|arm64)
            echo "arm64"
            ;;
        *)
            echo "amd64"  # Default fallback
            ;;
    esac
}

order_platforms() {
    local platforms="$1"
    local current_arch
    current_arch=$(get_current_arch)

    local current_platform="linux/${current_arch}"
    local platform_list
    local reordered=""

    # Split platforms by comma
    IFS=',' read -ra platform_list <<< "$platforms"

    # Check if current platform is in the list
    local found=false
    for plat in "${platform_list[@]}"; do
        if [ "$plat" = "$current_platform" ]; then
            found=true
            break
        fi
    done

    if [ "$found" = true ]; then
        # Put current platform first
        reordered="$current_platform"
        for plat in "${platform_list[@]}"; do
            if [ "$plat" != "$current_platform" ]; then
                reordered="${reordered},${plat}"
            fi
        done
        echo "$reordered"
    else
        # Return original order if current platform not in list
        echo "$platforms"
    fi
}

# ==============================================================================
# Setup functions
# ==============================================================================

check_prerequisites() {
    print_info "Checking prerequisites..."

    local failed=false

    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running"
        failed=true
    fi

    # Check Docker buildx
    if ! docker buildx version >/dev/null 2>&1; then
        print_error "Docker Buildx is not available"
        failed=true
    fi

    # Check AWS CLI
    if ! command -v aws >/dev/null 2>&1; then
        print_error "AWS CLI is not installed"
        failed=true
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials are invalid or expired"
        failed=true
    fi

    # Check Git repository
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        print_error "Not a git repository"
        failed=true
    fi

    # Validate platforms format
    if ! echo "$PLATFORMS" | grep -qE '^linux/(amd64|arm64)(,linux/(amd64|arm64))*$'; then
        print_warning "Platforms format may be invalid: $PLATFORMS"
    fi

    if [ "$failed" = true ]; then
        print_error "Prerequisites check failed"
        exit 1
    fi

    print_status "Prerequisites passed"
}

setup_directories() {
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)

    # Create log directory
    LOG_DIR="${ROOT_DIR}/logs/builds/${timestamp}"
    mkdir -p "$LOG_DIR"

    # Create temp results directory
    RESULTS_DIR=$(mktemp -d)

    # Cleanup old logs (older than 7 days)
    find "${ROOT_DIR}/logs/builds" -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

    print_info "Logs: ${LOG_DIR}"
}

setup_git_info() {
    # Get git SHA (12 chars)
    GIT_SHA=$(git rev-parse --short=12 HEAD 2>/dev/null || echo "unknown")

    # Get branch name
    GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

    # Check for detached HEAD
    if [ "$GIT_BRANCH" = "HEAD" ]; then
        GIT_BRANCH="detached"
    fi

    # Sanitize branch name for use in tags
    GIT_BRANCH=$(sanitize_branch "$GIT_BRANCH")

    # Check for uncommitted changes
    if ! git diff --quiet HEAD 2>/dev/null || [ -n "$(git status --porcelain 2>/dev/null)" ]; then
        GIT_DIRTY="-dirty"
        GIT_SHA="${GIT_SHA}${GIT_DIRTY}"
    else
        GIT_DIRTY=""
    fi

    # Set build time
    BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    print_info "Git: ${GIT_SHA} (${GIT_BRANCH})"
}

authenticate_ecr() {
    print_info "Authenticating with AWS ECR Public..."

    if ! aws ecr-public get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ECR_REGISTRY" 2>/dev/null; then
        print_error "Failed to authenticate with ECR. Check your AWS credentials."
        exit 1
    fi

    print_status "ECR authenticated"
}

setup_buildx() {
    print_info "Setting up Docker Buildx..."

    # Create builder with multi-platform support if it doesn't exist
    if ! docker buildx inspect solutions-builder-parallel >/dev/null 2>&1; then
        print_info "Creating new buildx builder: solutions-builder-parallel"
        docker buildx create \
            --name solutions-builder-parallel \
            --driver docker-container \
            --driver-opt network=host \
            --use \
            --bootstrap >/dev/null 2>&1
    else
        print_info "Using existing buildx builder: solutions-builder-parallel"
        docker buildx use solutions-builder-parallel
    fi

    # Bootstrap the builder
    docker buildx inspect --bootstrap >/dev/null 2>&1

    print_status "Buildx ready"
}

precreate_repositories() {
    print_info "Creating ECR repositories..."

    local created=0
    local existed=0

    for service_def in "${SERVICES[@]}"; do
        IFS='|' read -r name _ _ <<< "$service_def"
        local repo_name="${ECR_REPO_PREFIX}/${name}"

        if ! aws ecr-public describe-repositories --region "$AWS_REGION" --repository-names "$repo_name" >/dev/null 2>&1; then
            if aws ecr-public create-repository --repository-name "$repo_name" --region "$AWS_REGION" >/dev/null 2>&1; then
                created=$((created + 1))
            fi
        else
            existed=$((existed + 1))
        fi
    done

    print_status "Repositories ready (${created} created, ${existed} existed)"
}

# ==============================================================================
# Build functions
# ==============================================================================

build_and_push() {
    local service_name="$1"
    local context_path="$2"
    local dockerfile="$3"
    local log_file="$4"
    local result_file="$5"

    local full_context="${ROOT_DIR}/${context_path}"
    local dockerfile_path="${full_context}/${dockerfile}"
    local image="${ECR_REGISTRY}/${ECR_REPO_PREFIX}/${service_name}"

    # Redirect all output to log file
    exec > "$log_file" 2>&1

    echo "=========================================="
    echo "Building: ${service_name}"
    echo "=========================================="
    echo "Context: ${context_path}"
    echo "Dockerfile: ${dockerfile}"
    echo "Image: ${image}"
    echo "Platforms: ${ORDERED_PLATFORMS}"
    echo "Git SHA: ${GIT_SHA}"
    echo "Git Branch: ${GIT_BRANCH}"
    echo "Build Time: ${BUILD_TIME}"
    echo "=========================================="
    echo ""

    # Verify context exists
    if [ ! -d "$full_context" ]; then
        echo "ERROR: Context directory not found: ${full_context}"
        echo "failed" > "$result_file"
        return 1
    fi

    # Verify Dockerfile exists
    if [ ! -f "$dockerfile_path" ]; then
        echo "ERROR: Dockerfile not found: ${dockerfile_path}"
        echo "failed" > "$result_file"
        return 1
    fi

    # Calculate content hash
    local content_hash
    content_hash=$(get_content_hash "$full_context")
    echo "Content Hash: ${content_hash}"
    echo ""

    # Determine version tag
    local version_tag="${BUILD_VERSION:-$GIT_SHA}"

    # Build cache options
    local cache_from_opt=""
    local cache_to_opt=""

    if [ "$NO_CACHE" != "true" ]; then
        cache_from_opt="--cache-from=type=registry,ref=${image}:cache-${GIT_BRANCH}"
        cache_to_opt="--cache-to=type=registry,ref=${image}:cache-${GIT_BRANCH},mode=max"
    fi

    # Build and push with timeout
    echo "Starting build..."
    echo ""

    local build_cmd=(
        docker buildx build
        --platform "${ORDERED_PLATFORMS}"
        --file "${dockerfile_path}"
        --tag "${image}:latest"
        --tag "${image}:${version_tag}"
        --tag "${image}:${content_hash}"
        --build-arg "GIT_SHA=${GIT_SHA}"
        --build-arg "BUILD_TIME=${BUILD_TIME}"
        --build-arg "SOURCE_HASH=${content_hash}"
        --label "org.opencontainers.image.revision=${GIT_SHA}"
        --label "org.opencontainers.image.created=${BUILD_TIME}"
        --label "org.opencontainers.image.source.hash=${content_hash}"
        --label "org.opencontainers.image.ref.name=${GIT_BRANCH}"
        --push
        --progress=plain
    )

    # Add cache options if enabled
    if [ -n "$cache_from_opt" ]; then
        build_cmd+=("$cache_from_opt")
    fi
    if [ -n "$cache_to_opt" ]; then
        build_cmd+=("$cache_to_opt")
    fi

    build_cmd+=("${full_context}")

    if timeout "${BUILD_TIMEOUT}" "${build_cmd[@]}"; then
        echo ""
        echo "=========================================="
        echo "SUCCESS: ${service_name}"
        echo "=========================================="
        echo "success" > "$result_file"
        return 0
    else
        local exit_code=$?
        echo ""
        echo "=========================================="
        if [ $exit_code -eq 124 ]; then
            echo "TIMEOUT: ${service_name} (exceeded ${BUILD_TIMEOUT}s)"
        else
            echo "FAILED: ${service_name} (exit code: ${exit_code})"
        fi
        echo "=========================================="
        echo "failed" > "$result_file"
        return 1
    fi
}

build_all_parallel() {
    local total=${#SERVICES[@]}
    local started=0
    local completed=0
    local success_count=0
    local failed_count=0

    declare -a failed_services=()

    print_info "Building ${total} services (max ${MAX_PARALLEL_JOBS} parallel)"
    echo ""

    # Start initial batch of jobs
    for service_def in "${SERVICES[@]}"; do
        IFS='|' read -r name context dockerfile <<< "$service_def"

        # Wait for a slot if we're at max capacity
        while [ ${#BUILD_PIDS[@]} -ge "$MAX_PARALLEL_JOBS" ]; do
            # Wait for any job to finish
            local temp_pids=()
            local temp_names=()

            for i in "${!BUILD_PIDS[@]}"; do
                local pid="${BUILD_PIDS[$i]}"
                local svc_name="${BUILD_NAMES[$i]}"

                if ! kill -0 "$pid" 2>/dev/null; then
                    # Job finished, check result
                    wait "$pid" 2>/dev/null || true
                    completed=$((completed + 1))

                    local result_file="${RESULTS_DIR}/${svc_name}.result"
                    if [ -f "$result_file" ] && [ "$(cat "$result_file")" = "success" ]; then
                        success_count=$((success_count + 1))
                        print_status "Completed: ${svc_name}"
                    else
                        failed_count=$((failed_count + 1))
                        failed_services+=("$svc_name")
                        print_error "Failed: ${svc_name} (see ${LOG_DIR}/${svc_name}.log)"
                    fi
                else
                    # Job still running
                    temp_pids+=("$pid")
                    temp_names+=("$svc_name")
                fi
            done

            BUILD_PIDS=("${temp_pids[@]+"${temp_pids[@]}"}")
            BUILD_NAMES=("${temp_names[@]+"${temp_names[@]}"}")

            # Small sleep to avoid busy waiting
            if [ ${#BUILD_PIDS[@]} -ge "$MAX_PARALLEL_JOBS" ]; then
                sleep 1
            fi
        done

        # Start new job
        started=$((started + 1))
        print_info "[${started}/${total}] Starting: ${name}"

        local log_file="${LOG_DIR}/${name}.log"
        local result_file="${RESULTS_DIR}/${name}.result"

        # Run build in background subshell
        (build_and_push "$name" "$context" "$dockerfile" "$log_file" "$result_file") &
        local pid=$!

        BUILD_PIDS+=("$pid")
        BUILD_NAMES+=("$name")
    done

    # Wait for remaining jobs
    while [ ${#BUILD_PIDS[@]} -gt 0 ]; do
        local temp_pids=()
        local temp_names=()

        for i in "${!BUILD_PIDS[@]}"; do
            local pid="${BUILD_PIDS[$i]}"
            local svc_name="${BUILD_NAMES[$i]}"

            if ! kill -0 "$pid" 2>/dev/null; then
                # Job finished
                wait "$pid" 2>/dev/null || true
                completed=$((completed + 1))

                local result_file="${RESULTS_DIR}/${svc_name}.result"
                if [ -f "$result_file" ] && [ "$(cat "$result_file")" = "success" ]; then
                    success_count=$((success_count + 1))
                    print_status "Completed: ${svc_name}"
                else
                    failed_count=$((failed_count + 1))
                    failed_services+=("$svc_name")
                    print_error "Failed: ${svc_name} (see ${LOG_DIR}/${svc_name}.log)"
                fi
            else
                temp_pids+=("$pid")
                temp_names+=("$svc_name")
            fi
        done

        BUILD_PIDS=("${temp_pids[@]+"${temp_pids[@]}"}")
        BUILD_NAMES=("${temp_names[@]+"${temp_names[@]}"}")

        if [ ${#BUILD_PIDS[@]} -gt 0 ]; then
            sleep 1
        fi
    done

    # Store results for summary
    echo "$success_count" > "${RESULTS_DIR}/success_count"
    echo "$failed_count" > "${RESULTS_DIR}/failed_count"
    printf '%s\n' "${failed_services[@]}" > "${RESULTS_DIR}/failed_services"
}

# ==============================================================================
# Summary
# ==============================================================================

print_summary() {
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))

    local total=${#SERVICES[@]}
    local success_count=0
    local failed_count=0
    declare -a failed_services=()

    if [ -f "${RESULTS_DIR}/success_count" ]; then
        success_count=$(cat "${RESULTS_DIR}/success_count")
    fi
    if [ -f "${RESULTS_DIR}/failed_count" ]; then
        failed_count=$(cat "${RESULTS_DIR}/failed_count")
    fi
    if [ -f "${RESULTS_DIR}/failed_services" ]; then
        mapfile -t failed_services < "${RESULTS_DIR}/failed_services"
    fi

    echo ""
    echo "=========================================="
    echo "Build Summary"
    echo "=========================================="
    echo "Git: ${GIT_SHA} (${GIT_BRANCH})"
    echo "Time: ${BUILD_TIME}"
    echo ""
    echo "Total: ${total} | Success: ${success_count} | Failed: ${failed_count}"
    echo ""

    if [ "$failed_count" -gt 0 ]; then
        print_error "Failed builds:"
        for name in "${failed_services[@]}"; do
            if [ -n "$name" ]; then
                echo "  - ${name}"
                echo "    Log: ${LOG_DIR}/${name}.log"
            fi
        done
        echo ""
    fi

    if [ "$success_count" -gt 0 ] && [ "$failed_count" -eq 0 ]; then
        print_status "All images built and pushed successfully!"
        echo ""
        echo "Images are available at:"
        for service_def in "${SERVICES[@]}"; do
            IFS='|' read -r name _ _ <<< "$service_def"
            echo "  ${ECR_REGISTRY}/${ECR_REPO_PREFIX}/${name}:latest"
        done
    fi

    echo ""
    print_info "Total time: ${duration}s (${minutes}m ${seconds}s)"
    print_info "Logs directory: ${LOG_DIR}"

    if [ "$failed_count" -gt 0 ]; then
        return 1
    fi
    return 0
}

# ==============================================================================
# Main
# ==============================================================================

main() {
    START_TIME=$(date +%s)

    echo "=========================================="
    echo "MongoDB Solutions Library - ECR Publisher"
    echo "=========================================="
    echo ""

    cd "$ROOT_DIR"

    # Step 1: Check prerequisites
    check_prerequisites

    # Step 2: Setup directories
    setup_directories

    # Step 3: Setup git info
    setup_git_info

    # Step 4: Detect architecture and order platforms
    local current_arch
    current_arch=$(get_current_arch)
    ORDERED_PLATFORMS=$(order_platforms "$PLATFORMS")
    print_info "Current architecture: ${current_arch}"
    print_info "Platform order: ${ORDERED_PLATFORMS}"

    # Step 5: Authenticate with ECR
    authenticate_ecr

    # Step 6: Setup buildx
    setup_buildx

    # Step 7: Pre-create repositories
    precreate_repositories

    # Step 8: Build and push all services in parallel
    build_all_parallel

    # Step 9: Print summary
    print_summary
}

# Run main
main "$@"
