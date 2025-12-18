import os
from pymongo import MongoClient
import certifi
from functools import lru_cache
from dotenv import load_dotenv
load_dotenv()

# ─── Constants ───────────────────────────────────────────────────────────────
MONGO_CONN = os.getenv("MONGO_CONNECTION_STRING")
DB_NAME = "bfsi-genai"
COLLECTION_NAME = "user_credit_response"

# ─── Persistence Helpers ─────────────────────────────────────────────────────
@lru_cache(1)
def get_mongo_client() -> MongoClient:
    return MongoClient(MONGO_CONN, tlsCAFile=certifi.where())