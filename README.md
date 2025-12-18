# MongoDB Partner Solutions Library

A public-facing storefront showcasing partner integrations with MongoDB Atlas. This production-grade application demonstrates how leading technology partners integrate with MongoDB for AI/LLM, event streaming, workflow orchestration, and semantic search use cases.

## Featured Partners

| Partner | Solution | Category |
|---------|----------|----------|
| **Temporal** | AI-Powered Fraud Detection | Workflow Orchestration |
| **Anthropic** | Intelligent Document Assistant | AI/LLM |
| **Cohere** | Semantic Search Engine | Semantic Search |
| **LangChain** | Multi-Agent Research Assistant | AI/LLM |
| **Confluent** | Real-time Customer 360 | Event Streaming |
| **Fireworks** | High-Performance AI Inference | AI/LLM |
| **TogetherAI** | Open-Source LLM Platform | AI/LLM |

## Quick Start

### Prerequisites

- Docker 24+ and Docker Compose v2
- MongoDB Atlas cluster
- API keys for partner services

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/mongodb-partners/solutions-library.git
cd solutions-library

# 2. Configure environment 
cp .env.example .env
# Edit .env with credentials

# 3. Run docker setup (Deploy everything and launch the app)
./scripts/docker_setup.sh
```


## Architecture

```
mongodb-solutions-library/
├── apps/web/           # React + LeafyGreen UI frontend
├── solutions/          # Partner solution configurations
├── reference/          # Reference implementations
├── docker/             # Docker Compose and Nginx config
└── docs/               # Documentation
```

## Development

### Frontend Development

```bash
cd apps/web
pnpm install
pnpm dev
```

### Running Individual Solutions

```bash
# Temporal Fraud Detection
docker-compose -f docker/docker-compose.yml up temporal-fraud-detection-ui

# View at http://localhost:8505
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and components
- [Adding Solutions](docs/ADDING_SOLUTIONS.md) - How to add new partner integrations
- [Deployment](docs/DEPLOYMENT.md) - Production deployment guide

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, LeafyGreen UI
- **Backend**: Python, FastAPI, Streamlit
- **Database**: MongoDB Atlas (Vector Search, Documents)
- **Infrastructure**: Docker, Docker Compose, Nginx

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the [Adding Solutions](docs/ADDING_SOLUTIONS.md) guide
4. Submit a pull request

## License

Apache License 2.0 - See [LICENSE](LICENSE) for details.

---

**MongoDB Partner Solutions Library** - Showcasing the power of MongoDB Atlas integrations.
