# Docker Setup for MongoDB Partner Solutions Library

## Quick Start

```bash
# From the repository root
cd docker
./setup.sh
```

Or manually:

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start all services
docker compose up -d --build

# 3. Wait for services to initialize
sleep 30

# 4. Run data seeding (for Anthropic vector search)
cd reference/maap-anthropic-qs
pip install pymongo python-dotenv
python mongodb_create_vectorindex.py

# 5. Run Temporal Fraud Detection MongoDB setup (inside container)
docker compose exec -T temporal-fraud-detection-api python -m scripts.setup_mongodb
```

## Services & Ports

| Service | Port | URL |
|---------|------|-----|
| Web UI | 3100 | http://localhost:3100 |
| Anthropic Document Assistant | 8502 | http://localhost:8502 |
| Cohere Semantic Search | 8503 | http://localhost:8503 |
| LangChain Research Agent | 8504 | http://localhost:8504 |
| Temporal Fraud Detection | 8505 | http://localhost:8505 |
| Fireworks Credit Reco | 8506 | http://localhost:8506 |
| TogetherAI Chat | 8507 | http://localhost:8507 |
| Temporal Admin UI | 8088 | http://localhost:8088 |
| API Gateway | 8080 | http://localhost:8080 |

## Required Environment Variables

The `.env` file must contain:

```bash
# MongoDB Connection
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/  # Alias for Cohere
MONGODB_DB=langchain_research_agent  # Required by LangChain

# API Keys (get from respective providers)
COHERE_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
FIREWORKS_API_KEY=your_key
TOGETHER_API_KEY=your_key
GROQ_API_KEY=your_key
AWS_REGION=us-east-1
```

## Architecture Notes

### Service Communication

Services communicate using Docker network hostnames (service names from docker-compose.yml):

| Frontend | Backend Hostname | Env Variable |
|----------|------------------|--------------|
| Anthropic UI | `anthropic-main:8000`, `anthropic-loader:8001`, `anthropic-logger:8181` | Hardcoded in source |
| Fireworks Frontend | `fireworks-backend:5001` | `NEXT_PUBLIC_API_URL` |
| TogetherAI Frontend | `togetherai-backend:8000` | `BACKEND_URL` |
| Temporal UI | `temporal-fraud-detection-api:8000` | `API_BASE_URL` |

### Source Code Fixes Applied

The following fixes were applied to reference implementations for Docker compatibility:

#### 1. Anthropic UI (`reference/maap-anthropic-qs/MAAP-AWS-Anthropic/ui/main.py`)
```python
# Changed from original hostnames to docker service names:
# logger:8181 -> anthropic-logger:8181
# main:8000 -> anthropic-main:8000
# loader:8001 -> anthropic-loader:8001
```

#### 2. Anthropic Nginx (`reference/maap-anthropic-qs/MAAP-AWS-Anthropic/nginx/nginx.conf`)
```nginx
# Changed upstream from:
# server ui:7860;
# To:
# server anthropic-ui:7860;
```

#### 3. LangChain (`reference/langchain-qs/app/swarm/tools.py`)
```python
# Fixed deprecated imports:
# from langchain.prompts import PromptTemplate
# To:
# from langchain_core.prompts import PromptTemplate
```

#### 4. Anthropic Requirements (`reference/maap-anthropic-qs/MAAP-AWS-Anthropic/ui/requirements.txt`)
```
# Pin Gradio to 5.x for compatibility:
gradio>=5.0.0,<6.0.0
```

#### 5. Fireworks Backend (`docker/docker-compose.yml`)
```yaml
# Added MONGO_CONNECTION_STRING env var (backend expects this instead of MONGODB_URI):
environment:
  - MONGO_CONNECTION_STRING=${MONGODB_URI}
```

#### 6. LangChain (`docker/docker-compose.yml`)
```yaml
# Added MONGODB_COLLECTION env var (required by the app):
environment:
  - MONGODB_COLLECTION=rag
