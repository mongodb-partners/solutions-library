"""Utility functions for statistical and credit score calculations."""
import scipy.stats as stats

def calculate_percentile_given_value(value, mean, std):
    """
    Calculate the percentile rank of a value given the mean and standard deviation.

    Args:
        value (float): The value to evaluate.
        mean (float): The mean of the distribution.
        std (float): The standard deviation of the distribution.

    Returns:
        float: The percentile rank (0 to 1).
    """
    # Calculate the z-score (standard score)
    z_score = (value - mean) / std

    # Calculate the percentile using the cumulative distribution function (CDF)
    percentile = stats.norm.cdf(z_score) * 100

    return percentile/100

def calculate_credit_score(ip):
    """
    Calculate a normalized credit score based on input feature weights.

    Args:
        ip (dict): Dictionary with keys:
            "Repayment History", "Credit Utilization", "Credit History",
            "Num Credit Inquiries", "Outstanding".

    Returns:
        int: Normalized credit score (300-850).
    """
    # Assign weightages (you can adjust these based on your requirements)
    weight_payment_history = 0.05
    weight_credit_utilization = 0.5
    weight_credit_history_length = 0.025
    weight_recent_inquiries = 0.4
    weight_of_outstanding = 0.025

    #Calculate individual scores
    score_payment_history = ip["Repayment History"]  * weight_payment_history
    score_credit_utilization = ip["Credit Utilization"] * weight_credit_utilization
    score_credit_history_length = ip["Credit History"] * weight_credit_history_length
    score_recent_inquiries = ip["Num Credit Inquiries"] * weight_recent_inquiries
    score_of_outstanding = ip["Outstanding"] * weight_of_outstanding

    # Calculate overall credit score
    overall_score = (
        score_payment_history
        + score_credit_utilization
        + score_credit_history_length
        + score_recent_inquiries
        + score_of_outstanding
    )

    # Normalize the score
    normalized_score = int((overall_score / 1.0) * 550 + 300)

    return normalized_score