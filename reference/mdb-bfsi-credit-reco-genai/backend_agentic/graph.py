"""Business logic and graph orchestration for credit recommendation agent."""

from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Dict

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.mongodb import MongoDBSaver

from dummy import PrepareDummyCols
from credit_rating import get_user_profile, get_model_feature_imps
from credit_score_expl import get_credit_score_expl
from credit_product_recommender import (
    get_credit_card_recommendations,
    get_final_user_profile_cc_rec,
)
from utils import CCrecommenderState
from mdb_utils import get_mongo_client, DB_NAME, COLLECTION_NAME

import logging

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def insert_response(doc: Dict[str, Any]) -> None:
    """Insert or update a user response document in MongoDB."""
    client = get_mongo_client()
    collection = client[DB_NAME][COLLECTION_NAME]
    collection.update_one({"user_id": doc["user_id"]}, {"$set": doc}, upsert=True)
    logger.info(
        "Inserted/Updated document for user_id: %s", doc["user_id"]
    )
    logger.info("Document: %s", doc)


def check_if_user_exists(state) -> str:
    """Check if the user exists in the database."""
    user_id = state["user_id"]
    client = get_mongo_client()
    collection = client[DB_NAME][COLLECTION_NAME]
    user = collection.find_one({"user_id": user_id})
    pred, _, _ = get_user_profile(user_id)
    if user and user.get("pred") == pred:
        logger.info("User %s exists in the database.", user_id)
        return "recommendations"  # Proceed to the next step
    logger.info("User %s does not exist in the database.", user_id)
    return "credit_profile"  # Proceed to create a new user profile


# ─── Business Logic Steps ───────────────────────────────────────────────────
def credit_rating_profile(state: CCrecommenderState) -> Dict[str, Any]:
    """Get the user profile, credit rating & explanations."""
    user_id = state["user_id"]
    pred, limit, raw_profile = get_user_profile(user_id)
    feat_imps = get_model_feature_imps()
    profile = get_credit_score_expl(
        raw_profile, pred, limit, feat_imps
    )

    insert_response({
        "user_id": user_id,
        "user_profile": profile,
        "user_profile_ip": raw_profile,
        "pred": pred,
        "allowed_credit_limit": limit,
    })
    logger.info(
        "Inserted/Updated document for user_id: %s", user_id
    )
    logger.info(
        "Document: {'user_id': %s, 'user_profile': %s, 'user_profile_ip': %s, 'pred': %s, "
        "'allowed_credit_limit': %s}",
        user_id, profile, raw_profile, pred, limit
    )
    return {
        "pred": pred,
        "allowed_credit_limit": limit,
        "user_profile_ip": raw_profile,
        "user_profile": profile,
    }


def recommendations_step(state: CCrecommenderState) -> Dict[str, Any]:
    """Generate credit card recommendations."""
    recs = get_credit_card_recommendations(
        user_profile=state["user_profile"],
        user_profile_ip=state["user_profile_ip"],
        pred=state["pred"],
        allowed_credit_limit=state["allowed_credit_limit"],
    )
    insert_response({
        "user_id": state["user_id"],
        "card_suggestions": recs.card_suggestions,
    })
    logger.info(
        "Inserted/Updated document for user_id: %s", state["user_id"]
    )
    logger.info(
        "Document: {'user_id': %s, 'card_suggestions': %s}",
        state["user_id"], recs.card_suggestions
    )
    return {"card_suggestions": recs.card_suggestions}


def rerank_step(state: CCrecommenderState) -> Dict[str, Any]:
    """Rerank and finalize user profile and recommendations."""
    final = get_final_user_profile_cc_rec(
        user_profile=state["user_profile"],
        user_profile_ip=state["user_profile_ip"],
        pred=state["pred"],
        allowed_credit_limit=state["allowed_credit_limit"],
        card_suggestions=state["card_suggestions"],
    )
    insert_response({
        "user_id": state["user_id"],
        "final_recommendations": final.model_dump(),
    })
    return {"final_recommendations": final}


def validate_step(state: CCrecommenderState) -> Dict[str, Any]:
    """Validate & persist to MongoDB."""
    base_doc = {
        "user_id": state["user_id"],
        "timestamp": datetime.now(timezone.utc),
    }

    if "final_recommendations" not in state:
        doc = {**base_doc, "response": "Recommendations invalid"}
        insert_response(doc)
        return {"response": doc["response"]}

    final = state["final_recommendations"]

    def serialize(card: Any) -> Any:
        return (
            card.model_dump()
            if hasattr(card, "model_dump")
            else card
        )

    serialized = [serialize(c) for c in final.cards]
    doc = {
        **base_doc,
        "response": "Recommendations valid",
        "final_recommendations": serialized,
        "user_profile": state["user_profile"],
        "user_profile_ip": state["user_profile_ip"],
        "pred": state["pred"],
        "allowed_credit_limit": state["allowed_credit_limit"],
    }
    insert_response(doc)
    return {
        "response": doc["response"],
        "final_recommendations": final,
        "user_profile": state["user_profile"],
        "user_profile_ip": state["user_profile_ip"],
        "pred": state["pred"],
        "allowed_credit_limit": state["allowed_credit_limit"],
    }


def should_end(state: CCrecommenderState) -> str:
    """Determine if the workflow should end."""
    return END if state.get("response") else "recommendations"


# ─── App Factory ────────────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def get_app():
    """Create and return the compiled StateGraph app."""
    graph = StateGraph(CCrecommenderState)
    graph.add_node("credit_profile", credit_rating_profile)
    graph.add_node("recommendations", recommendations_step)
    graph.add_node("rerank", rerank_step)
    graph.add_node("validate", validate_step)

    graph.add_conditional_edges(
        START,
        check_if_user_exists,
        ["credit_profile", "recommendations"],
    )
    graph.add_edge("credit_profile", "recommendations")
    graph.add_edge("recommendations", "rerank")
    graph.add_edge("rerank", "validate")
    graph.add_conditional_edges(
        "validate",
        should_end,
        ["recommendations", END],
    )

    saver = MongoDBSaver(get_mongo_client())
    return graph.compile(checkpointer=saver)


# ─── Main ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    USER_ID = 8625
    inputs = {"user_id": USER_ID}
    config = {"recursion_limit": 15, "configurable": {"thread_id": USER_ID}}

    response = get_app().invoke(inputs, config=config)
    # for event in get_app().stream(inputs, config=config):
    #     for key, val in event.items():
    #         if key != "__end__":
    #             logger.info(val)
    #             response = val

    # print final output
    if response and "final_recommendations" in response:
        print("\n-- Cards --")
        for c in response["final_recommendations"].cards:
            print(c.model_dump_json())
        print("\n-- Profile --")
        print(response["user_profile"])
