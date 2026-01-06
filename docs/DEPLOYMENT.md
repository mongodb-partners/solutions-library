# Deployment Guide

This guide covers deploying the MongoDB Partner Solutions Library.

## Prerequisites

- Docker 24+ and Docker Compose v2
- MongoDB Atlas cluster (M10+ recommended for production)
- API keys for partner services (AWS, Cohere, etc.)
- 8GB+ RAM for running multiple solutions

## Quick Start

### 1. Clone and Configure

```bash
# Clone the repository
git clone https://github.com/mongodb-partners/solutions-library.git
cd solutions-library

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### 2. Configure MongoDB Atlas

1. Create or access your MongoDB Atlas cluster
2. Create databases for each solution:
   - `temporal_fraud_detection`
   - `anthropic_doc_assistant`
   - `cohere_semantic_search`
   - `langchain_research_agent`
   - `confluent_customer360`
   - `fireworks_inference`
   - `togetherai_opensource`
3. Configure IP whitelist (add your deployment IP)
4. Copy connection string to `MONGODB_URI` in `.env`

### 3. Configure API Keys

Add the following to your `.env` file:

```bash
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/

# AWS (for Bedrock)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1

# AI Providers
GROQ_API_KEY=your_groq_key
VOYAGE_API_KEY=your_voyage_key
COHERE_API_KEY=your_cohere_key
ANTHROPIC_API_KEY=your_anthropic_key
FIREWORKS_API_KEY=your_fireworks_key
TOGETHERAI_API_KEY=your_togetherai_key
```

### 4. Build and Deploy

```bash
# Build all images
docker-compose -f docker/docker-compose.yml build

# Start all services
docker-compose -f docker/docker-compose.yml up -d

# Check service status
docker-compose -f docker/docker-compose.yml ps

# View logs
docker-compose -f docker/docker-compose.yml logs -f
```

### 5. Verify Deployment

```bash
# Check gateway health
curl http://localhost:8080/health

# Access the web UI
open http://localhost:3000

# Check Temporal UI
open http://localhost:8505
```

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Solutions Library | http://localhost:3000 | Main web interface |
| API Gateway | http://localhost:8080 | Nginx gateway |
| Temporal Demo | http://localhost:8505 | Fraud detection UI |
| Temporal Admin | http://localhost:8088 | Temporal dashboard |
| Temporal Server | localhost:7233 | Temporal gRPC |

## Managing Services

### Starting/Stopping

```bash
# Start all services
docker-compose -f docker/docker-compose.yml up -d

# Stop all services
docker-compose -f docker/docker-compose.yml down

# Restart a specific service
docker-compose -f docker/docker-compose.yml restart web

# View logs for specific service
docker-compose -f docker/docker-compose.yml logs -f temporal-fraud-detection-ui
```

### Scaling

```bash
# Scale a specific service (if applicable)
docker-compose -f docker/docker-compose.yml up -d --scale temporal-worker=3
```

### Updating

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker/docker-compose.yml up -d --build
```

## Production Considerations

### Security

1. **HTTPS**: Configure SSL/TLS termination at load balancer or Nginx
2. **Secrets**: Use secret management (AWS Secrets Manager, HashiCorp Vault)
3. **Network**: Deploy in private VPC with bastion host
4. **MongoDB**: Enable VPC Peering or Private Endpoints
5. **CORS**: Configure allowed origins for cross-origin requests (see below)

#### CORS Configuration

All APIs enforce Cross-Origin Resource Sharing (CORS) restrictions to prevent unauthorized cross-origin requests. By default, only localhost origins are allowed for development.

**For production deployments**, you must set the `ALLOWED_ORIGINS` environment variable with your actual domain(s).

**Setting ALLOWED_ORIGINS:**

```bash
# In .env file - comma-separated list of allowed origins
ALLOWED_ORIGINS=https://solutions.mongodb.com,https://admin.mongodb.com
```

**MongoDB.com Production Deployments:**

For deployments on `*.mongodb.com` subdomains:

```bash
# Single subdomain
ALLOWED_ORIGINS=https://solutions.mongodb.com

# Multiple subdomains
ALLOWED_ORIGINS=https://solutions.mongodb.com,https://partners.mongodb.com,https://admin.mongodb.com

# Include both www and non-www if needed
ALLOWED_ORIGINS=https://solutions.mongodb.com,https://www.solutions.mongodb.com
```

**AWS EC2 Deployments:**

For deployments on EC2 instances, include your EC2 public DNS hostname:

