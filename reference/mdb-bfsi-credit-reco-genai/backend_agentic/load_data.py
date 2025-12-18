# load this data in a new mongodb database
import os
import pandas as pd
from mdb_utils import get_mongo_client
from pymongo.operations import SearchIndexModel
import certifi
import json
from dotenv import load_dotenv
load_dotenv()


def get_index_config(index_name, col1):
    idxs = list(col1.list_search_indexes())
    for ele in idxs:
        if ele["name"] == index_name:
            return ele

# Access your database and collection
# Create your index model, then create the search index
search_index_model = SearchIndexModel(
  definition={
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 768,
        "similarity": "cosine"
      }
    ]
  },
  name="default",
  type="vectorSearch"
)

def load_data_mongodb():
    db = get_mongo_client()["bfsi-genai"]
    col1 = db["cc_products"]
    col2 = db["user_data"]

    # verify data exists
    if col1.count_documents({}) > 0:
        print("Data already exists in the collection.")
        return
    else:
        with open("data/user_data.json") as f:
            user_data_records = json.loads(f.read())

        with open("data/cc_products.json") as f:
            cc_products_records = json.loads(f.read())

    # Insert the records into the collections
        col1.insert_many(cc_products_records)
        col2.insert_many(user_data_records)


    # Create a vector search index on the embedding field
    # for the cc_products collection
    # Check if the index already exists
        index_name = "default"
        if not get_index_config(index_name=index_name, col1=col1):
            col1.create_search_index(
                model=search_index_model
            )
            while True:
                idx = get_index_config(index_name=index_name, col1=col1)
                if idx["queryable"]:
                    print("Vector search index created successfully.")
                    break
        else:
            print(f"Vector search index '{index_name}' already exists.")


# if __name__ == "__main__":
#     load_data_mongodb()