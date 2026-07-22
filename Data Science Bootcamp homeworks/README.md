# 📊 Data Science & Machine Learning Homeworks

> ⚠️ **Note:** These are first-draft versions of the homeworks — they may contain errors, and some points may be incomplete or unanswered.

A collection of homework assignments covering Python fundamentals, statistics, linear algebra, regression, PCA/t-SNE, deep learning (CNNs, LSTMs, Autoencoders), and NLP.

---

## 📑 Table of Contents

- [Core Homeworks](#-core-homeworks)
- [Optional Homeworks](#-optional-homeworks)
- [Capstone Project](#-capstone-project)

---

## 📘 Core Homeworks

### Homework 1 — Python Basics
`Sets` · `Lists` · `Dictionaries`

---

### Homework 2 — Python Functions
Custom implementations of:
- Fibonacci sequence
- Palindrome checker
- Factorial
- Prime numbers, etc.

---

### Homework 3 — Data Cleaning, Analysis & Plotting

| Dataset | What was done |
|---|---|
| ⚽ **Euro 2012 stats** | Goal distribution plot, team/record counts, filtering, sorting by cards, correlation analysis |
| 🍷 **Alcohol consumption** | Beer/wine/spirits stats by continent, top 10% drinker countries, Kazakhstan's rank among post-Soviet countries |
| 🚔 **USA crime rates (1960–2014)** | Crimes per decade by type, identifying the most dangerous decade |
| 💨 **Wind speed in Ireland** | Date cleanup, missing-value/duplicate checks, monthly averages, time-series plotting |

---

### Homework 4 — Linear Algebra
- Matrix addition, multiplication, outer product, transpose
- Solving a linear system + determinant (`np.linalg.solve`)
- Cramer's rule for a 3-variable system
- Matrix rank calculations
- Manual OLS regression (normal equations) on a synthetic dataset (age, height, weight, gender → predicted outcome)

---

### Homework 5 — Distance Metrics & Gradient Descent
- Cosine similarity, Manhattan distance, Euclidean distance between vector combinations
- Repeats the OLS setup from HW4, plus a name/surname-based coefficient-selection function (vowel/consonant logic)
- A cleaner manual gradient descent implementation: simple linear regression (weight ~ height), producing beta coefficients and RMSE

---

### Homework 6 — Statistics & Misc
- Descriptive stats on a waiting-times array (mean, std)
- Z-score / standardization calculation
- Chi-square test of independence (coffee/tea vs. gender)
- A few standalone determinant calculations
- Odd-number counting loop
- Kolmogorov–Smirnov normality test
- One-off square-root calculation

---

### Homework 8 — Regression Models

<details>
<summary><b>8.1 — Linear Regression</b> (California housing dataset)</summary>

- Data exploration & missing value handling
- Distribution analysis + log-transform for skewed features
- Correlation heatmap → strongest predictors of `median_house_value`
- Optional feature engineering & standardization
- Scatterplots/pairplots, multicollinearity check
- Train/test split → OLS regression (statsmodels), R² / RMSE evaluation
- Ridge & Lasso regression with cross-validated alpha tuning
- ElasticNet + final model comparison and conclusions

</details>

<details>
<summary><b>8.2 — Logistic Regression</b> (heart disease dataset)</summary>

- EDA: value counts, crosstabs, missing values
- Histograms/boxplots per feature, correlation heatmap, log-transform
- Train/test split (90/10, `random_state=101`)
- StandardScaler + logistic regression
- Threshold tuning (0.3 / 0.5 / 0.7) → best-threshold selection
- Coefficient barplot + odds-ratio interpretation
- Final evaluation: confusion matrix, classification report

</details>

---

### Homework 9 — PCA & t-SNE

<details>
<summary><b>9.1 — Theory</b> (multiple choice + short answer)</summary>

PCA fundamentals (variance maximization, weight optimization, use cases), t-SNE vs. PCA differences, importance of centering, meaning of perplexity.

</details>

<details>
<summary><b>9.2 — Practice</b> (Sigma Cabs taxi pricing dataset)</summary>

- Missing value imputation (median / mode)
- One-hot encoding of categorical features
- PCA from scratch alongside sklearn's `PCA` → first 2 components visualized (~8% & ~5.6% explained variance)
- Correlation heatmap: original features vs. principal components
- 3D PCA projection *(3rd-component question left unanswered)*
- Logistic regression on PCA components vs. original features *(pipeline error encountered)*
- Logistic regression across component counts `[2, 4, 8, 16, 28]`
- t-SNE (2D) visualization *(incomplete)*

</details>

---

## 🧪 Optional Homeworks

### Optional HW 4 — CNN Image Classifier
**AI-generated vs. real art**
- 6-layer CNN (Conv2D → BatchNorm → ReLU → MaxPool2D → Dropout → FC), target: F1-macro > 60%
- Image preprocessing with OpenCV (resize to 128×128), labeling, train/test split, tensor conversion
- Custom PyTorch `CNNModel`, training loop, evaluation via `classification_report`

---

### Optional HW 5 — LSTM Time-Series Forecasting
**COVID new cases**
- Min-Max normalization
- Sliding-window sequences (window = 30)
- PyTorch `Dataset` + LSTM model, trained with MSE loss
- Forecast through 2025, results plotted

---

### Optional HW 6 — Autoencoder
**Image reconstruction / classification**
- GPU availability check
- `AE` architecture: 28×28 → bottleneck (9) → 28×28
- 50-epoch training loop
- Predicted label extraction via `argmax`
- *(Visualization/analysis incomplete)*

---

### Optional HW 7 — Time-Series Forecasting
**Avocado prices — ARIMA / SARIMA**
- EDA, aggregation of `Total Volume` (daily → monthly)
- Stationarity testing, ACF/PACF plots, log transform, seasonal decomposition
- Multiple ARIMA fits tested → optimal SARIMA order **(0, 1, 0)** (AIC = -51)
- *(Final MAPE evaluation on holdout set incomplete)*

---

### Optional HW 9 — Fake News Detection
- Dataset: FakeNewsNet
- Data cleaning: duplicate removal, null handling
- Custom `preprocess_text` function
- TF-IDF + `MultinomialNB` classifier
- Repeated with `CountVectorizer` + `MultinomialNB`

---

## 🚀 Capstone Project

**AI Vacation Planning Assistant**
🔗 [github.com/zhagypartolkyn/Ai_vacation_planning_assistant](https://github.com/zhagypartolkyn/Ai_vacation_planning_assistant)
