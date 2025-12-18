"""Test suite for stat_score_util and credit scoring modules."""

import pytest
from stat_score_util import calculate_percentile_given_value, calculate_credit_score

def test_calculate_percentile_given_value_mean():
    """Test percentile at mean should be 0.5."""
    assert abs(calculate_percentile_given_value(100, 100, 10) - 0.5) < 1e-6

def test_calculate_percentile_given_value_above_mean():
    """Test percentile above mean should be > 0.5."""
    assert calculate_percentile_given_value(120, 100, 10) > 0.5

def test_calculate_percentile_given_value_below_mean():
    """Test percentile below mean should be < 0.5."""
    assert calculate_percentile_given_value(80, 100, 10) < 0.5

def test_calculate_credit_score_basic():
    """Test basic credit score calculation is within expected range."""
    ip = {
        "Repayment History": 1.0,
        "Credit Utilization": 0.8,
        "Credit History": 0.7,
        "Num Credit Inquiries": 0.5,
        "Outstanding": 0.6,
    }
    score = calculate_credit_score(ip)
    assert 300 <= score <= 850

def test_credit_score_expl():
    """Test credit score explanation returns a non-empty string."""
    from dotenv import load_dotenv
    load_dotenv()
    from credit_rating import get_user_profile, get_model_feature_imps
    from credit_score_expl import get_credit_score_expl
    user_id = 8625
    pred, allowed_credit_limit, user_profile_ip = get_user_profile(user_id)
    feature_importance = get_model_feature_imps()
    response = get_credit_score_expl(user_profile_ip, pred, allowed_credit_limit, feature_importance)
    assert isinstance(response, str)
    assert len(response) > 0

def test_product_recommendation():
    """Test product recommendation returns valid CreditCardList with CreditCard items."""
    from dotenv import load_dotenv
    load_dotenv()
    from credit_rating import get_user_profile, get_model_feature_imps
    from credit_score_expl import get_credit_score_expl
    from credit_product_recommender import get_credit_card_recommendations, get_final_user_profile_cc_rec, CreditCardList, CreditCard
    user_id = 8625
    pred, allowed_credit_limit, user_profile_ip = get_user_profile(user_id)
    feature_importance = get_model_feature_imps()
    response = get_credit_score_expl(user_profile_ip, pred, allowed_credit_limit, feature_importance)
    recommednations = get_credit_card_recommendations(
        user_profile=response,
        user_profile_ip=user_profile_ip,
        pred=pred,
        allowed_credit_limit=allowed_credit_limit,
    )
    final_recommendations = get_final_user_profile_cc_rec(
        user_profile=response,
        user_profile_ip=user_profile_ip,
        pred=pred,
        allowed_credit_limit=allowed_credit_limit,
        card_suggestions=recommednations.card_suggestions if recommednations else [],
    )
    assert isinstance(final_recommendations, CreditCardList)
    assert len(final_recommendations.cards) > 0
    assert all(isinstance(rec, CreditCard) for rec in final_recommendations.cards)

if __name__ == "__main__":
    import sys
    import pytest
    sys.exit(pytest.main([__file__]))

