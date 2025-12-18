"""Credit score explanation module."""
from dotenv import load_dotenv
load_dotenv()


from typing import List

from langchain_core.messages import SystemMessage
from langchain_core.output_parsers import StrOutputParser
from pydantic import BaseModel
from langchain_fireworks import ChatFireworks

from dummy import PrepareDummyCols

from credit_rating import get_model_feature_imps, get_user_profile, col, predict

from llm_utils import llm

credit_score_expl_prompt = """    
    You are Credit Health AI Assistant. 
    Your task is to explain the Credit Health of a person based on the given profile.

    ## Some definitions that were used in alternative credit scoring technique employed:
    Month: Represents the month of the year
    Name: Represents the name of a human
    Age: Represents the age of the human
    Occupation: Represents the occupation of the human
    Annual_Income: Represents the annual income of the human
    Monthly_Inhand_Salary: Represents the monthly base salary of a human
    Num_Bank_Accounts: Represents the number of bank accounts a human holds
    Num_Credit_Card: Represents the number of other credit cards held by a human
    Interest_Rate: Represents the interest rate on credit card
    Num_of_Loan: Represents the number of loans taken from the bank
    Type_of_Loan: Represents the types of loan taken by a human
    Delay_from_due_date: Represents the average number of days delayed from the payment date
    Num_of_Delayed_Payment: Represents the average number of payments delayed by a human
    Changed_Credit_Limit: Represents the percentage change in credit card limit
    Num_Credit_Inquiries: Represents the number of credit card inquiries
    Credit_Mix: Represents the classification of the mix of credits
    Outstanding_Debt: Represents the remaining debt to be paid (in USD)
    Credit_Utilization_Ratio: Represents the utilization ratio of credit card
    Credit_History_Age: Represents the age of credit history of the human
    Payment_of_Min_Amount: Represents whether only the minimum amount was paid by the human
    Total_EMI_per_month: Represents the monthly EMI payments (in USD)
    Amount_invested_monthly: Represents the monthly amount invested by the customer (in USD)
    Payment_Behaviour: Represents the payment behavior of the customer
    Monthly_Balance: Represents the monthly balance amount of the customer (in USD)

    ##Feature importaces for all above defined features of the alternative credit scroing technique:
    {feature_importance}

    ##Featurized User profile input to predict the Result(Credit Score Profile):
    {user_profile_ip}

    ## Alternative credit scroing technique inference results:
    - Credit Health={pred}
    - Processed Credit Limit for the user={allowed_credit_limit}

    ##Instruction: 
    - Take into account the Definitions of various feature field and their respective values used to predict a persons Credit Score Health using alternative credit scoring technique.
    - Provide a detailed reason in every day easy to understand language as to explain Credit Health request given Credit Health Status is {pred}.
    - Do not disclose any information about the model or its feature importances.
    - Provide corrective actions to improve the Credit Health and Processed Credit limit only if Credit Health is "Poor" or "Standard".
    - Credit history age below 36 months is considered relatively new credit user.
    
    ##Output:
    Detailed explanation for Credit Health and Processed Credit limit within 250 words:[Reason]
"""

def get_credit_score_expl(user_profile_ip, pred, allowed_credit_limit, feature_importance):
    """
    Get the credit score explanation for a given user profile.

    Args:
        user_profile_ip (dict): The user profile input.
        pred (str): The predicted credit score.
        allowed_credit_limit (float): The allowed credit limit.
        feature_importance (str): The feature importance scores.

    Returns:
        str: The credit score explanation.
    """
    prompt = credit_score_expl_prompt.format(
        user_profile_ip=user_profile_ip,
        pred=pred,
        allowed_credit_limit=allowed_credit_limit,
        feature_importance=feature_importance
    )
    chain = llm | StrOutputParser()
    response = chain.invoke(prompt)
    response = response.strip()
    return response

if __name__=="__main__":
    user_id = 8625
    pred, allowed_credit_limit, user_profile_ip = get_user_profile(user_id)
    feature_importance = get_model_feature_imps()
    response = get_credit_score_expl(user_profile_ip, pred, allowed_credit_limit, feature_importance)
    print(response)