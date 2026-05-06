# Decision Memo: Contact Channel Strategy
(Let's preted this was a real task, not a pet-project, written with Claude.ai)
**To:** Head of Marketing, Retail Banking Division
**From:** Tolkyn Zhagypar, Data Analyst
**Date:** May 2026
**Subject:** Should we prioritize cellular over telephone outreach 
for term deposit campaigns?

---

## Background
This analysis evaluated whether contact channel (cellular vs telephone) 
significantly affects term deposit subscription rates using a dataset 
of 45,211 client contacts from a Portuguese bank's direct marketing campaign.

The goal was to determine whether a cellular-first contact strategy 
should be adopted, and whether this recommendation holds uniformly 
across all client segments.

---

## Overall Result
Cellular outperforms telephone by 1.5 percentage points 
(14.9% vs 13.4%, p=0.03, 95% CI: 0.19% to 2.8%).

The result is statistically significant. However, the lift falls 
below our pre-defined minimum detectable effect of 2pp, meaning 
the business impact is modest and should be interpreted with caution.

**Important caveat:** Groups were heavily imbalanced (91% cellular, 
9% telephone), meaning this was observational data rather than a 
controlled experiment. Results are directional, not conclusive.

---

## Key Findings

### 1. Age Segments
Cellular outperforms telephone across all age groups. The strongest 
lift is observed in the youngest (18–30: +6.4pp) and oldest (60+: +6.9pp) 
segments. Middle-aged clients (31–60) still benefit from cellular 
but with smaller gains (+3.4–3.8pp).

Notably, the 60+ segment has the highest absolute conversion rates 
overall (38.2% telephone, 45.1% cellular), making them the most 
valuable segment regardless of channel.

### 2. Job Type — Most Actionable Finding
Cellular is NOT universally better. Two segments show a significant 
reversal of the overall trend:

- **Retired clients** convert better via telephone 
  (31.9% vs 26.7%, lift = -5.1pp, p=0.04)
- **Entrepreneur clients** strongly prefer telephone 
  (18.4% vs 9.3%, lift = -9.1pp, p=0.007)

A blanket cellular-first strategy would actively harm conversion 
among these two segments.

Segments where cellular wins most strongly:
- Students: +16.1pp (p=0.002)
- Technicians: +5.2pp (p=0.008)
- Services workers: +5.1pp (p=0.02)
- Blue-collar workers: +3.75pp (p=0.003)

Segments where channel makes no significant difference:
- Housemaid, self-employed, admin, unemployed

### 3. Prior Contact History
Clients contacted in previous campaigns convert at 23.1% vs 9.2% 
for first-time contacts — a 2.5x difference — regardless of channel.

This suggests that re-engaging previously contacted clients should 
be prioritized over new outreach, as cost of acquisition would be 
substantially lower.

### 4. Seasonal Pattern
March (52%), September (46%), October (44%) and December (46%) 
show significantly higher conversion rates than other months.

May has the lowest conversion rate (~6%) despite being the highest 
volume month, suggesting mass outreach campaigns are less effective 
than targeted ones.

---

## Business Impact Estimate
Assuming an average deposit value of $5,000 and a 2% bank margin:

- Switching telephone clients to cellular across non-retired, 
  non-entrepreneur segments: ~440 additional conversions
- Estimated revenue impact: ~$44,000

*Note: These figures are estimates based on dataset proportions 
and assumed deposit values. Actual impact requires validation 
with internal revenue data.*

---

## Recommendation
**Adopt a hybrid channel strategy rather than a blanket 
cellular-first approach:**

1. **Default to cellular** for most segments, especially 
   students, technicians, blue-collar, and 18–30 age group
2. **Route to telephone** for retired and entrepreneur clients 
   where cellular actively hurts conversion
3. **Prioritize re-engagement** of previously contacted clients 
   before new outreach — 2.5x higher conversion at lower CAC
4. **Focus campaigns in March, September, October, December** 
   rather than high-volume low-conversion months like May

---

## Risks & Caveats
- **Group imbalance:** 91% cellular vs 9% telephone means groups 
  may differ in ways beyond channel alone (age, location, history). 
  Results should be treated as directional.
- **Duration excluded:** Call duration was excluded from analysis 
  as it leaks information about the outcome (only known after the call).
- **Observational data:** No random assignment was made. Correlation 
  does not imply causation — other confounding factors may explain 
  the channel differences.

---

## Next Steps
Run a properly controlled A/B experiment with:
- Equal group sizes (50/50 split)
- Random assignment of channel per client
- Separate holdout groups for retired and entrepreneur segments
- Minimum 2pp lift as success threshold
- Duration: minimum 4 weeks to capture monthly seasonality effects