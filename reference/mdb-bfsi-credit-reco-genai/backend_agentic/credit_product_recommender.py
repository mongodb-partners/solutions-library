from langchain_core.prompts import PromptTemplate
from typing import List

from langchain_core.output_parsers import PydanticOutputParser, StrOutputParser
from pydantic import BaseModel, Field

import os
from dotenv import load_dotenv

from llm_utils import llm, retriever
import logging
from langchain.tools import tool

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class CreditCard(BaseModel):
    title: str = Field(description="name of a credit card from Credit cards Recommendations")
    description: str = Field(description="Rephrase description to summarize the features of the credit card in 50 words")
    annual_fee: str = Field(description="Annual fee of the credit card")

class CreditCardList(BaseModel):
    cards: List[CreditCard] = Field(description="List of credit card recommendations")

final_output_parser = PydanticOutputParser(pydantic_object=CreditCardList)

class Recommendations(BaseModel):
    card_suggestions: List[str] = Field(description="describe the credit card types best suited for the user profile in 150 words")

recommendation_parser = PydanticOutputParser(pydantic_object=Recommendations)

get_credit_card_recommendations_prompt = PromptTemplate(
    template="""
    You are an AI assistant. Your task is to generate different credit card names and product summaries for the given user profile.
    - By generating multiple perspectives on the user profile and instruction, your goal is to help

    ## ML Model Inference Results on User Profile:
    - Credit Health={pred}
    - Processed Credit Limit for the user={allowed_credit_limit}

    User profile={user_profile}
    Occupation={occupation}
    Annual Income={annual_income}
    Monthly Inhand Salary={monthly_inhand_salary}

    ## Format Instructions: {format_instruction}

    ##Instruction:
    - Given the user profile and recommended credit cards that will best fit the user profile.
    - Reason as to why the credit card is suggested to the user for each card.
    - Provide product features to help user choose


    """,
    input_variables=["user_profile", "pred", "allowed_credit_limit", "occupation", "annual_income", "monthly_inhand_salary"],
    partial_variables={"format_instruction": recommendation_parser.get_format_instructions()}
)

# ## Recommendations=Output as Json with card name as Key and concise summary of the card as value:
# Output:{{"CardName1":"personalized_product_description_1","CardName2":"personalized_product_description_2",...}}


user_profile_based_cc_rec_prompt = PromptTemplate(
    template="""
    You are an AI assistant. Your task is to rerank retrieved credit cards with description for the given user profile.
    - By generating multiple perspectives on the user profile and instruction, your goal is to help genereate final top 5 credit cards.

    ## ML Model Inference Results on User Profile:
    - Credit Health={pred}
    - Processed Credit Limit for the user={allowed_credit_limit}
    User profile={user_profile}
    Occupation={occupation}
    Annual Income={annual_income}
    Monthly Inhand Salary={monthly_inhand_salary}

    ## Credit cards Recommendations:
    {card_suggestions}

    ##Format Instructions: {format_instruction}

    """,
    input_variables=["user_profile", "pred", "allowed_credit_limit", "occupation", "annual_income", "monthly_inhand_salary"],
    partial_variables={"format_instruction": final_output_parser.get_format_instructions()}
)


def get_credit_card_recommendations(
    user_profile: str,
    user_profile_ip: dict,
    pred: float,
    allowed_credit_limit: float,
) -> Recommendations:
    """
    Get the credit card recommendations from the LLM.

    Args:
        user_profile (str): The user profile information.
        user_profile_ip (dict): The user profile information in Json format.
        pred (float): The predicted credit score.
        allowed_credit_limit (float): The allowed credit limit.
        card_suggestions (str): The card suggestions string.

    Returns:
        str: The card suggestions with personalized summary.
    """
    prompt = get_credit_card_recommendations_prompt.format(
        user_profile=user_profile,
        pred=pred,
        allowed_credit_limit=allowed_credit_limit,
        occupation=user_profile_ip.get("Occupation"),
        annual_income=user_profile_ip.get("Annual_Income"),
        monthly_inhand_salary=user_profile_ip.get("Monthly_Inhand_Salary"),

    )
    try:
        chain = llm | recommendation_parser
        parsed_resp = chain.invoke(prompt)
        return parsed_resp
    except Exception as e:
        logging.error(f"Error in get_credit_card_recommendations: {e}")
        return None

