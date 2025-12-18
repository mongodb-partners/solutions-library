# MongoDB Partner Solutions Library - Architecture

## Overview

The MongoDB Partner Solutions Library is a public-facing storefront showcasing partner integrations with MongoDB Atlas. It demonstrates production-ready implementations across AI/LLM, event streaming, workflow orchestration, and semantic search categories.

## Architecture Diagram

```
                    +------------------+
                    |  Solutions       |
                    |  Library UI      |
                    |  (React/LG)      |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  API Gateway     |
                    |  (Nginx)         |
                    +--------+---------+
                             |
       +---------------------+---------------------+
       |           |           |           |       |
+------v--+ +------v--+ +------v--+ +------v--+   ...
|Temporal | |Anthropic| |Cohere   | |LangChain|
|Solution | |Solution | |Solution | |Solution |
+---------+ +---------+ +---------+ +---------+
       |           |           |           |
       +---------------------+---------------------+
                             |
                    +--------v---------+
                    |  MongoDB Atlas   |
                    |  (Shared Cluster)|
                    +------------------+
```

## Technology Stack

### Frontend (apps/web)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: LeafyGreen UI (MongoDB Design System)
- **Routing**: React Router v6
- **Styling**: CSS-in-JS with Emotion (LeafyGreen)

### Backend Solutions
- **Language**: Python 3.11+
- **API Frameworks**: FastAPI, Flask
- **UI Frameworks**: Streamlit, Gradio
- **Workflow Engine**: Temporal (for orchestration solutions)

### Database
- **Primary**: MongoDB Atlas
- **Features**: Document storage, Vector Search, ACID transactions
- **Configuration**: Shared cluster with separate databases per solution

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Gateway**: Nginx (reverse proxy, routing)

## Directory Structure

```
mongodb-solutions-library/
├── apps/
│   └── web/                          # Main Solutions Library UI
│       ├── src/
│       │   ├── components/           # React components
│       │   ├── pages/                # Route pages
│       │   ├── data/                 # Solution data
│       │   ├── types/                # TypeScript types
│       │   └── utils/                # Utilities
│       ├── Dockerfile
│       └── package.json
│
├── solutions/                        # Partner solution configurations
│   ├── temporal-fraud-detection/
│   ├── anthropic-doc-assistant/
│   ├── cohere-semantic-search/
│   ├── langchain-research-agent/
│   ├── confluent-customer360/
│   ├── fireworks-inference/
│   └── togetherai-opensource/
│
├── reference/                        # Reference implementations (read-only)
│   ├── maap-temporal-ai-agent-qs/    # Gold standard reference
│   ├── maap-anthropic-qs/
│   ├── maap-cohere-qs/
│   └── ...
│
├── docker/
│   ├── docker-compose.yml
│   └── nginx/
│       └── nginx.conf
│
└── docs/
    ├── ARCHITECTURE.md
    ├── ADDING_SOLUTIONS.md
    └── DEPLOYMENT.md
```

## Solution Metadata Schema

Each solution has a `solution.json` file defining its metadata:

```json
{
  "id": "solution-id",
  "name": "Solution Display Name",
  "partner": {
    "name": "Partner Name",
    "logo": "/logos/partner.svg",
    "website": "https://partner.com"
  },
  "description": "Short description",
  "longDescription": "Detailed description",
  "valueProposition": ["Value 1", "Value 2"],
  "technologies": ["Tech1", "MongoDB Atlas", "Vector Search"],
  "category": "AI/LLM",
  "demoUrl": "http://localhost:8505",
  "sourceUrl": "https://github.com/...",
  "ports": { "api": 8001, "ui": 8505 },
  "status": "active"
}
```

## Key Design Decisions

### 1. Modular Monorepo
- Single repository for easier management
- pnpm workspaces for dependency management
- Clear separation between UI and solutions

### 2. Reference Implementation Pattern
- `reference/` folder contains source implementations
- Solutions adapt and wrap these references
- Temporal solution used as-is (gold standard)

### 3. Separate Tab Demo Launch
- Demos open in new browser tabs
- Avoids iframe cross-origin issues
- Simpler user experience

### 4. Shared MongoDB Atlas Cluster
- One cluster, separate databases per solution
- Cost-effective while maintaining isolation
- Each solution manages its own collections

### 5. Docker Compose Deployment
- Single docker-compose.yml for all services
- Environment variables for configuration
- Nginx gateway for routing

## Network Architecture

### Docker Networks
- `solutions-network`: Main network for UI and gateway
- `temporal-network`: Isolated network for Temporal services

### Port Mapping
| Service | Internal Port | External Port |
|---------|--------------|---------------|
| Web UI | 3000 | 3000 |
| Gateway | 8080 | 8080 |
| Temporal API | 8000 | 8001 |
| Temporal UI | 8505 | 8505 |
| Temporal Server | 7233 | 7233 |
| Temporal Admin UI | 8080 | 8088 |

## Security Considerations

- No authentication (public storefront)
- Environment variables for secrets
- MongoDB Atlas IP whitelist required
- API keys stored in `.env` (not committed)
