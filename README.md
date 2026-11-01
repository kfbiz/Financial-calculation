# KF Biz — Financial Calculation

A private financial-planning workspace for KF Biz. The project helps estimate the financial requirements and performance of small businesses in Finland, compare business scenarios and prepare structured forecasts for business planning and financing discussions.

The project uses a **general-purpose financial model** with optional industry-specific assumptions planned as extensions to the same calculation engine.

- **Current calculation model:** Version 2
- **Currency:** EUR
- **Primary market:** Finland
- **Application:** Static browser-based web application
- **Data storage:** Supabase Postgres
- **Repository:** [kfbiz/Financial-calculation](https://github.com/kfbiz/Financial-calculation)

---

## 1. Current project status

Version 2 is the current general financial calculation baseline.

| Component | Status |
| --- | --- |
| Multiple monthly revenue streams and direct costs | Implemented |
| Operating costs, including a separate YEL input | Implemented |
| Gross profit, gross margin and EBITDA | Implemented |
| Estimated result before tax and illustrative tax reserve | Implemented |
| P&L break-even turnover | Implemented |
| Cash break-even including owner cash target and debt repayments | Implemented |
| Startup funding and conservative working-capital buffer | Implemented |
| Monthly cash movement and simple cash-runway indicator | Implemented |
| Three-year profit forecast | Implemented |
| Downside and upside sensitivity cases | Implemented |
| Supabase sign-in and scenario persistence code | Implemented; live end-to-end browser test still required |
| CSV export | Implemented |
| Independent calculation tests | Added under `tests/` |
| Industry-specific calculation modules | Planned |
| Detailed monthly cash-flow and VAT settlement model | Planned |

The application calculates results in the browser as assumptions change. After signing in, a user can save, load, update and delete their own scenarios. The current model is a planning aid, not an accounting or tax product.

---

## 2. Repository files

| File | Responsibility |
| --- | --- |
| `index.html` | Page structure, data-entry sections, result panels and forecast table |
| `styles.css` | Responsive desktop and mobile styling |
| `app.js` | Browser inputs, rendering, Supabase authentication, scenario persistence and CSV export |
| `model.mjs` | Pure financial calculation engine, separated from the browser interface so it can be tested |
| `tests/financial-model-validation.mjs` | Repeatable calculation tests using Node's built-in assertion library |
| `README.md` | Project setup, formulas, validation record and roadmap |

The browser application loads the pinned Supabase JavaScript client, `@supabase/supabase-js@2.117.3`, from jsDelivr. The calculator does not require a local build step.

---

## 3. What the general calculator includes

### Business and scenario information

- Scenario name and business name
- Industry category
- Legal form: toiminimi, Oy or other
- EUR as the reporting currency

### Revenue and direct costs

Each revenue line contains:

- Product or service name
- Selling price per unit, excluding VAT
- Monthly sales quantity
- Direct cost per unit, excluding VAT

Monthly turnover, direct costs, gross profit and gross margin are derived from these inputs.

### Operating costs

The monthly operating-cost inputs include:

- Premises and rent
- Electricity, water and utilities
- Software, IT and phone
- Accounting and administration
- Marketing and sales
- Insurance and memberships
- **YEL entrepreneur pension insurance**
- Vehicle and travel
- Other operating costs
- Total employer cost for staff
- Estimated depreciation

YEL is an explicit user input; the application does not calculate the applicable YEL contribution from the entrepreneur's confirmed YEL work income. Staff cost remains a combined employer-cost estimate in this version.

### Startup funding and cash planning

One-off startup costs:

- Equipment and setup
- Initial inventory and supplies
- Deposits, licences and pre-opening expenses

Funding sources:

- Owner's contribution
- Grants or other confirmed funding
- Planned loan funding

Monthly cash-flow inputs:

- Cash available after setup
- Loan principal repayment
- Interest and financing cost
- Owner's monthly personal cash target / withdrawals
- Ongoing equipment and investment spending

**Profitability and cash flow are deliberately separated.** An owner's private withdrawal is not an operating expense or deductible salary in a toiminimi profit calculation. The withdrawal target is included in the cash-flow and cash break-even calculations. Oy owner remuneration requires separate treatment.

### Planning assumptions

- Annual revenue growth
- Annual cost increase
- Illustrative tax reserve on positive estimated profit
- Assumed average sales VAT rate
- Working-capital buffer in months

---

## 4. Calculation methodology

All turnover, prices and costs are entered excluding VAT. The VAT figure is only an estimate of output VAT on sales using one selected average rate. It is not net VAT payable because purchase VAT, exemptions, different rates by sales line and settlement timing are not yet modelled.

### Profitability calculations

`Monthly turnover = Sum of (unit price × monthly quantity)`

`Monthly direct costs = Sum of (direct cost per unit × monthly quantity)`

`Gross profit = Turnover − Direct costs`

`Gross margin ratio = Gross profit ÷ Turnover`

`EBITDA = Gross profit − operating costs − staff costs`

`Result before tax estimate = EBITDA − depreciation − financing interest`

`Illustrative tax reserve = max(0, result before tax × selected reserve rate)`

`Estimated net result = result before tax − illustrative tax reserve`

The tax reserve is a user-selected planning assumption. It is not a Finnish tax calculation. The default 20% must not be treated as the actual tax rate for a toiminimi or as an automatic tax result for an Oy.

### P&L break-even

`P&L break-even turnover = (operating costs + depreciation + interest) ÷ gross-margin ratio`

This shows the estimated turnover needed to cover operating expenses, depreciation and interest. It does not include the owner's private cash withdrawal target or loan principal repayment.

A meaningful break-even estimate requires a positive gross margin. If the gross margin is zero or negative, the figure is reported as not calculable.

### Cash break-even

Cash break-even solves for turnover that covers:

- Operating costs
- Financing interest
- Loan principal repayments
- Owner's monthly personal cash target
- Ongoing investment spending
- The illustrative tax reserve, when the estimated result before tax is positive

The calculation uses the current gross-margin ratio and the selected tax-reserve assumption. If the reserve is set to 100% and taxable profit is required to cover cash outflows, no finite cash break-even is reported.

This is still a simplified monthly model. It assumes sales convert to cash in the same month and does not model receivable or payable timing.

### Monthly cash movement

`Monthly cash movement = EBITDA − interest − illustrative tax reserve − loan principal repayment − owner withdrawals − ongoing investment`

`Cash after one month = opening cash after setup + monthly cash movement`

Depreciation is excluded from cash movement because it is a non-cash accounting expense. The runway indicator is a simple ratio of starting cash to the current monthly cash deficit; it is not a month-by-month cash budget.

### Startup funding requirement

The working-capital reserve uses a conservative gross-outflow method:

`Monthly buffer base = direct costs + operating costs + interest + loan principal + owner cash target + ongoing investment + illustrative tax reserve`

`Working-capital reserve = monthly buffer base × selected buffer months`

`Total funding requirement = one-off startup costs + working-capital reserve`

`Funding gap = max(0, total funding requirement − entered funding sources)`

The reserve is deliberately **not offset by forecast sales receipts**. It approximates a chosen period of costs that could need to be funded before sales receipts are available. This can produce a high estimate for a business expected to generate revenue from its first month. It should be adjusted after preparing a realistic sales ramp-up and monthly cash-flow schedule. Avoid entering the same owner funds or loan funds again as opening cash.

### Three-year forecast

- Year 1 annualises the current monthly run rate.
- Revenue grows according to the annual revenue-growth assumption.
- Direct costs scale with the revenue-volume factor **and** the cost-inflation factor.
- Operating costs and staff costs increase with the cost-inflation assumption.
- Depreciation and interest are held constant because the model does not yet contain an asset or loan amortisation schedule.
- The illustrative tax reserve is applied only to positive estimated pre-tax results.

This prevents the earlier issue in which sales could grow while direct costs did not grow with the volume of sales.

### Stress test

The current directional sensitivity cases are:

- Downside: revenue volume decreases by 20% and cost assumptions increase by 10%.
- Upside: revenue volume increases by 10% and cost assumptions increase by 5%.

These are simple scenario tests, not statistical probabilities or industry averages.

---

## 5. Benchmark selection and validation record

### Why this benchmark was selected

The first validation scenario is an illustrative one-person cleaning service operating as a toiminimi in the Turku region. It was selected because the revenue unit (billable cleaning hour), VAT treatment, consumable costs and recurring operating costs can be stated clearly.

The methodology is cross-checked against three independent reference types:

1. **Suomi.fi startup financial-planning guidance** — recommends preparing both a cash-flow statement and a profitability calculation; it says the working-capital reserve should commonly cover 2–3 months of expenses and profitability planning should start with the entrepreneur's income target.
   - https://www.suomi.fi/company/financing-a-business-and-business-subsidies/financial-planning/guide/financing-a-startup-business/financial-and-profitability-calculations
   - https://www.suomi.fi/company/financing-a-business-and-business-subsidies/financial-planning/guide/financing-a-startup-business/financing-to-a-company-during-the-start-up-phase

2. **Yritystulkki startup calculation models YT4 and YT5** — their published descriptions cover profitability, turnover, taxable income, cash budgets, EBITDA, financing result and industry comparison. This is a strong structural benchmark for the kinds of outputs a Finnish startup calculation tool should cover.
   - https://www.yritystulkki.fi/fi/alue/cursor/aloittava-yrittaja/suunnittelu/taloussuunnitelmat/

3. **Published Turku-area cleaning-service prices** — PipalClean publishes recurring-customer pricing of €48/hour and a basic price of €50/hour, including 25.5% VAT. Lempi Kodinhoito publishes a Turku/Pirkanmaa recurring price of €53/hour and one-off price of €60/hour, including 25.5% VAT. The scenario's €40/hour excluding VAT equals €50.20/hour including 25.5% VAT, which sits within the published recurring-price examples.
   - https://www.pipal.fi/hinnasto/kotisiivous-hinta/
   - https://www.lempi.fi/hinnasto

The price comparison is a plausibility check using published customer prices, not a claim about average prices, realised transaction prices, market share or the profitability of a new operator. The billable hours and cost inputs below are hypothetical assumptions for testing the calculator.

4. **Finnish Tax Administration VAT guidance** — identifies cleaning services as subject to the 25.5% general VAT rate. The selected cleaning scenario therefore uses 25.5% output VAT.
   - https://vero.fi/en/businesses-and-corporations/taxes-and-charges/vat/rates-of-vat/

### Test scenario assumptions

| Input | Assumption |
| --- | ---: |
| Business type | One-person cleaning service, toiminimi |
| Billable cleaning hours | 100 hours / month |
| Selling price | €40.00 / hour, excluding VAT |
| Direct supplies cost | €2.00 / billed hour |
| Software, phone | €45 / month |
| Accounting | €75 / month |
| Marketing | €90 / month |
| Other insurance and memberships | €75 / month |
| YEL premium placeholder | €300 / month |
| Vehicle and travel | €260 / month |
| Other operating costs | €85 / month |
| Depreciation | €45 / month |
| Financing interest | €40 / month |
| Owner cash withdrawal target | €1,800 / month |
| Loan principal repayment | €100 / month |
| Ongoing investment | €50 / month |
| Illustrative tax reserve | 20% |
| Sales VAT rate | 25.5% |
| Annual sales growth / cost inflation | 5% / 3% |
| Startup purchases and deposits | €2,200 |
| Working-capital buffer | 3 months |
| Owner funding / new loan | €1,500 / €1,000 |

The €300 YEL amount is only a test input. Actual YEL depends on the entrepreneur's confirmed YEL work income and applicable rules. The 100 monthly billable hours and other cost assumptions are also hypothetical; they are not published industry averages.

### Cross-check against the supplied Excel references

The five supplied workbooks were also reviewed as design references:

| Supplied workbook | Useful reference | What the current web model still lacks |
| --- | --- | --- |
| Budget template | General budget categories and planning layout | Detailed month-by-month budget schedule |
| Calculations_all | Separate costs, selling, financing, cash budget and salary planning | Detailed payroll calculation and linked monthly cash budget |
| Nordea Budget Template | Monthly budget, yearly budget and balance-budget structure | Full balance-sheet forecast and monthly-to-annual roll-up |
| Prediction template | Three-year operating result, cash flow, loan repayment capacity, working-capital changes and investment movements | Detailed loan repayment-capacity statement and three-year cash-flow bridge |
| Profitability Template (Adnan) | Entrepreneur income target, YEL, fixed costs and target invoicing | Gross-up from a desired personal after-tax income to a required sales target |

Version 2 has moved closer to the profitability reference by introducing a distinct YEL input and a cash break-even result that includes the owner's cash target. It does not yet convert a desired personal net income into a gross business profit requirement because the entrepreneur's final Finnish tax position cannot be represented by one generic tax percentage.

### Independently calculated monthly result

| Output | Validated result |
| --- | ---: |
| Turnover, excluding VAT | €4,000 |
| Direct costs | €200 |
| Gross profit | €3,800 |
| Gross margin | 95.0% |
| Operating costs including YEL | €930 |
| EBITDA | €2,870 |
| Depreciation | €45 |
| Interest | €40 |
| Estimated result before tax | €2,785 |
| Illustrative tax reserve | €557 |
| Estimated net result | €2,228 |
| Monthly cash movement after owner target, loan principal and ongoing investment | **+€323** |
| Cash after one month, starting from €700 | €1,023 |
| P&L break-even turnover | €1,068 / month |
| Cash break-even turnover, including owner cash target and illustrative tax | €3,575 / month |
| Estimated sales VAT at 25.5% | €1,020 / month |

The P&L break-even and cash break-even are intentionally different. The business can cover accounting-style costs at a much lower sales level, but it needs substantially more turnover to also fund the owner's €1,800 cash target, debt principal and ongoing investment.

The €1,020 VAT figure is estimated output VAT only. It is not the amount payable to the Tax Administration because deductible purchase VAT and payment timing are excluded.

### Startup funding buffer result

| Output | Validated result |
| --- | ---: |
| Gross monthly outflow included in reserve | €3,677 |
| Three-month working-capital reserve | €11,031 |
| One-off startup costs | €2,200 |
| Total indicative funding requirement | €13,231 |
| Owner funding plus planned loan | €2,500 |
| Indicative funding gap | €10,731 |

This gap is a conservative no-revenue buffer, not a forecast of the actual cash shortfall after sales. A monthly ramp-up and payment-timing model is needed to estimate a more precise amount.

### Three-year forecast result

| Metric | Year 1 | Year 2 | Year 3 |
| --- | ---: | ---: | ---: |
| Turnover | €48,000 | €50,400 | €52,920 |
| Direct costs | €2,400 | €2,596 | €2,807 |
| Gross profit | €45,600 | €47,804 | €50,113 |
| Operating costs and staff | €11,160 | €11,495 | €11,840 |
| EBITDA | €34,440 | €36,310 | €38,273 |
| Depreciation | €540 | €540 | €540 |
| Interest | €480 | €480 | €480 |
| Illustrative tax reserve | €6,684 | €7,058 | €7,451 |
| Estimated net result | €26,736 | €28,232 | €29,803 |

Figures are rounded to whole euros in this table. The forecast is a steady-state scenario with assumed annual growth and cost inflation, not a first-year start-up ramp-up forecast.

### Validation tests performed

The independent validation suite is stored in `tests/financial-model-validation.mjs`. It uses Node's built-in assertion library and has no third-party test dependency.

The suite checks:

- Monthly turnover, direct cost and gross-profit calculations
- Gross margin, operating costs including YEL, EBITDA and estimated net result
- Monthly cash movement and opening cash reconciliation
- P&L break-even and cash break-even
- Whether cash movement is zero at the calculated cash break-even
- Working-capital and funding-gap calculations
- Output VAT arithmetic
- Direct-cost growth with both sales-volume growth and input-cost inflation
- Depreciation staying level without a depreciation schedule
- Zero sales, zero gross margin and negative gross margin
- Tax-reserve edge cases
- A 100% sales-volume decline in the forecast

The calculation engine and application JavaScript were syntax-checked, and the validation vectors were executed against the current calculation function. A live browser sign-in and Supabase save/load cycle still needs to be checked in the deployed browser environment.

Run the repeatable suite locally with:

```bash
node tests/financial-model-validation.mjs
```

---

## 6. Supabase database and data protection

Project: [Financial-calculation in Supabase](https://supabase.com/dashboard/project/crevbddanoyhgrrbutzl)

The initial table is `public.financial_scenarios`.

| Column | Purpose |
| --- | --- |
| `id` | Unique scenario identifier |
| `user_id` | Owner, linked to `auth.users` |
| `name` | Scenario name |
| `business_name` | Business or project name |
| `industry_category` | Selected industry |
| `legal_form` | Selected legal form |
| `currency` | EUR |
| `model_version` | Calculation model version |
| `inputs` | JSON object containing assumptions |
| `results` | JSON object containing calculated results |
| `created_at`, `updated_at` | Record timestamps |

### Access-control model

- Row Level Security (RLS) is enabled on `financial_scenarios`.
- The authenticated policies require `auth.uid() = user_id` for reading, inserting, updating and deleting records.
- Anonymous access to the scenario table is revoked.
- The browser uses the Supabase publishable key only. Never place a service-role or secret key in browser code or in GitHub.
- The application has sign-in but no public self-registration.

The repository is public, so the application source and publishable key can be viewed by anyone. The key is designed for browser use; the database grants and RLS policies must continue to protect the data.

### Create the private operator account

1. Open the Supabase project.
2. Navigate to **Authentication → Users**.
3. Add the intended user's email and password.
4. Confirm the account if Supabase requests it.
5. Open the deployed application and sign in.

Only create additional users when you intend to let those account holders use the calculator. RLS separates each account's saved scenarios.

---

## 7. Publish with GitHub Pages

1. Open this repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main` and folder `/(root)`.
5. Save and wait for the deployment to complete.
6. The expected application URL is:

   `https://kfbiz.github.io/Financial-calculation/`

7. In Supabase, open **Authentication → URL Configuration**. Set the Site URL to the deployed address and add it to the Redirect URLs allow-list if required by the project settings.

GitHub Pages publishes the static files from the selected branch after each deployment. If the application cannot sign in, check the Pages URL, Supabase Auth URL configuration, publishable key, Data API grants and RLS policies.

---

## 8. Current limitations

Version 2 is a planning aid. It is not statutory bookkeeping, a full cash budget, an official tax calculator, a loan offer or regulated financial advice.

Not yet modelled:

### VAT

- Input VAT recovery and net VAT payable/refundable
- Different VAT rates by individual product or service line
- VAT-exempt sales and mixed taxable/exempt activity
- VAT reporting periods and payment timing

### Cash flow and financing

- Monthly sales ramp-up and seasonality
- Customer payment terms and delayed receivables
- Supplier payment terms and payable schedules
- Opening balance sheet and complete balance-sheet forecast
- Loan amortisation schedule and changing interest charges
- Monthly cash-flow forecast and repayment-capacity ratio
- Detailed changes in working capital

### Finnish taxation and employment

- Toiminimi personal income taxation and earned/capital income split
- Oy corporate tax and owner salary/dividend scenarios
- Tax-specific depreciation
- YEL calculation from confirmed YEL work income
- Detailed payroll, TyEL, employer contributions and holiday-pay accrual
- Industry licences, insurance and regulatory requirements

### Industry-specific operations

- Billable capacity and employee utilisation
- Materials, ingredients and consumables
- Waste and inventory turnover
- Shifts and labour productivity
- Commissions and card-payment fees
- Occupancy, bookings and seasonal demand
- Project-based work and subcontracting

Verify Finnish regulations and assumptions before relying on outputs for tax, financing or contractual decisions.

---

## 9. Development roadmap

The project should keep one common financial engine and extend it with optional industry presets.

### Stage 1 — General model validation

- Keep the validation cases and add further scenarios from actual KF Biz work.
- Compare selected outputs with independently prepared calculations.
- Complete live browser sign-in and Supabase scenario save/load/update/delete tests.
- Validate the monthly cash-flow and funding logic against a start-up ramp-up example.

### Stage 2 — Industry modules

Initial industry priorities for investigation:

1. Cleaning and property-maintenance services
2. Beauty, hair and wellness
3. Restaurants, cafés and food businesses
4. Construction and skilled trades
5. Consulting and professional services

Retail and e-commerce should also be considered as an early extension.

These are development hypotheses based on the intended KF Biz audience, not confirmed rankings of actual customer demand. Review the priorities using real enquiry and paying-customer data.

### Stage 3 — More detailed Finnish financial calculations

- Multiple VAT rates by revenue line and purchase category
- VAT payment and refund timing
- Detailed monthly cash-flow planning
- Payment terms and working-capital timing
- Loan amortisation and repayment capacity
- Detailed payroll and YEL assumptions
- Separate toiminimi and Oy planning models where appropriate

### Stage 4 — Reporting and scenario comparison

- Side-by-side scenario comparison
- Monthly and annual forecast views
- Clearer reports for business plans and financing discussions
- Input validation and warnings for unrealistic assumptions
- Historical scenarios associated with their calculation model version

---

## 10. Version history

### Version 2 — Validation improvements

- Extracted the calculation engine into `model.mjs` so it can be tested independently of the browser UI.
- Added a dedicated YEL cost input.
- Added a cash break-even result that includes owner cash target, loan principal, investment outflow and the illustrative tax reserve.
- Updated the working-capital reserve to include the illustrative tax reserve and ongoing investment.
- Updated the forecast so direct costs scale with sales volume and cost inflation.
- Kept depreciation constant until a proper asset schedule is added.
- Added repeatable tests for the benchmark and edge cases.
- Documented a Turku cleaning-service benchmark and its limitations.

### Version 1 — General financial calculation baseline

- Created the first browser-based financial calculator.
- Added multiple revenue lines, direct costs and general operating costs.
- Added profitability, break-even, startup funding and cash movement estimates.
- Added three-year forecast and simple sensitivity cases.
- Added Supabase sign-in and private scenario persistence code.
- Added CSV export and responsive styling.

**Current model version:** `2`

**Next milestone:** complete end-to-end browser testing and build a monthly cash-flow forecast before using the calculator as a funding-capacity model.
