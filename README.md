# KF Biz — Financial Calculation

A private financial-planning workspace for KF Biz. The project is designed to help estimate the financial requirements and performance of small businesses in Finland, compare business scenarios, and prepare structured forecasts for business planning and financing discussions.

The project starts with a **general-purpose financial model**. Industry-specific templates will be added as extensions to the same calculation system, rather than creating separate applications for every industry.

- **Current model version:** 1
- **Currency:** EUR
- **Primary market:** Finland
- **Application type:** Browser-based web application
- **Data storage:** Supabase Postgres
- **Repository:** [kfbiz/Financial-calculation](https://github.com/kfbiz/Financial-calculation)

---

## 1. Current project status

Version 1 provides the first general financial calculation workflow.

| Component | Current status |
| --- | --- |
| General revenue and direct-cost model | Implemented |
| Operating cost categories and staff-cost input | Implemented |
| Gross profit, gross margin and EBITDA | Implemented |
| Estimated net result and illustrative tax reserve | Implemented |
| Break-even turnover | Implemented |
| Startup funding and working-capital estimate | Implemented |
| Monthly cash movement and cash runway indicator | Implemented |
| Three-year forecast | Implemented |
| Basic downside and upside sensitivity test | Implemented |
| Supabase scenario saving and retrieval | Implemented in application code; complete live browser test still required |
| CSV export | Implemented |
| Industry-specific calculation modules | Planned |
| Detailed VAT and monthly cash-timing model | Planned |

The calculations update in the browser as inputs change. Scenarios can be saved to Supabase, retrieved, edited, deleted and exported as CSV after signing in.

A separate Excel workbook template was also prepared as an offline planning reference. That workbook is currently separate from this GitHub repository; it is not one of the deployed application files.

---

## 2. Main application files

| File | Responsibility |
| --- | --- |
| `index.html` | Page structure, input sections, result panels and forecast table |
| `styles.css` | Responsive layout and visual styling for desktop and mobile |
| `app.js` | Input handling, financial formulas, live calculations, authentication, database operations and CSV export |
| `README.md` | Project documentation and setup guide |

The application loads the pinned Supabase JavaScript client, `@supabase/supabase-js@2.117.3`, from jsDelivr. No local build process or package installation is required for the current static version.

---

## 3. What the general calculator includes

### Business and scenario information

- Scenario name
- Business name
- Industry category
- Legal form: toiminimi, Oy or other
- EUR as the reporting currency

### Revenue and direct costs

The calculator supports multiple revenue streams. Each line has:

- Product or service name
- Selling price per unit, excluding VAT
- Estimated quantity sold per month
- Direct cost per unit, excluding VAT

The calculator derives monthly turnover, direct costs, gross profit and gross margin from these entries.

### Operating costs

The general operating-cost inputs include:

- Premises and rent
- Electricity, water and utilities
- Software, IT and phone
- Accounting and administration
- Marketing and sales
- Insurance and memberships
- Vehicle and travel
- Other operating costs
- Total employer cost for staff
- Estimated depreciation

Staff cost is entered as one combined monthly estimate in this first version. Detailed wage, employer-contribution and employee-level calculations are not yet included.

### Startup funding and cash planning

The model includes one-off startup expenditure:

- Equipment and setup
- Initial inventory and supplies
- Deposits, licences and pre-opening expenses
- Working-capital buffer in months

Funding sources include:

- Owner's contribution
- Grants or other confirmed funding
- Planned loan funding

Additional cash-flow inputs include:

- Cash available after setup
- Monthly loan principal repayment
- Monthly interest and financing costs
- Owner's cash-withdrawal target
- Ongoing monthly investments

**Important distinction:** accounting profitability and cash movement are not the same. For a toiminimi, the owner's private withdrawals are treated as a cash-flow item, not as a deductible salary expense in the profit calculation.

### Planning assumptions

- Annual revenue growth
- Annual cost increase
- Illustrative tax-reserve percentage
- Average sales VAT rate

These assumptions are editable and should be changed to match the business being assessed.

---

## 4. Calculation methodology

All sales prices, turnover and operating costs are entered **excluding VAT**. The current VAT amount is a planning estimate based on one selected average sales VAT rate.

The main formulas are:

**Revenue**

`Monthly turnover = Sum of (unit selling price × monthly quantity)`

**Direct costs**

`Monthly direct costs = Sum of (direct cost per unit × monthly quantity)`

**Gross profit and margin**

`Gross profit = Turnover − Direct costs`

`Gross margin = Gross profit ÷ Turnover`

**Operating result**

`EBITDA = Turnover − Direct costs − operating costs − staff costs`

`Result before tax estimate = EBITDA − depreciation − financing interest`

`Illustrative tax reserve = max(0, result before tax × selected reserve rate)`

`Estimated net result = result before tax − illustrative tax reserve`

The tax reserve is only a user-selected planning assumption. It is not a Finnish tax calculation.

**Break-even turnover**

`Break-even turnover = (operating costs + depreciation + financing interest) ÷ gross-margin ratio`

A meaningful break-even estimate requires a positive gross margin. The figure is not calculated when the gross-margin ratio is zero or negative.

**Monthly cash movement**

`Monthly cash movement = EBITDA − interest − tax reserve − loan principal repayment − owner withdrawals − ongoing investment`

`Cash after one month = starting cash + monthly cash movement`

The runway indicator estimates how many months the starting cash could cover the current monthly cash deficit. It is a simplified indicator, not a detailed monthly cash budget.

**Startup funding requirement**

`Working-capital estimate = (direct costs + operating costs + interest + loan repayment + owner withdrawal target) × selected buffer months`

`Total funding requirement = one-off startup costs + working-capital estimate`

`Funding gap = max(0, total funding requirement − entered funding sources)`

This is an initial planning estimate. It does not yet account for exact payment dates, VAT settlement dates or a detailed opening balance sheet.

**Three-year forecast**

The forecast annualises the current monthly run rate and applies the selected assumptions:

- Revenue changes according to the annual revenue-growth assumption.
- Direct and operating costs change according to the annual cost-increase assumption.
- Depreciation is increased using the cost-increase assumption.
- Interest is held constant in the current simplified forecast.
- The illustrative tax reserve is applied to positive estimated pre-tax results.

This is a scenario based on the assumptions entered, not a prediction of actual future performance.

**Stress test**

The current directional sensitivity cases are:

- Downside: revenue decreases by 20% and direct and operating costs increase by 10%.
- Upside: revenue increases by 10% and direct and operating costs increase by 5%.

These are simple examples for testing sensitivity. They are not statistical probabilities or industry benchmarks.

---

## 5. Supabase database and data protection

The application uses the Supabase project:

[Financial-calculation project dashboard](https://supabase.com/dashboard/project/crevbddanoyhgrrbutzl)

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
| `inputs` | JSON object containing the assumptions |
| `results` | JSON object containing calculated results |
| `created_at`, `updated_at` | Record timestamps |

### Access-control model

- Row Level Security (RLS) is enabled on `financial_scenarios`.
- Authenticated users can only read, insert, update or delete rows where `user_id = auth.uid()`.
- Anonymous access to this table is revoked.
- The frontend uses the Supabase publishable key. A service-role key or secret key must never be placed in browser code or committed to GitHub.
- The application currently provides sign-in but not public self-registration.

The repository is public, so the application source and publishable key can be viewed by anyone. The publishable key is intended for frontend use; actual data access must remain protected by database grants and RLS policies. Do not treat a hidden page or an unlisted URL as data security.

### Create the private operator account

1. Open the Supabase project.
2. Navigate to **Authentication → Users**.
3. Add the intended user with an email address and password.
4. Confirm the account if Supabase requests it.
5. Open the deployed application and sign in.

Only create additional accounts when you intentionally want those account holders to use the calculator. RLS keeps each account's saved scenarios separated.

---

## 6. Publish with GitHub Pages

The application is a static website and can be hosted using GitHub Pages.

1. Open this repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main` and folder `/(root)`.
5. Save the settings and wait for the deployment to complete.
6. Open:

   `https://kfbiz.github.io/Financial-calculation/`

7. In Supabase, open **Authentication → URL Configuration**. Set the Site URL to the deployed address and add it to the Redirect URLs allow-list if required by the project's settings.

When application files are changed on the `main` branch, GitHub Pages publishes the updated static files after its deployment completes.

---

## 7. Current limitations and items requiring careful review

Version 1 is a financial planning aid. It is not statutory bookkeeping, an official cash budget, a tax-return calculator, a loan offer or regulated financial advice.

The following areas are not yet modelled in sufficient detail:

### VAT

- Input VAT recovery and the net VAT payable or refundable
- VAT payment and reporting periods
- Different VAT rates for individual products and services
- VAT-exempt sales and mixed taxable/exempt activity
- VAT treatment of purchases, imports and cross-border transactions

### Cash flow and working capital

- Customer payment terms and delayed receivables
- Supplier payment terms and payment schedules
- Monthly cash-flow forecasts and seasonality
- Opening balances and a full balance sheet
- Separate timing of loan drawdowns and repayments
- VAT settlement timing

### Finnish tax and legal-form differences

- Toiminimi taxation and the interaction with the entrepreneur's personal taxation
- Oy corporate tax and salary/dividend scenarios
- Tax-deductible depreciation rules
- YEL calculations and eligibility thresholds
- Detailed payroll, TyEL and employer contributions
- Industry-specific licences, insurance and regulatory obligations

### Industry-specific operating assumptions

- Capacity and billable utilisation
- Materials, ingredients and consumables
- Product waste and stock turnover
- Employee shifts and labour productivity
- Commissions and payment-service fees
- Occupancy, bookings and seasonal demand
- Project-based work and subcontractors

Verify applicable Finnish regulations and assumptions before relying on the outputs for tax, funding or contractual decisions.

---

## 8. Planned development roadmap

The development should preserve one common financial engine and extend it with optional industry modules.

### Stage 1 — Validate the general model

- Test several realistic small-business examples.
- Compare results against independently prepared calculations.
- Check formula behaviour when revenue is zero, gross margin is negative, costs are high or cash is insufficient.
- Test saving, loading, updating, deleting and exporting scenarios in a live browser session.
- Correct any formula or usability issues found during testing.

### Stage 2 — Build industry presets

The initial industries to investigate are:

1. Cleaning and property-maintenance services
2. Beauty, hair and wellness
3. Restaurants, cafés and food businesses
4. Construction and skilled trades
5. Consulting and professional services

Retail and e-commerce should also be considered as an early extension.

These are development priorities based on KF Biz's intended small-business and startup-planning audience. They are not confirmed rankings of actual customer demand. The order should be reviewed as real enquiries and paying-customer data become available.

### Stage 3 — Add more detailed Finnish financial logic

- Multiple VAT rates by revenue line and purchase category
- More realistic VAT timing
- Detailed monthly cash-flow planning
- Payment terms and working-capital timing
- More detailed payroll and employer-cost assumptions
- Separate calculations for toiminimi and Oy where appropriate

### Stage 4 — Improve reporting and scenario comparison

- Compare multiple scenarios side by side.
- Add monthly and annual forecast views.
- Produce clearer reports for business-plan and financing discussions.
- Add validation messages for incomplete or unrealistic assumptions.
- Keep historical scenarios identifiable by calculation model version.

---

## 9. Version history

### Version 1 — General financial calculation baseline

- Created the initial browser-based financial calculator.
- Added revenue streams, direct costs and general operating costs.
- Added profitability, break-even, startup funding and cash-flow estimates.
- Added three-year forecast and basic sensitivity scenarios.
- Added Supabase authentication and private scenario persistence.
- Added CSV report export.
- Added responsive desktop and mobile styling.
- Established the initial roadmap for industry-specific extensions.

**Current model version:** `1`

**Next milestone:** validate the general calculation formulas and complete end-to-end browser testing before relying on saved scenarios for real business-planning work.
