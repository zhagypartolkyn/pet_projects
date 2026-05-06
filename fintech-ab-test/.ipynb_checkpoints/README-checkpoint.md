Data source: https://archive.ics.uci.edu/dataset/222/bank+marketing

# Fintech A/B Test Analysis: Contact Channel Strategy
> A data analysis project examining whether cellular vs telephone 
> outreach drives higher term deposit conversion rates across 
> client segments.

---

## Project Overview
This project simulates a real-world fintech analyst workflow:
framing a business hypothesis, running statistical tests from scratch,
segmenting results by client profile, and delivering a business 
decision memo to stakeholders.

**Business Question:**
Should the bank adopt a cellular-first contact strategy to improve 
term deposit subscription rates?

**Dataset:** UCI Bank Marketing Dataset — 45,211 client contacts 
from a Portuguese bank's direct marketing campaign.

---

## Key Findings
- Cellular outperforms telephone overall (+1.5pp, p=0.03) but the 
  effect is modest and falls below practical significance threshold
- **Retired and entrepreneur clients convert better via telephone** 
  — a blanket cellular-first strategy would actively harm these segments
- Previously contacted clients convert at 2.5x higher rate (23.1% vs 9.2%)
  — re-engagement campaigns are significantly more efficient than new outreach
- 60+ age group has the highest absolute conversion rate (45.1% cellular)
  despite common assumption that older clients are harder to convert
- March, September, October and December are highest converting months —
  May has lowest conversion despite being highest volume month

---

## Project Structure
fintech-ab-test/
├── data/
│   └── bank-full.csv
├── notebooks/
│   ├── 01_eda.ipynb              # Exploratory data analysis
│   ├── 02_ab_test_analysis.ipynb # Hypothesis testing & results
│   └── 03_segmentation.ipynb     # Segment-level analysis
├── src/
│   └── stats.py                  # Statistical functions from scratch
├── memo/
│   └── decision_memo.md          # Business recommendation
└── README.md

---

## Statistical Methods
All statistical functions were built from scratch using NumPy 
without scipy shortcuts:
- **Two-proportion Z-test** — tests significance of conversion 
  rate difference between channels
- **Sample size calculator** — power analysis for experiment design
- **SRM check** — Chi-square test for sample ratio mismatch detection
- **Segment testing** — runs Z-test within each client cohort
---

## Results Summary

### Overall A/B Test
| Metric | Telephone | Cellular |
|---|---|---|
| Conversion Rate | 13.42% | 14.92% |
| Sample Size | 2,906 | 29,285 |
| Lift | +1.5pp | |
| p-value | 0.03 | |
| Significant | ✅ Yes | |

### Age Segmentation
| Age Group | Telephone CR | Cellular CR | Lift | Significant |
|---|---|---|---|---|
| 18–30 | 14.1% | 20.6% | +6.4pp | ✅ |
| 31–45 | 8.8% | 12.6% | +3.8pp | ✅ |
| 46–60 | 9.5% | 12.9% | +3.4pp | ✅ |
| 60+ | 38.2% | 45.1% | +6.9pp | ✅ |

### Job Type Highlights
| Job | Telephone CR | Cellular CR | Lift | Significant |
|---|---|---|---|---|
| Student | 19.2% | 35.3% | +16.1pp | ✅ |
| Retired | 31.9% | 26.7% | -5.1pp | ✅ |
| Entrepreneur | 18.4% | 9.3% | -9.1pp | ✅ |
| Blue-collar | 6.2% | 9.97% | +3.75pp | ✅ |

---

## Recommendation
Adopt a **hybrid channel strategy**:
- Default to cellular for most segments
- Route retired and entrepreneur clients to telephone
- Prioritize re-engagement of previously contacted clients
- Focus campaigns in March, September, October, December

Full business recommendation → [`memo/decision_memo.md`](memo/decision_memo.md)

---

## Tech Stack
- **Python** — Pandas, NumPy, Matplotlib, Seaborn
- **Statistics** — Z-test, Chi-square, Power Analysis (built from scratch)
- **Jupyter Notebook** — analysis and visualization
