import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm';

// A publishable key is designed for browser use. Never put a Supabase service-role/secret key here.
const SUPABASE_URL = 'https://crevbddanoyhgrrbutzl.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_YXRWS3otVosqlt1gYCaK5w_3sUq8nFV';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const MODEL_VERSION = 1;
const COST_KEYS = ['premises', 'utilities', 'software', 'accounting', 'marketing', 'insurance', 'transport', 'other'];
let activeScenarioId = null;
let currentUser = null;
let lastCalculation = null;
let revenueLineCounter = 0;
const $ = (id) => document.getElementById(id);
const euro = (value) => new Intl.NumberFormat('en-FI', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);
const euro2 = (value) => new Intl.NumberFormat('en-FI', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
const percent = (value) => Number.isFinite(value) ? (value * 100).toLocaleString('en-FI', { maximumFractionDigits: 1 }) + '%' : '—';
const num = (id) => {
  const value = Number($(id).value);
  return Number.isFinite(value) ? value : 0;
};
const setText = (id, value) => { $(id).textContent = value; };
const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

function setMessage(id, message, type) {
  const el = $(id);
  el.textContent = message || '';
  el.className = 'form-message' + (type ? ' ' + type : '');
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function addRevenueRow(item = {}) {
  revenueLineCounter += 1;
  const row = document.createElement('tr');
  row.dataset.lineId = String(revenueLineCounter);
  row.innerHTML =
    '<td><input aria-label="Product or service name" class="line-name" type="text" maxlength="100" placeholder="Product / service" value="' + escapeHtml(item.name || '') + '"></td>' +
    '<td><input aria-label="Selling price excluding VAT" class="line-price" type="number" min="0" step="0.01" value="' + safeNumber(item.price) + '"></td>' +
    '<td><input aria-label="Monthly sales quantity" class="line-quantity" type="number" min="0" step="0.1" value="' + safeNumber(item.quantity) + '"></td>' +
    '<td><input aria-label="Direct cost per unit excluding VAT" class="line-direct-cost" type="number" min="0" step="0.01" value="' + safeNumber(item.directCost) + '"></td>' +
    '<td class="calculated-cell line-sales">€0</td>' +
    '<td><button class="remove-row" type="button" aria-label="Remove revenue line" title="Remove line">×</button></td>';
  $('revenue-rows').appendChild(row);
  row.querySelectorAll('input').forEach((input) => input.addEventListener('input', calculate));
  row.querySelector('.remove-row').addEventListener('click', () => {
    if ($('revenue-rows').querySelectorAll('tr').length <= 1) {
      row.querySelectorAll('input').forEach((input) => input.value = input.classList.contains('line-name') ? '' : '0');
    } else {
      row.remove();
    }
    calculate();
  });
  calculate();
}
function getRevenueLines() {
  return Array.from($('revenue-rows').querySelectorAll('tr')).map((row) => ({
    name: row.querySelector('.line-name').value.trim(),
    price: Math.max(0, safeNumber(row.querySelector('.line-price').value)),
    quantity: Math.max(0, safeNumber(row.querySelector('.line-quantity').value)),
    directCost: Math.max(0, safeNumber(row.querySelector('.line-direct-cost').value))
  }));
}
function readInputs() {
  const costs = {};
  COST_KEYS.forEach((key) => { costs[key] = Math.max(0, safeNumber(document.querySelector('[data-cost="' + key + '"]').value)); });
  return {
    scenarioName: $('scenario-name').value.trim() || 'Untitled scenario',
    businessName: $('business-name').value.trim(),
    industry: $('industry').value,
    legalForm: $('legal-form').value,
    revenueLines: getRevenueLines(),
    costs,
    employeeCost: Math.max(0, num('employee-cost')),
    depreciation: Math.max(0, num('depreciation')),
    startupEquipment: Math.max(0, num('startup-equipment')),
    startupInventory: Math.max(0, num('startup-inventory')),
    startupDeposit: Math.max(0, num('startup-deposit')),
    workingCapitalMonths: Math.max(0, Math.min(24, num('working-capital-months'))),
    ownerFunding: Math.max(0, num('owner-funding')),
    grantFunding: Math.max(0, num('grant-funding')),
    newLoan: Math.max(0, num('new-loan')),
    cashStart: Math.max(0, num('cash-start')),
    loanRepayment: Math.max(0, num('loan-repayment')),
    interestCost: Math.max(0, num('interest-cost')),
    ownerDraw: Math.max(0, num('owner-draw')),
    monthlyInvestment: Math.max(0, num('monthly-investment')),
    revenueGrowth: Math.max(-100, Math.min(500, num('revenue-growth'))) / 100,
    costInflation: Math.max(-50, Math.min(200, num('cost-inflation'))) / 100,
    taxReserve: Math.max(0, Math.min(100, num('tax-reserve'))) / 100,
    salesVatRate: Math.max(0, num('sales-vat-rate')) / 100
  };
}
function buildCalculation(inputs) {
  const revenue = inputs.revenueLines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const variableCost = inputs.revenueLines.reduce((sum, line) => sum + line.directCost * line.quantity, 0);
  const grossProfit = revenue - variableCost;
  const grossMarginRatio = revenue > 0 ? grossProfit / revenue : 0;
  const operatingCosts = Object.values(inputs.costs).reduce((sum, value) => sum + value, 0) + inputs.employeeCost;
  const ebitda = grossProfit - operatingCosts;
  const ebit = ebitda - inputs.depreciation;
  const pretax = ebit - inputs.interestCost;
  const tax = Math.max(0, pretax * inputs.taxReserve);
  const netResult = pretax - tax;
  const monthlyCashMovement = ebitda - inputs.interestCost - tax - inputs.loanRepayment - inputs.ownerDraw - inputs.monthlyInvestment;
  const startupNeed = inputs.startupEquipment + inputs.startupInventory + inputs.startupDeposit;
  const workingCapitalNeed = (variableCost + operatingCosts + inputs.interestCost + inputs.loanRepayment + inputs.ownerDraw) * inputs.workingCapitalMonths;
  const fundingSources = inputs.ownerFunding + inputs.grantFunding + inputs.newLoan;
  const fundingRequired = startupNeed + workingCapitalNeed;
  const fundingGap = Math.max(0, fundingRequired - fundingSources);
  const breakEvenOperating = grossMarginRatio > 0 ? (operatingCosts + inputs.depreciation + inputs.interestCost) / grossMarginRatio : null;
  const cashFixedOutflow = operatingCosts + inputs.interestCost + inputs.loanRepayment + inputs.ownerDraw;
  const breakEvenCash = grossMarginRatio > 0 ? cashFixedOutflow / grossMarginRatio : null;
  const monthlyVat = revenue * inputs.salesVatRate;
  const endingCash = inputs.cashStart + monthlyCashMovement;
  const runway = monthlyCashMovement < 0 ? inputs.cashStart / Math.abs(monthlyCashMovement) : (inputs.cashStart > 0 ? Infinity : null);
  const forecasts = [0, 1, 2].map((yearIndex) => {
    const revenueFactor = Math.pow(1 + inputs.revenueGrowth, yearIndex);
    const costFactor = Math.pow(1 + inputs.costInflation, yearIndex);
    const yRevenue = revenue * revenueFactor * 12;
    const yVariable = variableCost * costFactor * 12;
    const yOperating = operatingCosts * costFactor * 12;
    const yEbitda = yRevenue - yVariable - yOperating;
    const yDepr = inputs.depreciation * 12 * costFactor;
    const yInterest = inputs.interestCost * 12;
    const yPretax = yEbitda - yDepr - yInterest;
    const yTax = Math.max(0, yPretax * inputs.taxReserve);
    return { revenue: yRevenue, variable: yVariable, gross: yRevenue - yVariable, fixed: yOperating, ebitda: yEbitda, depreciation: yDepr, interest: yInterest, tax: yTax, net: yPretax - yTax };
  });
  const downsideEbitda = revenue * 0.8 - variableCost * 0.8 * 1.1 - operatingCosts * 1.1;
  const downsideNet = downsideEbitda - inputs.depreciation - inputs.interestCost - Math.max(0, (downsideEbitda - inputs.depreciation - inputs.interestCost) * inputs.taxReserve);
  const upsideEbitda = revenue * 1.1 - variableCost * 1.1 * 1.05 - operatingCosts * 1.05;
  const upsideNet = upsideEbitda - inputs.depreciation - inputs.interestCost - Math.max(0, (upsideEbitda - inputs.depreciation - inputs.interestCost) * inputs.taxReserve);
  return {
    revenue, variableCost, grossProfit, grossMarginRatio, operatingCosts, ebitda, depreciation: inputs.depreciation,
    ebit, interest: inputs.interestCost, pretax, tax, netResult, monthlyCashMovement, startupNeed,
    workingCapitalNeed, fundingSources, fundingRequired, fundingGap, breakEvenOperating, breakEvenCash,
    monthlyVat, endingCash, runway, forecasts, downsideNet, upsideNet
  };
}
function calculate() {
  const inputs = readInputs();
  const result = buildCalculation(inputs);
  lastCalculation = { inputs, result };
  const monthlyCashDeficit = Math.max(0, -result.monthlyCashMovement);
  setText('revenue-total', euro2(result.revenue));
  setText('hero-revenue', euro(result.revenue));
  setText('hero-margin', percent(result.grossMarginRatio));
  setText('hero-ebitda', euro(result.ebitda));
  setText('kpi-net', euro(result.netResult));
  setText('kpi-breakeven', result.breakEvenOperating === null ? 'Not calculable' : euro(result.breakEvenOperating));
  setText('kpi-cash', euro(result.endingCash));
  setText('kpi-runway', result.monthlyCashMovement >= 0 ? 'No current burn' : (Number.isFinite(result.runway) ? result.runway.toLocaleString('en-FI', {maximumFractionDigits:1}) + ' months' : '—'));
  setText('kpi-vat', euro(result.monthlyVat));
  setText('funding-required', euro(result.fundingRequired));
  setText('funding-sources', euro(result.fundingSources));
  setText('funding-gap', euro(result.fundingGap));
  setText('stress-down', euro(result.downsideNet));
  setText('stress-up', euro(result.upsideNet));
  document.querySelectorAll('#revenue-rows tr').forEach((row) => {
    const price = Math.max(0, safeNumber(row.querySelector('.line-price').value));
    const quantity = Math.max(0, safeNumber(row.querySelector('.line-quantity').value));
    row.querySelector('.line-sales').textContent = euro2(price * quantity);
  });
  result.forecasts.forEach((year, i) => {
    setText('forecast-revenue-' + i, euro(year.revenue));
    setText('forecast-variable-' + i, euro(year.variable));
    setText('forecast-gross-' + i, euro(year.gross));
    setText('forecast-fixed-' + i, euro(year.fixed));
    setText('forecast-ebitda-' + i, euro(year.ebitda));
    setText('forecast-depr-' + i, euro(year.depreciation));
    setText('forecast-interest-' + i, euro(year.interest));
    setText('forecast-tax-' + i, euro(year.tax));
    setText('forecast-net-' + i, euro(year.net));
  });
  const cashMessage = $('health-message');
  cashMessage.className = 'health-message';
  if (result.revenue <= 0) {
    cashMessage.textContent = 'Add at least one sales estimate. Results remain zero until revenue is entered.';
  } else if (result.grossMarginRatio <= 0) {
    cashMessage.textContent = 'Direct costs equal or exceed revenue. Review your prices, sales mix and delivery costs.';
    cashMessage.classList.add('danger');
  } else if (result.endingCash < 0) {
    cashMessage.textContent = 'Projected cash turns negative after one month. Review cash reserves, pricing, cost timing or financing.';
    cashMessage.classList.add('danger');
  } else if (result.fundingGap > 0) {
    cashMessage.textContent = 'The startup plan has an estimated funding gap. A lender or grant provider may use different assumptions.';
    cashMessage.classList.add('warning');
  } else if (result.ebitda < 0) {
    cashMessage.textContent = 'Monthly operations are below break-even at this sales level. Test a higher sales volume or a leaner cost base.';
    cashMessage.classList.add('warning');
  } else {
    cashMessage.textContent = 'At this run rate, operating earnings are positive. Test a downside case and verify cash timing before making commitments.';
  }
  return { inputs, result };
}
function syncYearLabels() {
  const startYear = new Date().getFullYear();
  [0, 1, 2].forEach((i) => setText('year-' + (i + 1) + '-heading', 'Year ' + (startYear + i)));
}
function gatherPayload() {
  const calculation = calculate();
  return {
    user_id: currentUser.id,
    name: calculation.inputs.scenarioName,
    business_name: calculation.inputs.businessName,
    industry_category: calculation.inputs.industry,
    legal_form: calculation.inputs.legalForm,
    currency: 'EUR',
    model_version: MODEL_VERSION,
    inputs: calculation.inputs,
    results: calculation.result,
    updated_at: new Date().toISOString()
  };
}
function restoreInputs(inputs = {}) {
  $('scenario-name').value = inputs.scenarioName || 'Base case';
  $('business-name').value = inputs.businessName || '';
  $('industry').value = inputs.industry || 'general';
  $('legal-form').value = inputs.legalForm || 'toiminimi';
  const revenueRows = Array.isArray(inputs.revenueLines) && inputs.revenueLines.length ? inputs.revenueLines : [{name:'',price:0,quantity:0,directCost:0}];
  $('revenue-rows').innerHTML = '';
  revenueLineCounter = 0;
  revenueRows.forEach(addRevenueRow);
  COST_KEYS.forEach((key) => { document.querySelector('[data-cost="' + key + '"]').value = safeNumber((inputs.costs || {})[key]); });
  const mapping = {
    'employee-cost':'employeeCost', depreciation:'depreciation', 'startup-equipment':'startupEquipment',
    'startup-inventory':'startupInventory', 'startup-deposit':'startupDeposit', 'working-capital-months':'workingCapitalMonths',
    'owner-funding':'ownerFunding', 'grant-funding':'grantFunding', 'new-loan':'newLoan', 'cash-start':'cashStart',
    'loan-repayment':'loanRepayment', 'interest-cost':'interestCost', 'owner-draw':'ownerDraw',
    'monthly-investment':'monthlyInvestment', 'revenue-growth':'revenueGrowth', 'cost-inflation':'costInflation',
    'tax-reserve':'taxReserve', 'sales-vat-rate':'salesVatRate'
  };
  Object.entries(mapping).forEach(([id, key]) => {
    const val = inputs[key];
    $(id).value = val === undefined || val === null ? (id === 'working-capital-months' ? 3 : id === 'revenue-growth' ? 5 : id === 'cost-inflation' ? 3 : id === 'tax-reserve' ? 20 : id === 'sales-vat-rate' ? 25.5 : 0) : (['revenueGrowth','costInflation','taxReserve'].includes(key) ? Number(val) * 100 : safeNumber(val));
  });
  activeScenarioId = null;
  $('delete-scenario-button').disabled = true;
  calculate();
}
async function refreshScenarios(selectId = '') {
  const { data, error } = await supabase.from('financial_scenarios')
    .select('id,name,business_name,industry_category,updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const select = $('saved-scenarios');
  select.innerHTML = '';
  if (!data || !data.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No saved scenarios yet';
    select.appendChild(option);
    $('delete-scenario-button').disabled = true;
    return [];
  }
  data.forEach((scenario) => {
    const option = document.createElement('option');
    option.value = scenario.id;
    const when = scenario.updated_at ? new Date(scenario.updated_at).toLocaleDateString() : '';
    option.textContent = scenario.name + (scenario.business_name ? ' · ' + scenario.business_name : '') + (when ? ' · ' + when : '');
    select.appendChild(option);
  });
  select.value = selectId && data.some((item) => item.id === selectId) ? selectId : data[0].id;
  $('delete-scenario-button').disabled = false;
  return data;
}
async function saveScenario() {
  if (!currentUser) return;
  const payload = gatherPayload();
  let response;
  if (activeScenarioId) {
    response = await supabase.from('financial_scenarios').update(payload).eq('id', activeScenarioId).select('id').single();
  } else {
    response = await supabase.from('financial_scenarios').insert(payload).select('id').single();
  }
  if (response.error) throw response.error;
  activeScenarioId = response.data.id;
  await refreshScenarios(activeScenarioId);
  setMessage('workspace-message', 'Scenario saved securely.', 'success');
}
async function loadScenario() {
  const id = $('saved-scenarios').value;
  if (!id || !currentUser) return;
  const { data, error } = await supabase.from('financial_scenarios')
    .select('id,name,business_name,industry_category,legal_form,inputs')
    .eq('id', id).single();
  if (error) throw error;
  activeScenarioId = data.id;
  restoreInputs(data.inputs || {});
  $('scenario-name').value = data.name || 'Untitled scenario';
  $('business-name').value = data.business_name || '';
  $('industry').value = data.industry_category || 'general';
  $('legal-form').value = data.legal_form || 'toiminimi';
  $('delete-scenario-button').disabled = false;
  setMessage('workspace-message', 'Loaded: ' + data.name, 'success');
}
async function deleteScenario() {
  const id = activeScenarioId || $('saved-scenarios').value;
  if (!id || !currentUser) return;
  const confirmed = window.confirm('Delete this saved scenario? This cannot be undone.');
  if (!confirmed) return;
  const { error } = await supabase.from('financial_scenarios').delete().eq('id', id);
  if (error) throw error;
  activeScenarioId = null;
  restoreInputs({});
  await refreshScenarios();
  setMessage('workspace-message', 'Scenario deleted.', 'success');
}
function exportCsv() {
  const { inputs, result } = calculate();
  const rows = [
    ['Financial Calculation — KF Biz'],
    ['Scenario', inputs.scenarioName],
    ['Business', inputs.businessName],
    ['Industry', inputs.industry],
    ['Business form', inputs.legalForm],
    [],
    ['Monthly summary', 'EUR'],
    ['Turnover excluding VAT', result.revenue],
    ['Direct costs', result.variableCost],
    ['Gross profit', result.grossProfit],
    ['Gross margin %', result.grossMarginRatio],
    ['Operating costs including staff', result.operatingCosts],
    ['EBITDA', result.ebitda],
    ['Depreciation', result.depreciation],
    ['Interest and finance costs', result.interest],
    ['Illustrative tax reserve', result.tax],
    ['Estimated net result', result.netResult],
    ['Estimated monthly cash movement', result.monthlyCashMovement],
    ['Cash after one month', result.endingCash],
    ['Break-even turnover per month', result.breakEvenOperating === null ? '' : result.breakEvenOperating],
    ['Estimated sales VAT per month', result.monthlyVat],
    ['Startup requirement', result.fundingRequired],
    ['Confirmed / planned funding entered', result.fundingSources],
    ['Funding gap', result.fundingGap],
    [],
    ['Three-year forecast', 'Year 1', 'Year 2', 'Year 3'],
    ['Turnover', ...result.forecasts.map((x) => x.revenue)],
    ['Direct costs', ...result.forecasts.map((x) => x.variable)],
    ['Gross profit', ...result.forecasts.map((x) => x.gross)],
    ['Operating costs and staff', ...result.forecasts.map((x) => x.fixed)],
    ['EBITDA', ...result.forecasts.map((x) => x.ebitda)],
    ['Net result estimate', ...result.forecasts.map((x) => x.net)]
  ];
  const csv = rows.map((row) => row.map((cell) => '"' + String(cell ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = (inputs.scenarioName || 'financial-scenario').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() + '.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
function displayWorkspace(user) {
  currentUser = user;
  $('auth-panel').classList.toggle('hidden', Boolean(user));
  $('workspace').classList.toggle('hidden', !user);
  $('sign-out-button').classList.toggle('hidden', !user);
  $('session-status').innerHTML = user ? '<span class="status-dot" style="background:#7fddb8"></span> Signed in: ' + escapeHtml(user.email || 'account') : '<span class="status-dot"></span> Sign in required';
  if (user) {
    syncYearLabels();
    calculate();
    refreshScenarios().catch((error) => setMessage('workspace-message', error.message || 'Could not load saved scenarios.', 'error'));
  }
}
async function withErrorMessage(action, successFallback) {
  try { await action(); }
  catch (error) {
    console.error(error);
    const message = error && error.message ? error.message : successFallback || 'Something went wrong. Please try again.';
    setMessage('workspace-message', message, 'error');
  }
}
$('sign-in-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('auth-message', 'Signing in…');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: $('login-email').value.trim(),
    password: $('login-password').value
  });
  if (error) {
    setMessage('auth-message', 'Sign-in failed. Check the email and password, or create the account in Supabase Authentication → Users.', 'error');
    return;
  }
  setMessage('auth-message', '');
  displayWorkspace(data.user);
});
$('sign-out-button').addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) { setMessage('workspace-message', error.message, 'error'); return; }
  displayWorkspace(null);
});
$('add-revenue-row').addEventListener('click', () => addRevenueRow({ name:'', price:0, quantity:0, directCost:0 }));
$('save-scenario-button').addEventListener('click', () => withErrorMessage(saveScenario, 'Could not save scenario.'));
$('load-scenario-button').addEventListener('click', () => withErrorMessage(loadScenario, 'Could not load scenario.'));
$('delete-scenario-button').addEventListener('click', () => withErrorMessage(deleteScenario, 'Could not delete scenario.'));
$('new-scenario-button').addEventListener('click', () => {
  activeScenarioId = null;
  restoreInputs({});
  $('scenario-name').value = 'New scenario';
  setMessage('workspace-message', 'New scenario ready. Save it to create a separate record.');
});
$('saved-scenarios').addEventListener('change', () => { $('delete-scenario-button').disabled = !$('saved-scenarios').value; activeScenarioId = null; });
$('export-button').addEventListener('click', exportCsv);
document.querySelectorAll('input, select').forEach((input) => {
  if (input.id !== 'login-email' && input.id !== 'login-password' && input.id !== 'saved-scenarios') input.addEventListener('input', calculate);
});
for (let i = 0; i < 3; i++) addRevenueRow({ name:'', price:0, quantity:0, directCost:0 });
syncYearLabels();
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    setMessage('auth-message', 'Could not check the current session. Refresh the page and try again.', 'error');
    return;
  }
  displayWorkspace(data.session ? data.session.user : null);
});
supabase.auth.onAuthStateChange((_event, session) => {
  const user = session ? session.user : null;
  if ((user && (!currentUser || currentUser.id !== user.id)) || (!user && currentUser)) displayWorkspace(user);
});
