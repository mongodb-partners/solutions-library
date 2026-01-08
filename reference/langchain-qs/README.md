# LangChain Multi-Agent RAG System

A Multi-Agent Retrieval Augmented Generation (RAG) system built with LangChain, LangGraph, MongoDB Atlas Vector Search, and AWS Bedrock Claude models.

## Architecture

This system implements a **swarm-based multi-agent architecture** where specialized agents collaborate to answer user queries:

### Agent Roles

| Agent | Role | Capabilities |
|-------|------|--------------|
| **Eve** | Planner | Routes queries to appropriate agents, orchestrates workflow |
| **Bob** | Researcher | Web search via Tavily, document retrieval, relevance grading |
| **George** | Responder | Generates final user-facing responses based on gathered context |

### Workflow

```
User Query → Eve (Planning) → Bob (Research & Retrieval) → George (Response Generation)
```

1. **Eve** receives the query and determines if external information is needed
2. **Bob** searches the web (Tavily), loads documents into MongoDB Atlas Vector Search, and grades relevance
3. **George** generates a comprehensive response based on the gathered context

![Architecture](app/static/agents_nodes_graph.png)

## Tech Stack

- **LLM Provider**: AWS Bedrock (Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 models)
- **Framework**: LangChain, LangGraph, LangGraph-Swarm
- **Vector Store**: MongoDB Atlas Vector Search
- **Embeddings**: AWS Bedrock Cohere Embed English v3
- **Web Search**: Tavily API
- **UI**: Streamlit
- **Checkpointing**: MongoDB (conversation persistence)

## Prerequisites

- Python 3.11+
- AWS Account with Bedrock access (Claude models enabled)
- MongoDB Atlas cluster
- Tavily API key

## Environment Variables

Create a `.env` file with the following:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/
MONGODB_DB=langchain_research_agent
MONGODB_COLLECTION=documents

# AWS Bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Tavily (Web Search)
TAVILY_API_KEY=your_tavily_api_key
```

## Installation

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd langchain-qs

# Install dependencies
pip install -r requirements.txt

# Run the Streamlit app
streamlit run app/app.py --server.port 8505
```

### Docker

```bash
# Build and run with Docker Compose (from solutions-library root)
docker compose -f docker/docker-compose.yml up langchain-research-agent langchain-nginx

# Access at http://localhost:8504
```

## Available Models

The application supports the following AWS Bedrock Claude models:

| Model | Description | Use Case |
|-------|-------------|----------|
| Claude 3.5 Sonnet v2 | Latest, most capable | Recommended for best results |
| Claude 3.5 Haiku | Fast and efficient | Quick responses, lower cost |
| Claude 3 Haiku | Budget option | Cost-effective for simple queries |
| Claude 3 Sonnet | Balanced performance | Good all-around choice |

Select your preferred model from the sidebar in the UI.

## Usage

1. Open the application at `http://localhost:8504` (Docker) or `http://localhost:8505` (local)
2. Select your preferred Claude model from the sidebar
3. Enter your username (used for conversation persistence)
4. Ask questions in the chat input

### Example Queries

- "What is MongoDB Atlas?"
- "Explain vector search"
- "What are the benefits of multi-agent AI systems?"

## Features

- **Multi-Agent Collaboration**: Specialized agents work together for better responses
- **Web Search Integration**: Real-time information retrieval via Tavily
- **Vector Search**: Semantic document retrieval using MongoDB Atlas
- **Conversation Persistence**: Chat history saved to MongoDB
- **Model Selection**: Choose from multiple Claude models
- **Streaming Responses**: See agent activity in real-time

## Project Structure

```
langchain-qs/
├── app/
│   ├── app.py              # Streamlit UI
│   ├── swarm/
│   │   ├── graph.py        # Multi-agent swarm configuration
│   │   ├── tools.py        # Agent tools (search, grading, handoffs)
│   │   └── utils.py        # LLM, embeddings, vector store setup
│   └── static/             # Images and assets
├── requirements.txt
├── Dockerfile
├── nginx.conf              # Reverse proxy configuration
└── README.md
```

## Security

### Container Security
- Runs as non-root user in Docker
- Nginx reverse proxy for HTTP request handling

### Application Security
- Environment variables for sensitive configuration
- MongoDB Atlas IP Access List recommended
- CORS configured via nginx

### Dependency Security
- `pymongo>=4.10.1` - CVE-2024-5629 fix
- `langchain>=0.3.26`, `langchain-core>=0.3.29` - Security patches
- All dependencies pinned to secure minimum versions

## Troubleshooting

### Empty Responses
If George returns empty responses, clear the MongoDB checkpoint data:
```python
from pymongo import MongoClient
client = MongoClient("your_connection_string")
client["checkpointing_db"]["checkpoints"].delete_many({})
client["checkpointing_db"]["checkpoint_writes"].delete_many({})
```

### Vector Search Index
The application automatically creates a vector search index named `default`. If you encounter issues:
1. Check MongoDB Atlas console for index status
2. Ensure the index has `numDimensions: 1024` and `similarity: cosine`

### AWS Bedrock Access
Ensure your AWS credentials have access to Bedrock and the Claude models are enabled in your region.

## API Reference

The agents use the following tools:

| Tool | Agent | Description |
|------|-------|-------------|
| `transfer_to_bob` | Eve | Hand off query to Bob for research |
| `web_search_tool` | Bob | Search web and load docs into vector store |
| `handoff_to_agent` (Grader) | Bob | Grade document relevance, hand off to George |

## Contributing

Contributions are welcome! Please submit a Pull Request.

## License

MIT License
