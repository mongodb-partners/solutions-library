from .tools import (web_search_tool,
                    create_grader_handoff_tool,
                    create_rewrite_handoff_tool)
from .utils import memory_saver
from langgraph.prebuilt import create_react_agent
from langgraph_swarm import create_handoff_tool, create_swarm
from functools import lru_cache
from langchain_core.language_models import BaseChatModel


def initialize_swarm_graph(model: BaseChatModel):
    eve = create_react_agent(
        model,
        [create_handoff_tool(agent_name="Bob", description="Eve to call Bob for any infromation Eve does not know or have, also Bob has access to real-time information or future data"),],
        prompt="You are Eve, an expert planning for what actions need to be taken to answer the user query and execute tasks. Do not make up answers and always rely on tools to fetch relevant information.",
        name="Eve",
    )

    bob = create_react_agent(
        model,
        [web_search_tool,
        create_rewrite_handoff_tool(model=model, agent_name="Bob", tool_name="Rewrite tool", tool_description="Bob use this tool to rewrite the question to be more specific and callback Bob to find relevant information"),
        create_grader_handoff_tool(model=model, generate_agent_name="George", rewrite_agent_name="Bob", tool_name="Grader tool", tool_description="Bob always ask to George to generate the final message to users question")
        ],
        prompt="You are Bob, you have access to web search and find information that you cannot find in private knowledgebase",
        name="Bob",
    )

    george = create_react_agent(
        model,
        [],  # No tools - George directly generates the final response
        prompt="You are George, the final response generator. Your job is to provide a helpful, clear, and complete answer to the user's question based on the conversation context and any information gathered by the other agents. Always provide a direct answer - never say you need to transfer to another agent.",
        name="George",
    )
    import os
    from pymongo import MongoClient
    client = MongoClient(os.getenv("MONGODB_URI"))
    db_name = "test_ckp_2"
    collection_name = "test_ckpt_2"
    collection = client[db_name][collection_name]

    workflow = create_swarm(
        [eve, bob, george],
        default_active_agent="Eve"
    )
    app = workflow.compile(checkpointer=memory_saver)

    return app
