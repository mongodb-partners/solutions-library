import multiprocessing
from tqdm import tqdm
import json
from dummy import PrepareDummyCols
from credit_score_demo import get_prod_reco

def prod_reco(data):
    user_profile = data["userProfile"]
    user_id = data["userId"]
    pred = data["userCreditProfile"]
    allowed_credit_limit = data["allowedCreditLimit"]
    return get_prod_reco(user_profile, user_id, pred, allowed_credit_limit)


with open("user_profile_expl_data.jsonl", "r") as f:
    resps = [json.loads(line) for line in f.readlines()]
    with open("product_suggestions.jsonl", "a") as f:
        for data in tqdm(resps[25:]):
            results = prod_reco(data)
            f.write(json.dumps(results))
            f.write("\n")
            f.flush()
print("All requests completed.")