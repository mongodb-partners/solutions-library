# Adding New Solutions to the MongoDB Partner Solutions Library

This guide explains how to add a new partner solution to the Solutions Library.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ and pnpm installed
- Access to MongoDB Atlas cluster
- API keys for the partner service

## Step-by-Step Guide

### Step 1: Create Solution Directory

Create a new directory under `solutions/`:

```bash
mkdir -p solutions/your-solution-name
```

### Step 2: Create solution.json

Create `solutions/your-solution-name/solution.json`:

```json
{
  "id": "your-solution-id",
  "name": "Your Solution Name",
  "partner": {
    "name": "Partner Name",
    "logo": "/logos/partner.svg",
    "website": "https://partner.com"
  },
  "description": "A brief description of what this solution does.",
  "longDescription": "A detailed description explaining the solution's capabilities, architecture, and use cases.",
  "valueProposition": [
    "Key benefit 1",
    "Key benefit 2",
    "Key benefit 3",
    "Key benefit 4"
  ],
  "technologies": [
    "Partner Technology",
    "MongoDB Atlas",
    "Vector Search",
    "Python",
    "FastAPI"
  ],
  "category": "AI/LLM",
  "demoUrl": "http://localhost:YOUR_PORT",
  "sourceUrl": "https://github.com/your-repo",
  "documentation": "/docs/your-solution",
  "ports": {
    "api": YOUR_API_PORT,
    "ui": YOUR_UI_PORT
  },
  "status": "active"
}
```

### Step 3: Add Partner Logo

Place the partner logo in `public/logos/`:

```bash
# SVG format preferred
cp partner-logo.svg public/logos/partner.svg
```

### Step 4: Create Backend Service

If adapting from a reference implementation:

```bash
# Copy and adapt from reference
cp -r reference/existing-impl/* solutions/your-solution-name/backend/
```

Create a `Dockerfile` for the solution:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Default command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Step 5: Update Solutions Data

Add the solution to `apps/web/src/data/solutions.ts`:

```typescript
export const solutions: Solution[] = [
  // ... existing solutions
  {
    id: 'your-solution-id',
    name: 'Your Solution Name',
    partner: {
      name: 'Partner Name',
      logo: '/logos/partner.svg',
      website: 'https://partner.com',
    },
    description: 'Brief description',
    // ... rest of the solution data
  },
];
```

### Step 6: Add to Docker Compose

Update `docker/docker-compose.yml`:

```yaml
services:
  # ... existing services

  your-solution-api:
    build:
      context: ../solutions/your-solution-name
      dockerfile: Dockerfile
    ports:
      - "${YOUR_API_PORT:-8010}:8000"
    env_file:
      - ../.env
    environment:
      - PYTHONUNBUFFERED=1
    networks:
      - solutions-network
    restart: unless-stopped

  your-solution-ui:
    build:
      context: ../solutions/your-solution-name
      dockerfile: Dockerfile
    command: streamlit run app.py --server.port 8505 --server.address 0.0.0.0
    ports:
      - "${YOUR_UI_PORT:-8510}:8505"
    env_file:
      - ../.env
    depends_on:
      - your-solution-api
    networks:
      - solutions-network
    restart: unless-stopped
```

### Step 7: Update Nginx Configuration

Add routing rules to `docker/nginx/nginx.conf`:

```nginx
upstream your-solution-api {
    server your-solution-api:8000;
}

upstream your-solution-ui {
    server your-solution-ui:8505;
}

# In the server block:
location /api/solutions/your-solution-id/ {
    rewrite ^/api/solutions/your-solution-id/(.*)$ /$1 break;
    proxy_pass http://your-solution-api;
    # ... proxy headers
}

location /solutions/your-solution-id/demo/ {
    rewrite ^/solutions/your-solution-id/demo/(.*)$ /$1 break;
    proxy_pass http://your-solution-ui;
    # ... proxy headers for websocket support
}
```

### Step 8: Update Environment Variables

Add required variables to `.env.example`:

```bash
# Your Solution Configuration
YOUR_SOLUTION_API_KEY=your_api_key_here
YOUR_SOLUTION_DB_NAME=your_solution_db
YOUR_API_PORT=8010
YOUR_UI_PORT=8510
```

### Step 9: Test Locally

```bash
# Build and start services
docker-compose -f docker/docker-compose.yml up --build

# Verify the solution is accessible
curl http://localhost:YOUR_API_PORT/health
```

### Step 10: Update Documentation

Create documentation at `docs/your-solution.md`:

```markdown
# Your Solution Name

## Overview
Description of the solution...

## Architecture
How it works...

## Configuration
Required environment variables...

## Usage
How to use the demo...
```

## Solution Categories

When adding a solution, use one of these categories:
- `AI/LLM` - AI and Large Language Model integrations
- `Event Streaming` - Real-time data streaming solutions
- `Workflow Orchestration` - Workflow and process automation
- `Semantic Search` - Vector search and embeddings
- `Data Processing` - Data transformation and analytics

## Best Practices

1. **Consistent Port Allocation**: Use ports in the 80XX range, incrementing for each solution
2. **Health Checks**: Implement `/health` endpoint for all services
3. **Environment Variables**: Never hardcode secrets, use `.env`
4. **Logging**: Use structured logging with appropriate log levels
5. **Documentation**: Include clear README and usage examples
6. **Error Handling**: Implement proper error handling and user-friendly messages

## Checklist

- [ ] Created `solutions/your-solution/` directory
- [ ] Created `solution.json` with complete metadata
- [ ] Added partner logo to `public/logos/`
- [ ] Created backend service with Dockerfile
- [ ] Added solution to `apps/web/src/data/solutions.ts`
- [ ] Updated `docker/docker-compose.yml`
- [ ] Updated `docker/nginx/nginx.conf`
- [ ] Added environment variables to `.env.example`
- [ ] Tested locally with Docker
- [ ] Created documentation