```bash
# EC2 deployment with all service ports
ALLOWED_ORIGINS=http://ec2-X-X-X-X.compute-1.amazonaws.com:3100,http://ec2-X-X-X-X.compute-1.amazonaws.com:8080,http://ec2-X-X-X-X.compute-1.amazonaws.com:8506,http://ec2-X-X-X-X.compute-1.amazonaws.com

# Or use your custom domain
ALLOWED_ORIGINS=https://your-domain.com,https://api.your-domain.com
```

Replace `ec2-X-X-X-X.compute-1.amazonaws.com` with your actual EC2 public DNS hostname.

**Important Notes:**

- Always use `https://` for production origins (not `http://`)
- Do NOT use wildcards (`*`) in production - each origin must be explicitly listed
- Include the full origin with protocol and port (if non-standard)
- The Nginx gateway also validates origins - both must be configured

**Nginx CORS Whitelist:**

The Nginx gateway (`docker/nginx/nginx.conf`) has a built-in whitelist that allows:
- `localhost` and `127.0.0.1` (any port)
- Docker internal hostnames (`web`, etc.)
- Any `*.mongodb.com` subdomain

To add custom domains to Nginx, edit the `$cors_origin` map in `docker/nginx/nginx.conf`:

```nginx
map $http_origin $cors_origin {
    default "";
    "~^https?://localhost(:[0-9]+)?$" $http_origin;
    "~^https?://127\.0\.0\.1(:[0-9]+)?$" $http_origin;
    "~^https?://[^/]+\.mongodb\.com$" $http_origin;
    # Add your custom domain pattern:
    "~^https://your-domain\.com$" $http_origin;
}
```

**Per-Service Configuration:**

Each backend service reads `ALLOWED_ORIGINS` from the environment. The Docker Compose files pass this variable to all services automatically via `env_file: ../.env`.

### Performance

1. **Resources**: Allocate sufficient CPU/memory per container
2. **Caching**: Enable Redis caching for frequently accessed data
3. **CDN**: Use CDN for static assets

### Monitoring

1. **Logging**: Configure centralized logging (ELK, CloudWatch)
2. **Metrics**: Set up Prometheus/Grafana for monitoring
3. **Alerting**: Configure alerts for service health

### High Availability

1. **Load Balancing**: Deploy behind ALB/NLB
2. **Multi-AZ**: Distribute containers across availability zones
3. **Auto-scaling**: Configure container auto-scaling policies

## Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check logs
docker-compose -f docker/docker-compose.yml logs service-name

# Check resource usage
docker stats
```

**MongoDB connection failed:**
- Verify `MONGODB_URI` is correct
- Check IP whitelist includes deployment IP
- Ensure databases exist

**Temporal workflows failing:**
- Check Temporal server is running
- Verify worker is connected
- Check Temporal UI for workflow errors

**Web UI not loading:**
- Check web service logs
- Verify port 3000 is accessible
- Check Nginx gateway configuration

**CORS errors / API requests blocked:**
- Check browser console for "Access-Control-Allow-Origin" errors
- Verify `ALLOWED_ORIGINS` in `.env` includes your deployment hostname
- For EC2: Include the full EC2 public DNS (e.g., `http://ec2-X-X-X-X.compute-1.amazonaws.com:8506`)
- Rebuild affected services after changing `.env`: `docker compose up -d --build <service-name>`
- Check Nginx CORS whitelist in `docker/nginx/nginx.conf` includes your domain pattern

### Health Checks

```bash
# Gateway health
curl http://localhost:8080/health

# Individual service health
curl http://localhost:8001/health  # Temporal API
```

### Logs

```bash
# All logs
docker-compose -f docker/docker-compose.yml logs

# Specific service
docker-compose -f docker/docker-compose.yml logs -f web

# Last 100 lines
docker-compose -f docker/docker-compose.yml logs --tail=100 gateway
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB Atlas connection string | Yes |
| `AWS_ACCESS_KEY_ID` | AWS access key | Yes* |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Yes* |
| `AWS_REGION` | AWS region | Yes* |
| `GROQ_API_KEY` | Groq API key | For Temporal |
| `VOYAGE_API_KEY` | Voyage AI API key | For embeddings |
| `COHERE_API_KEY` | Cohere API key | For Cohere solution |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | For production |
| `WEB_PORT` | Web UI port | No (default: 3000) |
| `GATEWAY_PORT` | Gateway port | No (default: 8080) |

*Required for AWS Bedrock-based solutions

### ALLOWED_ORIGINS Examples

```bash
# Development (default if not set)
ALLOWED_ORIGINS=http://localhost:3100,http://localhost:3000

# Production - MongoDB.com
ALLOWED_ORIGINS=https://solutions.mongodb.com,https://partners.mongodb.com

# Production - Custom domain
ALLOWED_ORIGINS=https://myapp.example.com,https://admin.example.com
```
