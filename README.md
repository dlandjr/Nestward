# Savings Growth Calculator

A client-side financial planning tool for modeling savings accounts, salary growth, taxes, and investment returns over time.

## Features

- **Multiple accounts** — 401k/403b, Roth IRA, and taxable/personal accounts, each with their own settings
- **Savings rate phases** — define different contribution rates for different time periods
- **Tax-aware** — federal effective tax rates, all 50 state income tax rates, FICA; pre-tax vs post-tax contributions
- **Roth IRA income limits** — contributions automatically phase out and zero based on income thresholds (2025 limits, inflation-adjusted)
- **Employer match** — tracked separately from your paycheck deductions
- **Salary modeling** — annual raises until a peak year, then inflation-only raises (2.5%)
- **Investment growth** — low/high/average growth scenarios per account
- **Expenses tab** — common monthly expenses (rent, utilities, groceries, etc.) plus custom entries
- **Combined view** — monthly paycheck breakdown, savings balance projections, annual contribution chart, salary chart

## Running Locally

No build step required. Just open `index.html` in a browser, or serve with any static file server:

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

## GitHub Pages

Push to a GitHub repository and enable **Pages** under Settings → Pages → Deploy from branch `main` / `(root)`.

The live URL will be: `https://<your-username>.github.io/<repo-name>/`

## File Structure

```
index.html      — App shell and layout
styles.css      — All styles
data.js         — Constants, state taxes, federal brackets, default account/expense data
calculator.js   — Tax math, Roth eligibility, simulation engine, monthly breakdown data
ui.js           — HTML panel builders, tab rendering, account/expense management
charts.js       — Chart.js chart rendering for account and combined views
app.js          — Main run loop and initialization
```

## Notes

- Tax calculations are approximate (effective rates, not marginal). Not financial advice.
- Roth IRA phase-out thresholds and contribution limits are 2025 values, inflated at 2.5%/yr in the model.
- All calculations run client-side — no data is sent anywhere.
