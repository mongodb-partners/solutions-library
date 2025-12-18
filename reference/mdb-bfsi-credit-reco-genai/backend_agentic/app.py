"""
Flask application for BFSI credit recommendation and scoring.
"""

import json
import os

from dotenv import load_dotenv
import pandas as pd
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from dummy import PrepareDummyCols
from credit_rating import col
from stat_score_util import calculate_credit_score, calculate_percentile_given_value
from mdb_utils import DB_NAME, COLLECTION_NAME, get_mongo_client
from graph import get_app

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


@app.route("/login", methods=["POST"])
def login():
    """Authenticate user and invoke agentic graph on success."""
    data = request.get_json()
    user_id = int(data["userId"])
    password = data["password"]

    df = pd.DataFrame.from_records(
        col.find({"Customer_ID": user_id}, {"_id": 0})
    )

    if not df.empty and df["Name"].str.split().str[0].str.lower().iloc[0] == password.lower():
        # get_app().ainvoke(
        #     {"user_id": user_id},
        #     config={"recursion_limit": 15, "configurable": {"thread_id": user_id}},
        # )
        return jsonify({"message": "Login Successful"})

    return Response(json.dumps({"message": "Login Failed"}), status=403)


@app.route("/credit_score/<int:user_id>", methods=["GET"])
def get_credit_score(user_id):
    """Retrieve stored credit response or return 404."""
    client = get_mongo_client()
    collection = client[DB_NAME][COLLECTION_NAME]
    print(collection.find_one({}))
    print("Fetching credit score for user_id:", user_id)
    state = collection.find_one({"user_id": user_id}, {"_id": 0})
    state = get_app().invoke(
        {"user_id": user_id},
        config={"recursion_limit": 15, "configurable": {"thread_id": user_id}},
    )
    if state is None:
        return Response(json.dumps({"message": "User not found"}), status=404)

    user_profile = state["user_profile"]
    pred = state["pred"]
    allowed_limit = state["allowed_credit_limit"]
    profile_ip = state["user_profile_ip"]

    features, score = traditional_credit_score(profile_ip)
    return jsonify({
        "userProfile": user_profile,
        "userCreditProfile": pred,
        "allowedCreditLimit": allowed_limit,
        "scoreCardCreditScore": score,
        "scorecardScoreFeatures": features,
        "userId": user_id,
    })


def traditional_credit_score(profile_ip):
    """Compute individual feature scores and aggregate credit score."""
    features = {
        "Repayment History": (
            (profile_ip["Credit_History_Age"] - profile_ip["Num_of_Delayed_Payment"])
            / profile_ip["Credit_History_Age"]
        ),
        "Credit Utilization": 1 - (
            1 if (profile_ip["Credit_Utilization_Ratio"] / 100) > 0.4
            else (profile_ip["Credit_Utilization_Ratio"] / 100)
        ),
        "Credit History": calculate_percentile_given_value(
            profile_ip["Credit_History_Age"], 221.220, 99.681
        ),
        "Outstanding": 1 - calculate_percentile_given_value(
            profile_ip["Outstanding_Debt"], 1426.220, 1155.129
        ),
        "Num Credit Inquiries": (
            0
            if calculate_percentile_given_value(
                profile_ip["Num_Credit_Inquiries"], 5.798, 3.868
            ) > 0.8
            else 1 - calculate_percentile_given_value(
                profile_ip["Num_Credit_Inquiries"], 5.798, 3.868
            )
        ),
    }
    score = calculate_credit_score(features)
    return features, score

@app.route("/product_suggestions", methods=["POST"])
def product_suggetions():
    data = request.get_json()
    user_id = data["userId"]
    client = get_mongo_client()
    collection = client[DB_NAME][COLLECTION_NAME]
    state = collection.find_one({"user_id": user_id}, {"_id": 0})
    recommendations = state.get("final_recommendations") if state else None
    if not recommendations:
        return Response(json.dumps({"message": "No recommendations found"}), status=404)
    # remove annual_income from recommendations
    recommendations = [{"title": recommendation["title"], "description": recommendation["description"]} for recommendation in recommendations]
    return jsonify({"productRecommendations": recommendations})


@app.route("/product_suggestions/<int:user_id>", methods=["GET"])
def product_suggestions_1(user_id):
    """Fetch product recommendations or return 404."""
    client = get_mongo_client()
    collection = client[DB_NAME][COLLECTION_NAME]
    state = collection.find_one({"user_id": user_id}, {"_id": 0})
    recommendations = state.get("final_recommendations") if state else None

    if not recommendations:
        return Response(json.dumps({"message": "No recommendations found"}), status=404)

    return jsonify({"productRecommendations": json.loads(recommendations)})


if __name__ == "__main__":
    from load_data import load_data_mongodb
    print("Loading data into MongoDB...")
    load_data_mongodb()
    print("Data loaded successfully.")
    app.run(host="0.0.0.0", port=5001)