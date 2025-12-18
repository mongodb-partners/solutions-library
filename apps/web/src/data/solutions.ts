import { Solution } from '../types';

export const solutions: Solution[] = [
  {
    id: 'temporal-fraud-detection',
    name: 'AI-Powered Fraud Detection',
    partner: {
      name: 'Temporal',
      logo: '/logos/temporal.svg',
      website: 'https://temporal.io',
    },
    description:
      'Enterprise-grade financial fraud detection combining MongoDB Atlas vector search, Temporal workflows, and AI for real-time transaction analysis.',
    longDescription:
      'This solution demonstrates a complete fraud detection pipeline that processes financial transactions through an AI-powered decision system. It combines rule-based evaluation, vector similarity search for pattern matching, and advanced AI analysis to provide real-time approve/reject decisions with detailed reasoning.',
    valueProposition: [
      'Durable workflow execution for mission-critical processes',
      'Hybrid AI + vector search approach for advanced fraud detection',
      'Complete audit trails with explainable AI reasoning',
      'Human-in-the-loop escalation workflows',
    ],
    technologies: ['Temporal', 'MongoDB Atlas', 'Vector Search', 'AWS Bedrock', 'Python', 'FastAPI', 'Streamlit'],
    category: 'Workflow Orchestration',
    demoUrl: 'http://localhost:8505',
    sourceUrl: 'https://github.com/mongodb-partners/maap-temporal-ai-agent-qs',
    documentation: '/docs/temporal-fraud-detection',
    ports: { api: 8001, ui: 8505 },
    status: 'active',
    featured: true,
  },
  {
    id: 'anthropic-doc-assistant',
    name: 'Intelligent Document Assistant',
    partner: {
      name: 'Anthropic',
      logo: '/logos/anthropic.svg',
      website: 'https://anthropic.com',
    },
    description:
      'Enterprise AI assistant powered by Claude with MongoDB Atlas Vector Search for document Q&A and RAG-based retrieval.',
    longDescription:
      'Build intelligent document processing workflows with Claude AI. This solution showcases semantic search across documents, context-aware question answering, and multi-modal support for enterprise knowledge management.',
    valueProposition: [
      'Persistent memory with semantic search',
      'Document Q&A with RAG architecture',
      'Multi-modal support for text and images',
      'Enterprise-ready with user data isolation',
    ],
    technologies: ['Claude', 'MongoDB Atlas', 'Vector Search', 'AWS Bedrock', 'Python', 'FastAPI'],
    category: 'AI/LLM',
    demoUrl: 'http://localhost:8502',
    sourceUrl: 'https://github.com/mongodb-partners/maap-anthropic-qs',
    documentation: '/docs/anthropic-doc-assistant',
    ports: { api: 8002, ui: 8502 },
    status: 'active',
    featured: true,
  },
  {
    id: 'cohere-semantic-search',
    name: 'Semantic Search Engine',
    partner: {
      name: 'Cohere',
      logo: '/logos/cohere.svg',
      website: 'https://cohere.com',
    },
    description:
      'Semantic search with Cohere embeddings and MongoDB Atlas Vector Search for intelligent content discovery.',
    longDescription:
      'Implement powerful semantic search capabilities using Cohere embeddings. This solution demonstrates embedding generation, vector indexing, and reranking for highly relevant search results across large document collections.',
    valueProposition: [
      'State-of-the-art embeddings with Cohere',
      'Reranking for improved result relevance',
      'Scalable vector search with MongoDB Atlas',
      'RAG-ready architecture',
    ],
    technologies: ['Cohere', 'MongoDB Atlas', 'Vector Search', 'Python', 'Streamlit'],
    category: 'Semantic Search',
    demoUrl: 'http://localhost:8503',
    sourceUrl: 'https://github.com/mongodb-partners/maap-cohere-qs',
    documentation: '/docs/cohere-semantic-search',
    ports: { api: 8503, ui: 8503 },
    status: 'active',
  },
  {
    id: 'langchain-research-agent',
    name: 'Multi-Agent Research Assistant',
    partner: {
      name: 'LangChain',
      logo: '/logos/langchain.svg',
      website: 'https://langchain.com',
    },
    description:
      'Composable AI applications with LangChain and LangGraph for multi-agent workflows, using MongoDB as memory and vector store.',
    longDescription:
      'Build sophisticated multi-agent systems with LangChain ecosystem. This solution demonstrates agent collaboration, dynamic LLM model switching, and graph-based workflow orchestration for complex research tasks.',
    valueProposition: [
      'Multi-agent collaboration with LangGraph',
      'Flexible LLM model selection',
      'MongoDB as persistent memory store',
      'Composable agent architecture',
    ],
    technologies: ['LangChain', 'LangGraph', 'MongoDB Atlas', 'Vector Search', 'Python', 'Streamlit'],
    category: 'AI/LLM',
    demoUrl: 'http://localhost:8504',
    sourceUrl: 'https://github.com/mongodb-partners/langchain-qs',
    documentation: '/docs/langchain-research-agent',
    ports: { api: 8504, ui: 8504 },
    status: 'active',
  },
  {
    id: 'confluent-customer360',
    name: 'Real-time Customer 360',
    partner: {
      name: 'Confluent',
      logo: '/logos/confluent.svg',
      website: 'https://confluent.io',
    },
    description:
      'Event-driven analytics with Confluent Kafka and MongoDB Atlas for real-time data synchronization and customer insights.',
    longDescription:
      'Build real-time customer data platforms using Confluent Kafka. This solution demonstrates event streaming, data synchronization, and AI-powered chatbot integration for unified customer views.',
    valueProposition: [
      'Real-time event streaming with Kafka',
      'Unified customer data view',
      'AI-powered query processing',
      'Scalable event-driven architecture',
    ],
    technologies: ['Confluent', 'Kafka', 'MongoDB Atlas', 'Flink', 'Python', 'React'],
    category: 'Event Streaming',
    demoUrl: '',
    sourceUrl: 'https://github.com/mongodb-partners/maap-confluent-qs',
    documentation: '/docs/confluent-customer360',
    ports: { api: 8005, ui: 8508 },
    status: 'coming-soon',
  },
  {
    id: 'fireworks-inference',
    name: 'High-Performance AI Inference',
    partner: {
      name: 'Fireworks',
      logo: '/logos/fireworks.svg',
      website: 'https://fireworks.ai',
    },
    description:
      'Cost-effective, high-throughput AI inference with Fireworks AI and MongoDB for structured outputs and function calling.',
    longDescription:
      'Demonstrate fast AI inference at scale with Fireworks AI. This solution showcases credit scoring, product recommendations, and agentic workflows with optimized inference performance.',
    valueProposition: [
      'High-throughput AI inference',
      'Cost-effective model hosting',
      'Structured output generation',
      'Agentic workflow support',
    ],
    technologies: ['Fireworks AI', 'MongoDB Atlas', 'LangChain', 'Python', 'Flask', 'React'],
    category: 'AI/LLM',
    demoUrl: 'http://localhost:8506',
    sourceUrl: 'https://github.com/mongodb-partners/mdb-bfsi-credit-reco-genai',
    documentation: '/docs/fireworks-inference',
    ports: { api: 8006, ui: 8506 },
    status: 'active',
  },
  {
    id: 'togetherai-opensource',
    name: 'Open-Source LLM Platform',
    partner: {
      name: 'TogetherAI',
      logo: '/logos/togetherai.svg',
      website: 'https://together.ai',
    },
    description:
      'Flexible, cost-effective AI with open-source models using TogetherAI and MongoDB for multi-agent collaboration.',
    longDescription:
      'Build AI applications with open-source models through TogetherAI. This solution demonstrates multi-agent collaboration, ensemble model responses, and strategic decision support.',
    valueProposition: [
      'Open-source model flexibility',
      'Multi-agent ensemble responses',
      'Cost-effective AI deployment',
      'Domain-specialized LLM collaboration',
    ],
    technologies: ['TogetherAI', 'MongoDB Atlas', 'Python', 'Gradio'],
    category: 'AI/LLM',
    demoUrl: 'http://localhost:8507',
    sourceUrl: 'https://github.com/mongodb-partners/maap-together-qs',
    documentation: '/docs/togetherai-opensource',
    ports: { api: 8007, ui: 8507 },
    status: 'active',
  },
];

export const getPartners = (): string[] => {
  return [...new Set(solutions.map((s) => s.partner.name))];
};

export const getCategories = (): string[] => {
  return [...new Set(solutions.map((s) => s.category))];
};

export const getSolutionById = (id: string): Solution | undefined => {
  return solutions.find((s) => s.id === id);
};

export const filterSolutions = (filter: {
  search?: string;
  category?: string;
  partner?: string;
}): Solution[] => {
  return solutions.filter((solution) => {
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const matchesSearch =
        solution.name.toLowerCase().includes(searchLower) ||
        solution.description.toLowerCase().includes(searchLower) ||
        solution.technologies.some((t) => t.toLowerCase().includes(searchLower)) ||
        solution.partner.name.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    if (filter.category && solution.category !== filter.category) {
      return false;
    }

    if (filter.partner && solution.partner.name !== filter.partner) {
      return false;
    }

    return true;
  });
};