```

#### 7. Cohere Setup Script (`reference/maap-cohere-qs/deployment/mongodb_create_vectorindex.py`)
```python
# Changed hardcoded URI to use environment variable:
# From: MONGODB_URI = "mongodb+srv://cohere:pass123@..."
# To: MONGODB_URI = os.getenv("MONGO_URI")
```

#### 8. Fireworks Frontend (`reference/mdb-bfsi-credit-reco-genai/frontend`)
```javascript
// Changed API URL from Docker-internal hostname to dynamic hostname detection
// Login.js and pages/index.js - browser requests need public host, not Docker network hostname
// From: const apiUrl = process.env.NEXT_PUBLIC_API_URL + '/login';
// To: const host = window.location.hostname; const apiUrl = `http://${host}:8006/login`;
```

#### 9. Fireworks Frontend MongoDB Client (`reference/mdb-bfsi-credit-reco-genai/frontend/lib/mongodb.js`)
```javascript
// Added missing MongoDB client library for Next.js API routes
// Required for /api/findOne endpoint to fetch user profile data
```

#### 10. Fireworks Model Update (`.env`)
```bash
# Updated deprecated model to available version:
# From: FIREWORKS_MODEL_ID=accounts/fireworks/models/llama-v3p1-70b-instruct
# To: FIREWORKS_MODEL_ID=accounts/fireworks/models/llama-v3p3-70b-instruct
```

#### 11. LangChain Model Updates (`reference/langchain-qs/app/app.py`, `app/swarm/utils.py`)
```python
# Updated deprecated Fireworks models to available versions:
# llama-v3p1-405b-instruct -> llama-v3p3-70b-instruct (default)
# llama-v3p1-70b-instruct -> mixtral-8x22b-instruct
# mixtral-8x7b-instruct -> qwen3-235b-a22b
# qwen2p5-72b-instruct -> deepseek-v3-0324
```

#### 12. LangChain Static File Serving (`reference/langchain-qs/app/.streamlit/config.toml`)
```toml
# Added Streamlit config to enable static file serving for images
[server]
enableStaticServing = true
```

#### 13. LangChain Image Paths (`reference/langchain-qs/app/app.py`)
```python
# Fixed image paths for Streamlit static serving:
# From: ./static/MDB-langchain.jpg
# To: /app/static/MDB-langchain.jpg
# Also fixed missing image reference: legal_advisor_iteration1.jpg -> display-image.jpg
```

#### 14. Cohere Model Update (`reference/maap-cohere-qs/backend.py`)
```python
# Updated deprecated Cohere model to available version:
# From: model="command-r-plus"
# To: model="command-r-plus-08-2024"
```

## Data Seeding

### Anthropic Solution
The Anthropic solution requires vector search indexes. Run:

```bash
cd reference/maap-anthropic-qs
python mongodb_create_vectorindex.py
```

This creates:
- `travel_agency.trip_recommendation` - vector_index, travel_text_search_index
- `maap_data_loader.document` - document_vector_index, document_text_search_index

### Temporal Fraud Detection Solution
The Temporal solution requires MongoDB collections, indexes, and vector search. Run inside the container:

```bash
docker compose exec -T temporal-fraud-detection-api python -m scripts.setup_mongodb
```

This creates:
- Collections: customers, transactions, transaction_decisions, human_reviews, audit_events, notifications, system_metrics, rules, accounts, transaction_journal, balance_updates, balance_holds
- Regular indexes for all collections
- Vector search index: `transaction_vector_index` on transactions collection
- Sample test data for fraud detection scenarios

### Fireworks Credit Recommendation Solution
The Fireworks backend **automatically loads data on startup** when `MONGO_CONNECTION_STRING` is properly set. It creates:
- Database: `bfsi-genai`
- Collections: `cc_products`, `user_data`, `user_credit_response`
- Vector search index: `default` on cc_products collection (768 dimensions)

No manual setup required - data is loaded automatically when the container starts.

### Cohere Semantic Search Solution
The Cohere solution requires vector search indexes and sample data. Run:

```bash
cd reference/maap-cohere-qs/deployment
python mongodb_create_vectorindex.py
```

This creates:
- Database: `asset_management_use_case`
- Collection: `market_reports` with 67 sample documents
- Vector search index: `vector_index` (1024 dimensions for Cohere embeddings)

### LangChain Research Agent Solution
The LangChain solution creates its vector search index dynamically when users load documents. No manual setup required - users can load URLs/documents through the Streamlit UI.

### Other Solutions
Other solutions may require their own data seeding. Check each solution's README.

## Troubleshooting

### "Temporary failure in name resolution"
This means a container can't reach another service. Check:
1. All containers are running: `docker compose ps`
2. Containers are on the same network
3. Service names match docker-compose service names

### "Internal Server Error" on Anthropic
Usually means vector search indexes aren't created. Run the seeding script.

### Container keeps restarting
Check logs: `docker logs <container-name>`

Common issues:
- Missing environment variables
- Dependency version conflicts
- Database connection issues

## Rebuilding Individual Services

```bash
# Rebuild specific service
docker compose build --no-cache <service-name>
docker compose up -d <service-name>

# Example for Anthropic UI
docker compose build --no-cache anthropic-ui
docker compose up -d anthropic-ui
```
