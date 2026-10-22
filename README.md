# KF Biz — General Financial Calculation

A private, browser-based financial planning workspace for KF Biz. Version 1 is the reusable baseline model; industry-specific assumptions will be added in later iterations.

## What the first version does

- Builds monthly revenue estimates from multiple products or services (unit price × monthly quantity), with direct cost per unit.
- Calculates gross profit, gross margin, operating costs, EBITDA, estimated result before tax, an illustrative tax reserve and net result.
- Estimates accounting-style and cash-oriented break-even turnover.
- Estimates sales VAT using one editable average rate. Revenue and costs are entered excluding VAT.
- Estimates startup funding needs from one-off setup costs and a selected working-capital buffer, compared with owner funding, grants and planned loan funding.
- Tracks cash movement after finance interest, principal repayments, owner cash withdrawals and ongoing investments.
- Projects revenue, costs and net result over three years with editable growth and cost-inflation assumptions.
- Runs simple downside and upside sensitivity cases.
- Saves, loads, deletes and exports scenarios as CSV.

The model deliberately separates **profitability** from **cash flow**. Owner withdrawals are a cash-flow item; for a toiminimi they are not treated as a deductible salary expense.

## Repository files

| File | Purpose |
| --- | --- |
| `index.html` | Application page and data-entry sections |
| `styles.css` | Responsive desktop/mobile layout |
| `app.js` | Calculation engine, Supabase authentication and scenario persistence |

The page loads the pinned `@supabase/supabase-js@2.117.3` package from jsDelivr. No build step is required.

## Supabase database

Project: [Financial-calculation in Supabase](https://supabase.com/dashboard/project/crevbddanoyhgrrbutzl)

The first database table is `public.financial_scenarios`. It stores:
- owner ID (`user_id`, linked to `auth.users`)
- scenario name, business name, industry category and legal form
- model version
- input assumptions and calculated results as JSON objects
- created and updated timestamps

### Data protection model

Row Level Security (RLS) is enabled. The `authenticated` role has only the table operations needed by the app, and its policies require `auth.uid() = user_id` for reading, inserting, updating and deleting records. Anonymous access to the scenario table is revoked. The browser contains the Supabase **publishable** key only; never put a service-role or secret key in the repository.

The calculator interface intentionally has no public sign-up flow. To create the private operator account:

1. Open Supabase **Authentication → Users**.
2. Add a user with your email and a password, and confirm the user if the dashboard offers that option.
3. Open the app and sign in with that account.

Only create other accounts when you intend to let their owners use the calculator. RLS separates each account's saved scenarios.

## Publish with GitHub Pages

1. Open this repository's **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Choose branch `main` and folder `/(root)`, then save.
4. Wait for the first deployment to finish. The expected project URL is:

   `https://kfbiz.github.io/Financial-calculation/`

5. In Supabase **Authentication → URL Configuration**, set the Site URL to the deployed address and include the URL in the Redirect URLs allow-list if required by your project settings.

The source repository and sign-in page are public if GitHub Pages is used on a public repository. The saved business data remains protected by authentication and RLS; keep account creation disabled in the app.

## Current calculation rules

- Prices, turnover and operating costs are modelled excluding VAT.
- Direct costs vary with monthly unit volume.
- Fixed operating costs include eight general categories plus entered all-in employer cost for staff.
- EBITDA = turnover − direct costs − operating costs and staff.
- Result before tax = EBITDA − depreciation − financing interest.
- Illustrative tax reserve = max(0, result before tax × selected reserve rate). This is not a Finnish tax calculation.
- Net result = result before tax − illustrative tax reserve.
- Monthly cash movement = EBITDA − interest − tax reserve − principal repayments − owner withdrawals − ongoing investment.
- Estimated break-even turnover uses the gross-margin ratio. If gross margin is zero or negative, the break-even figure is not meaningful.
- Startup funding requirement = one-off startup costs + the selected number of months of estimated operating cash outflow. A funding gap is floored at zero.
- The three-year forecast annualises the current monthly run rate and applies growth/inflation assumptions. It is a scenario, not a prediction.

## Important limitations before business decisions

Version 1 is a planning aid, not statutory accounting, tax advice, a loan offer or an official cash budget. It does not yet model:
- input VAT recovery and actual VAT-payment timing
- multiple VAT rates at individual revenue-line level
- customer payment terms, receivables, supplier terms or monthly seasonality
- full balance sheet, depreciation rules for tax, or legal-form-specific taxation
- detailed payroll, YEL/TyEL and other employer obligation calculations
- industry-specific capacity, material usage, waste, commissions, occupancy, seasonality or utilisation

Check applicable Finnish regulations and assumptions before using results for tax, financing or contractual decisions.

## Planned extension order

1. Validate the general model using KF Biz's own scenarios.
2. Add industry presets without changing the common calculation engine.
3. Prioritise likely KF Biz startup-planning segments for review: cleaning services, beauty/hair/wellness, restaurants/cafés, retail/e-commerce and professional services. This is a working hypothesis to validate against actual enquiries—not confirmed customer-demand data.
4. Add industry-specific products/services, labour capacity, materials, seasonal sales patterns, startup investment categories and risk assumptions where useful.
5. Add monthly cash timing and more detailed VAT modelling after the baseline formulas have been tested.

## Version

- Current model version: `1`
- Initial reusable general calculator: October 2026
