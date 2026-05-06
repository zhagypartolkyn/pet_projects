# src/stats.py
import numpy as np

def sample_size_calculator(baseline_rate, mde, alpha=0.05, power=0.80):
    """
    Calculate required sample size per group.
    baseline_rate: current conversion rate (e.g. 0.113)
    mde: minimum detectable effect - smallest lift you care about (e.g. 0.02)
    alpha: significance level (default 0.05)
    power: statistical power (default 0.80)
    """
    # z-scores for alpha and power
    z_alpha = -np.log(alpha) # approximation
    z_alpha = 1.96  # for alpha=0.05 two-tailed
    z_power = 0.84  # for power=0.80

    p1 = baseline_rate
    p2 = baseline_rate + mde
    
    # pooled variance
    p_pool = (p1 + p2) / 2
    
    n = (z_alpha + z_power)**2 * (p1*(1-p1) + p2*(1-p2)) / (p2 - p1)**2
    
    return int(np.ceil(n))


def z_test(control_conversions, control_n, treatment_conversions, treatment_n):
    """
    Two-proportion z-test from scratch.
    
    Returns: z_score, p_value, confidence_interval, control_rate, treatment_rate
    """
    # conversion rates
    p1 = control_conversions / control_n
    p2 = treatment_conversions / treatment_n
    
    # pooled proportion
    p_pool = (control_conversions + treatment_conversions) / (control_n + treatment_n)
    
    # standard error
    se = np.sqrt(p_pool * (1 - p_pool) * (1/control_n + 1/treatment_n))
    
    # z-score
    z_score = (p2 - p1) / se
    
    # p-value (two-tailed) — using normal CDF approximation
    p_value = 2 * (1 - _normal_cdf(abs(z_score)))
    
    # 95% confidence interval for the difference
    margin = 1.96 * np.sqrt(p1*(1-p1)/control_n + p2*(1-p2)/treatment_n)
    ci = (round(p2 - p1 - margin, 4), round(p2 - p1 + margin, 4))
    
    return {
        'control_rate': round(p1, 4),
        'treatment_rate': round(p2, 4),
        'lift': round(p2 - p1, 4),
        'z_score': round(z_score, 4),
        'p_value': round(p_value, 4),
        'confidence_interval_95': ci
    }


def _normal_cdf(x):
    """
    Approximation of normal CDF from scratch using Abramowitz & Stegun.
    This avoids importing scipy.
    """
    t = 1 / (1 + 0.2316419 * abs(x))
    coeffs = [0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429]
    poly = sum(c * t**i for i, c in enumerate(coeffs, 1))
    pdf = np.exp(-x**2 / 2) / np.sqrt(2 * np.pi)
    cdf = 1 - pdf * poly
    return cdf if x >= 0 else 1 - cdf


def check_srm(expected_split, actual_counts):
    """
    Sample Ratio Mismatch check using Chi-square test from scratch.
    
    expected_split: e.g. [0.5, 0.5] for equal split
    actual_counts: e.g. [22606, 22605] actual group sizes
    """
    total = sum(actual_counts)
    expected_counts = [total * s for s in expected_split]
    
    # chi-square statistic
    chi2 = sum((o - e)**2 / e for o, e in zip(actual_counts, expected_counts))
    
    # p-value approximation for 1 degree of freedom
    p_value = 1 - _chi2_cdf(chi2, df=1)
    
    srm_detected = p_value < 0.05
    
    return {
        'expected_counts': [round(e) for e in expected_counts],
        'actual_counts': actual_counts,
        'chi2_statistic': round(chi2, 4),
        'p_value': round(p_value, 4),
        'srm_detected': srm_detected
    }


def _chi2_cdf(x, df=1):
    """Simple chi-square CDF approximation for df=1."""
    return _normal_cdf(np.sqrt(x)) * 2 - 1


def segment_test(df, segment_col, group_col, metric_col):
    """
    Run z_test within each segment.
    
    df: dataframe
    segment_col: column to segment by (e.g. 'age_group')
    group_col: A/B column (e.g. 'contact')
    metric_col: outcome column (e.g. 'y')
    """
    results = []
    groups = df[group_col].unique()
    
    if len(groups) != 2:
        raise ValueError(f"Expected 2 groups, got {len(groups)}")
    
    control_label, treatment_label = groups[0], groups[1]
    
    for segment in df[segment_col].unique():
        seg_data = df[df[segment_col] == segment]
        
        control = seg_data[seg_data[group_col] == control_label][metric_col]
        treatment = seg_data[seg_data[group_col] == treatment_label][metric_col]
        
        result = z_test(
            control.sum(), len(control),
            treatment.sum(), len(treatment)
        )
        result['segment'] = segment
        results.append(result)
    
    return results