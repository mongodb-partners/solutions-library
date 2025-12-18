import pandas as pd
import joblib
from pymongo import MongoClient
import certifi
import os
import json



import numpy as np

import logging
import os
from functools import lru_cache
from mdb_utils import get_mongo_client

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

client = get_mongo_client()
col = client["bfsi-genai"]["user_data"]

label_encoder_l = joblib.load("./model/credit_score_mul_lable_le.jlb")
dummy_l = joblib.load("./model/credit_score_mul_lable_coldummy.jlb")
model_l = joblib.load("./model/credit_score_mul_lable_model.jlb")
ordinal_enc_l = joblib.load("./model/credit_score_mul_lable_ordenc.jlb")

def predict(df):
    df_copy = df.copy()
    df_copy.drop(columns=["ID", "Customer_ID", "Name", "SSN","Credit_Score"], inplace=True)
    df_copy = dummy_l.transform(df_copy)
    df_copy[ordinal_enc_l.feature_names_in_] = ordinal_enc_l.transform(df_copy[ordinal_enc_l.feature_names_in_])
    v = model_l.predict_proba(df_copy[model_l.feature_names_in_])[0]
    pred = label_encoder_l.inverse_transform(model_l.predict(df_copy[model_l.feature_names_in_]))[0]
    return pred,v

def get_user_profile(user_id):
    logging.info(f"Processing User ID: {user_id}")
    user_id_df = pd.DataFrame.from_records((col.find({"Customer_ID":int(user_id)}, {"_id":0})))
    print(user_id_df)
    pred,v = predict(user_id_df)
    user_id_df.drop(columns=["ID", "Customer_ID", "SSN","Credit_Score"], inplace=True)
    user_profile_ip = user_id_df.to_dict(orient="records")[0]
    # print(user_profile_ip)

    monthly_income = user_id_df['Monthly_Inhand_Salary'].values[0]
    logging.info(f">>>>>>>>>>>>>>>>>>>>>> Monthly Income : {monthly_income}")
    allowed_credit_limit = int(np.ceil(monthly_income*6*((1*v[0]+0.5*v[1]+0.25*v[2]))))
    logging.info(f"Allowed Credit Limit for the user: {allowed_credit_limit}")
    return pred, allowed_credit_limit, user_profile_ip

@lru_cache(1)
def get_model_feature_imps():
    # model = joblib.load("classifier.jlb")
    df = pd.DataFrame.from_records((col.find({"Customer_ID":8625}, {"_id":0})))
    imp_idx = np.argsort(-1 * model_l.feature_importances_)
    feature_importance = "\n".join(i for i in list(map(lambda x:f"Columns:{x[0]}  Prob score for decision making:{x[1]}" ,zip(df.columns[imp_idx], model_l.feature_importances_[imp_idx]))))
    return feature_importance


# if __name__=="__main__":
#     print(col.find_one({}))
#     user_id = 8625
#     pred, allowed_credit_limit, user_profile_ip = get_user_profile(user_id)
#     print(pred)
#     print(allowed_credit_limit)
#     print(user_profile_ip)
#     print(get_model_feature_imps())