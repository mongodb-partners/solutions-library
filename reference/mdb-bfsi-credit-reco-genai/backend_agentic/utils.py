from pydantic import BaseModel, Field
import operator
from typing import Annotated, List, Tuple
from typing_extensions import TypedDict
from langchain_core.pydantic_v1 import BaseModel, Field, validator
from credit_product_recommender import CreditCardList
from dotenv import load_dotenv
load_dotenv()

class CCrecommenderState(TypedDict):
    user_id: str
    user_profile: str
    pred: str
    allowed_credit_limit: str
    occupation: str
    annual_income: str
    monthly_inhand_salary: str
    user_profile_ip: str
    card_suggestions: str
    input: str
    plan: List[str]
    past_steps: Annotated[List[Tuple], operator.add]
    response: str
    final_recommendations: CreditCardList

class Recommendations(BaseModel):
    """Recommendations to user credit rating and User profile."""

    steps: List[str] = Field(
        description="describe different credit card types best suited for the user profile"
    )