def retrieve_card_recommendations(queries, retriever) -> List[dict]:
    """
    Retrieve credit card recommendations based on query criteria,
    remove duplicates and sort by title.
    
    Args:
        queries (list): List of card type queries
        retriever: Document retriever object
    
    Returns:
        list: Sorted unique document results
    """
    # Retrieve documents for each query
    docs = [retriever.invoke(query) for query in queries]
    
    # Flatten and standardize format
    all_docs = [{"title": doc.metadata["title"], "description": doc.page_content} 
                for doc_list in docs for doc in doc_list]
    
    # Remove duplicates while preserving order
    seen = set()
    unique_docs = [doc for doc in all_docs if doc["title"] not in seen and not seen.add(doc["title"])]
    
    # Sort by title
    return sorted(unique_docs, key=lambda x: x["title"])

def get_final_user_profile_cc_rec(
    user_profile: str,
    user_profile_ip: dict,
    pred: float,
    allowed_credit_limit: float,
    card_suggestions: List[str],
) -> CreditCardList:
    """
    Get the credit card recommendations from the LLM.

    Args:
        user_profile (str): The user profile information.
        user_profile_ip (dict): The user profile information in Json format.
        pred (float): The predicted credit score.
        allowed_credit_limit (float): The allowed credit limit.
        card_suggestions (str): The card suggestions string.

    Returns:
        str: The card suggestions with personalized summary.
    """

    retrieved_cards = retrieve_card_recommendations(
        queries=card_suggestions,
        retriever=retriever
    )
    # print("++++++++++++++++++++++++++++++++++++++++++++++")
    # print("Final Recommendations", parsed_cards_recommendations)
    # print("++++++++++++++++++++++++++++++++++++++++++++++")
    prompt = user_profile_based_cc_rec_prompt.format(
        user_profile=user_profile,
        pred=pred,
        allowed_credit_limit=allowed_credit_limit,
        occupation=user_profile_ip.get("Occupation"),
        annual_income=user_profile_ip.get("Annual_Income"),
        monthly_inhand_salary=user_profile_ip.get("Monthly_Inhand_Salary"),
        card_suggestions=retrieved_cards
    )
    try:
        chain = llm | final_output_parser
        parsed_resp = chain.invoke(prompt)
        # print("++++++++++++++++++++++++++++++++++++++++++++++")
        # print("Final Recommendations_out", parsed_resp)
        # print("++++++++++++++++++++++++++++++++++++++++++++++")
        return parsed_resp
    except Exception as e:
        logging.error(f"Error in get_final_user_profile_cc_rec: {e}")
        return None
    



if __name__=="__main__":
    load_dotenv()
    from dummy import PrepareDummyCols
    from credit_rating import get_user_profile, get_model_feature_imps
    from credit_score_expl import get_credit_score_expl
    user_id = 8625
    pred, allowed_credit_limit, user_profile_ip = get_user_profile(user_id)
    feature_importance = get_model_feature_imps()
    response = get_credit_score_expl(user_profile_ip, pred, allowed_credit_limit, feature_importance)
    print("++++++++++++++++++++++++++++++++++++++++++++++++")
    print(response)
    print("++++++++++++++++++++++++++++++++++++++++++++++++")
    recommednations = get_credit_card_recommendations(
        user_profile=response,
        user_profile_ip=user_profile_ip,
        pred=pred,
        allowed_credit_limit=allowed_credit_limit,
    )
    print("++++++++++++++++++++++++++++++++++++++++++++++++")
    print(recommednations)
    print("++++++++++++++++++++++++++++++++++++++++++++++++")

    final_recommendations = get_final_user_profile_cc_rec(
        user_profile=response,
        user_profile_ip=user_profile_ip,
        pred=pred,
        allowed_credit_limit=allowed_credit_limit,
        card_suggestions=recommednations.card_suggestions if recommednations else [],
    )
    print(final_recommendations)
    print("++++++++++++++++++++++++++++++++++++++++++++++++")

