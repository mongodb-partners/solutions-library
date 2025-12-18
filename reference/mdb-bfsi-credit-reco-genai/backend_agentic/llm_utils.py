from langchain_fireworks import ChatFireworks
from langchain.tools.retriever import create_retriever_tool
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_community.embeddings import HuggingFaceInstructEmbeddings
from pymongo import MongoClient
import certifi
from dotenv import load_dotenv
load_dotenv()
import os

from mdb_utils import get_mongo_client

# embedding model
repo_id = "hkunlp/instructor-base"
hf = HuggingFaceInstructEmbeddings(model_name=repo_id)
hf.embed_instruction = "Represent the description to find most relevant credit cards as per provided Credit health:"

client = get_mongo_client()
collection = client["bfsi-genai"]["cc_products"]

vector_store = MongoDBAtlasVectorSearch(
    collection=collection,
    embedding=hf,
)

retriever = vector_store.as_retriever(search_type='similarity', search_kwargs={'k': 25})
retriever_tool = create_retriever_tool(
    retriever=retriever,
    name="credit card product retriever",
    description="Retrieve credit card products based given user profile and credit score.", 
)

llm = ChatFireworks(
    model=os.environ.get("FIREWORKS_MODEL_ID"),
    temperature=0.1,
    max_tokens=4096
)
