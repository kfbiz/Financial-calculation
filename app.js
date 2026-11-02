import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm';
import { buildCalculation } from './model.mjs';
import { jsPDF } from 'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/+esm';

// A publishable key is designed for browser use. Never put a Supabase service-role/secret key here.
const SUPABASE_URL = 'https://crevbddanoyhgrrbutzl.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_YXRWS3otVosqlt1gYCaK5w_3sUq8nFV';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const MODEL_VERSION = 2;
const COST_KEYS = ['premises', 'utilities', 'software', 'accounting', 'marketing', 'insurance', 'yel', 'transport', 'other'];
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
  setText('kpi-cash-breakeven', result.breakEvenCash === null ? 'Not calculable' : euro(result.breakEvenCash));
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

function pdfSafeText(value) {
  return String(value ?? '')
    .replace(/\u20ac/g, 'EUR')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2022/g, '-')
    .replace(/\u00a0/g, ' ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?');
}
function pdfMoney(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Not calculable';
  return new Intl.NumberFormat('en-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value)) + ' EUR';
}
function pdfPercent(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Not calculable';
  return (Number(value) * 100).toLocaleString('en-FI', { maximumFractionDigits: 2 }) + '%';
}
function pdfIndustryName(value) {
  const names = {
    general: 'General / not decided',
    consulting: 'Consulting and professional services',
    cleaning: 'Cleaning services',
    beauty: 'Beauty, hair and wellness',
    restaurant: 'Restaurant, cafe and food',
    retail: 'Retail and e-commerce',
    construction: 'Construction and skilled trades',
    transport: 'Transport and logistics',
    accommodation: 'Accommodation and tourism',
    other_services: 'Other services'
  };
  return names[value] || value || 'Not specified';
}
function pdfLegalFormName(value) {
  const names = { toiminimi: 'Toiminimi (sole trader)', oy: 'Osakeyhtio (Oy)', partnership: 'Partnership / other' };
  return names[value] || value || 'Not specified';
}
function exportPdf() {
  try {
    const { inputs, result } = calculate();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    const bottomLimit = pageHeight - 18;
    let y = 0;

    const setBodyFont = (size = 8.5, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
    };
    const addHeader = (firstPage = false) => {
      if (firstPage) {
        doc.setFillColor(17, 54, 52);
        doc.rect(0, 0, pageWidth, 39, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(19);
        doc.text('KF Biz', margin, 15);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('FINANCIAL CALCULATION REPORT', margin, 23);
        doc.setFontSize(8);
        doc.setTextColor(205, 229, 220);
        doc.text('General financial model | Version 2', margin, 30);
        y = 48;
      } else {
        doc.setFillColor(17, 54, 52);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('KF Biz | Financial Calculation', margin, 8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(90, 110, 104);
        doc.setFontSize(7);
        doc.text(pdfSafeText(inputs.scenarioName), pageWidth - margin, 8, { align: 'right', maxWidth: contentWidth * 0.55 });
        y = 20;
      }
    };
    const nextPage = () => {
      doc.addPage();
      addHeader(false);
    };
    const ensureSpace = (height) => {
      if (y + height > bottomLimit) nextPage();
    };
    const drawParagraph = (text, options = {}) => {
      const size = options.size ?? 8.5;
      const color = options.color ?? [57, 76, 71];
      const indent = options.indent ?? 0;
      const maxWidth = contentWidth - indent;
      setBodyFont(size, Boolean(options.bold));
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(pdfSafeText(text), maxWidth);
      const lineHeight = size * 0.42 + 1.05;
      const height = lines.length * lineHeight;
      ensureSpace(height + 1);
      doc.text(lines, margin + indent, y);
      y += height + (options.gapAfter ?? 2);
    };
    const drawSection = (title, subtitle = '') => {
      ensureSpace(subtitle ? 17 : 11);
      doc.setFillColor(232, 244, 239);
      doc.roundedRect(margin, y - 1, contentWidth, 8, 1.5, 1.5, 'F');
      setBodyFont(10, true);
      doc.setTextColor(16, 77, 69);
      doc.text(pdfSafeText(title), margin + 3, y + 4.2);
      y += 10;
      if (subtitle) drawParagraph(subtitle, { size: 7.5, color: [100, 119, 111], gapAfter: 2 });
    };
    const drawTable = (headers, rows, widths, options = {}) => {
      const headerHeight = options.headerHeight ?? 8;
      const fontSize = options.fontSize ?? 7.6;
      const aligns = options.aligns ?? headers.map((_, i) => i === 0 ? 'left' : 'right');
      const xStarts = [];
      let cursor = margin;
      widths.forEach((width) => { xStarts.push(cursor); cursor += width; });
      ensureSpace(headerHeight + 3);
      doc.setFillColor(25, 91, 82);
      doc.rect(margin, y, contentWidth, headerHeight, 'F');
      setBodyFont(7.2, true);
      doc.setTextColor(255, 255, 255);
      headers.forEach((header, i) => {
        const lines = doc.splitTextToSize(pdfSafeText(header), widths[i] - 4);
        doc.text(lines, xStarts[i] + (aligns[i] === 'right' ? widths[i] - 2 : 2), y + 5.2, { align: aligns[i] === 'right' ? 'right' : 'left' });
      });
      y += headerHeight;
      rows.forEach((row, rowIndex) => {
        const cellLines = row.map((cell, i) => {
          setBodyFont(fontSize, i === 0 && options.boldFirstColumn !== false);
          return doc.splitTextToSize(pdfSafeText(cell), widths[i] - 4);
        });
        const maxLines = Math.max(1, ...cellLines.map((lines) => lines.length));
        const rowHeight = Math.max(7, maxLines * (fontSize * 0.42 + 1.05) + 3);
        ensureSpace(rowHeight + 1);
        if (rowIndex % 2 === 0) {
          doc.setFillColor(247, 250, 248);
          doc.rect(margin, y, contentWidth, rowHeight, 'F');
        }
        doc.setDrawColor(225, 234, 229);
        doc.setLineWidth(0.15);
        doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
        row.forEach((cell, i) => {
          setBodyFont(fontSize, Boolean(options.boldRows?.includes(rowIndex)) || (i === 0 && options.boldFirstColumn !== false));
          doc.setTextColor(i === 0 ? 47 : 65, i === 0 ? 68 : 83, i === 0 ? 63 : 76);
          const x = aligns[i] === 'right' ? xStarts[i] + widths[i] - 2 : xStarts[i] + 2;
          doc.text(cellLines[i], x, y + 4.7, { align: aligns[i] === 'right' ? 'right' : 'left' });
        });
        y += rowHeight;
      });
      y += options.gapAfter ?? 3;
    };
    const drawMetricCards = (items) => {
      const gap = 3;
      const cols = 2;
      const cardWidth = (contentWidth - gap) / cols;
      const cardHeight = 18;
      for (let i = 0; i < items.length; i += cols) {
        ensureSpace(cardHeight + 3);
        for (let j = 0; j < cols; j++) {
          const item = items[i + j];
          if (!item) continue;
          const x = margin + j * (cardWidth + gap);
          doc.setFillColor(245, 249, 247);
          doc.setDrawColor(224, 235, 229);
          doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
          setBodyFont(7, false);
          doc.setTextColor(99, 118, 109);
          doc.text(pdfSafeText(item.label), x + 3, y + 5);
          setBodyFont(10.5, true);
          doc.setTextColor(19, 62, 57);
          doc.text(pdfSafeText(item.value), x + 3, y + 12.5, { maxWidth: cardWidth - 6 });
        }
        y += cardHeight + gap;
      }
      y += 1;
    };
    const footer = () => {
      const pages = doc.getNumberOfPages();
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        doc.setDrawColor(220, 230, 225);
        doc.setLineWidth(0.2);
        doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
        setBodyFont(7, false);
        doc.setTextColor(118, 132, 125);
        doc.text('Confidential planning document | Generated ' + new Date().toLocaleDateString('en-FI'), margin, pageHeight - 8);
        doc.text('Page ' + p + ' of ' + pages, pageWidth - margin, pageHeight - 8, { align: 'right' });
      }
    };

    doc.setProperties({
      title: 'KF Biz Financial Calculation - ' + pdfSafeText(inputs.scenarioName),
      subject: 'Business financial planning report',
      author: 'KF Biz',
      creator: 'KF Biz Financial Calculation'
    });
    addHeader(true);

    setBodyFont(13, true);
    doc.setTextColor(22, 49, 46);
    const titleLines = doc.splitTextToSize(pdfSafeText(inputs.scenarioName || 'Untitled scenario'), contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 6 + 2;
    drawParagraph((inputs.businessName || 'Business name not entered') + ' | ' + pdfIndustryName(inputs.industry) + ' | ' + pdfLegalFormName(inputs.legalForm), { size: 8.2, color: [83, 103, 95], gapAfter: 1 });
    drawParagraph('Report date: ' + new Date().toLocaleDateString('en-FI') + ' | Currency: EUR | Revenue and costs entered excluding VAT', { size: 7.4, color: [109, 125, 118], gapAfter: 3 });

    drawSection('Executive summary', 'Current monthly run-rate estimates based on the inputs in this scenario.');
    drawMetricCards([
      { label: 'Monthly turnover', value: pdfMoney(result.revenue) },
      { label: 'Gross margin', value: pdfPercent(result.grossMarginRatio) },
      { label: 'Monthly EBITDA', value: pdfMoney(result.ebitda) },
      { label: 'Estimated monthly net result', value: pdfMoney(result.netResult) },
      { label: 'P&L break-even turnover', value: pdfMoney(result.breakEvenOperating) },
      { label: 'Cash break-even turnover', value: pdfMoney(result.breakEvenCash) },
      { label: 'Monthly cash movement', value: pdfMoney(result.monthlyCashMovement) },
      { label: 'Funding gap', value: pdfMoney(result.fundingGap) }
    ]);

    drawSection('Revenue streams', 'Monthly estimates. Direct costs are deducted separately from turnover.');
    const revenueLines = inputs.revenueLines.filter((line) => line.name || line.price || line.quantity || line.directCost);
    drawTable(
      ['Product / service', 'Price / unit', 'Units / month', 'Direct cost / unit', 'Sales / month'],
      revenueLines.length ? revenueLines.map((line) => [
        line.name || 'Unnamed revenue stream',
        pdfMoney(line.price),
        Number(line.quantity).toLocaleString('en-FI', { maximumFractionDigits: 2 }),
        pdfMoney(line.directCost),
        pdfMoney(line.price * line.quantity)
      ]) : [['No revenue lines entered', '-', '-', '-', '-']],
      [52, 28, 26, 33, 41],
      { fontSize: 7.1, aligns: ['left','right','right','right','right'] }
    );

    drawSection('Monthly profit and loss estimate', 'Illustrative management figures; not statutory accounting or a Finnish tax calculation.');
    const costLabels = {
      premises:'Premises and rent', utilities:'Electricity, water and utilities',
      software:'Software, IT and phone', accounting:'Accounting and administration',
      marketing:'Marketing and sales', insurance:'Insurance and memberships',
      yel:'YEL entrepreneur pension insurance', transport:'Vehicle and travel', other:'Other operating costs'
    };
    const pAndLRows = [
      ['Turnover, excluding VAT', pdfMoney(result.revenue)],
      ['Direct costs', pdfMoney(-result.variableCost)],
      ['Gross profit', pdfMoney(result.grossProfit)],
      ['Gross margin', pdfPercent(result.grossMarginRatio)],
      ...Object.entries(inputs.costs).filter(([, amount]) => amount !== 0).map(([key, amount]) => [costLabels[key] || key, pdfMoney(-amount)]),
      ['Employer cost for staff', pdfMoney(-inputs.employeeCost)],
      ['Total operating costs and staff', pdfMoney(-result.operatingCosts)],
      ['EBITDA', pdfMoney(result.ebitda)],
      ['Depreciation', pdfMoney(-inputs.depreciation)],
      ['Interest and finance costs', pdfMoney(-inputs.interestCost)],
      ['Estimated result before tax', pdfMoney(result.pretax)],
      ['Illustrative tax reserve (' + pdfPercent(inputs.taxReserve) + ')', pdfMoney(-result.tax)],
      ['Estimated net result', pdfMoney(result.netResult)]
    ];
    drawTable(['Item', 'Monthly amount'], pAndLRows, [116, 69], { fontSize: 7.6, aligns: ['left','right'], boldRows: [2, 6, 9, 12] });

    drawSection('Monthly cash-flow estimate', 'Owner withdrawals and loan principal are cash movements, not operating expenses in the toiminimi profit calculation.');
    drawTable(['Cash-flow item', 'Monthly amount'], [
      ['EBITDA', pdfMoney(result.ebitda)],
      ['Interest and finance costs', pdfMoney(-inputs.interestCost)],
      ['Illustrative tax reserve', pdfMoney(-result.tax)],
      ['Loan principal repayments', pdfMoney(-inputs.loanRepayment)],
      ["Owner's personal cash target / withdrawals", pdfMoney(-inputs.ownerDraw)],
      ['Ongoing equipment / investments', pdfMoney(-inputs.monthlyInvestment)],
      ['Net monthly cash movement', pdfMoney(result.monthlyCashMovement)],
      ['Starting cash after setup', pdfMoney(inputs.cashStart)],
      ['Cash after one month', pdfMoney(result.endingCash)],
      ['Cash runway estimate', result.monthlyCashMovement < 0 && Number.isFinite(result.runway) ? result.runway.toLocaleString('en-FI', { maximumFractionDigits: 1 }) + ' months' : (result.monthlyCashMovement >= 0 ? 'No current monthly cash burn' : 'Not calculable')]
    ], [112,68], { fontSize: 7.6, aligns: ['left','right'], boldRows: [6,8] });

    drawSection('Startup costs and funding', 'The working-capital reserve is a conservative gross-outflow buffer; it is not offset by expected sales receipts.');
    drawTable(['Startup cost / funding source', 'Amount'], [
      ['Equipment and setup', pdfMoney(inputs.startupEquipment)],
      ['Initial inventory and supplies', pdfMoney(inputs.startupInventory)],
      ['Deposits, licences and pre-opening', pdfMoney(inputs.startupDeposit)],
      ['One-off startup costs', pdfMoney(result.startupNeed)],
      ['Working-capital buffer (' + inputs.workingCapitalMonths + ' months)', pdfMoney(result.workingCapitalNeed)],
      ['Total indicative funding requirement', pdfMoney(result.fundingRequired)],
      ["Owner's contribution", pdfMoney(inputs.ownerFunding)],
      ['Grants / other entered funding', pdfMoney(inputs.grantFunding)],
      ['Planned loan funding', pdfMoney(inputs.newLoan)],
      ['Total funding sources', pdfMoney(result.fundingSources)],
      ['Indicative funding gap', pdfMoney(result.fundingGap)]
    ], [112,68], { fontSize: 7.6, aligns: ['left','right'], boldRows: [3,5,9,10] });

    drawSection('Three-year forecast', 'Annualised from the monthly run rate. Revenue growth and cost inflation are applied according to the selected assumptions.');
    drawTable(['Metric', 'Year 1', 'Year 2', 'Year 3'], [
      ['Turnover', ...result.forecasts.map((item) => pdfMoney(item.revenue))],
      ['Direct costs', ...result.forecasts.map((item) => pdfMoney(-item.variable))],
      ['Gross profit', ...result.forecasts.map((item) => pdfMoney(item.gross))],
      ['Operating costs and staff', ...result.forecasts.map((item) => pdfMoney(-item.fixed))],
      ['EBITDA', ...result.forecasts.map((item) => pdfMoney(item.ebitda))],
      ['Depreciation', ...result.forecasts.map((item) => pdfMoney(-item.depreciation))],
      ['Interest and finance costs', ...result.forecasts.map((item) => pdfMoney(-item.interest))],
      ['Illustrative tax reserve', ...result.forecasts.map((item) => pdfMoney(-item.tax))],
      ['Estimated net result', ...result.forecasts.map((item) => pdfMoney(item.net))]
    ], [60, 40, 40, 40], { fontSize: 6.9, aligns: ['left','right','right','right'], boldRows: [2,4,8] });

    drawSection('Planning assumptions');
    drawTable(['Assumption', 'Selected value'], [
      ['Annual revenue growth', pdfPercent(inputs.revenueGrowth)],
      ['Annual cost increase', pdfPercent(inputs.costInflation)],
      ['Illustrative tax reserve', pdfPercent(inputs.taxReserve)],
      ['Assumed average sales VAT rate', pdfPercent(inputs.salesVatRate)],
      ['Estimated output VAT on sales / month', pdfMoney(result.monthlyVat)],
      ['Working-capital buffer', inputs.workingCapitalMonths + ' months'],
      ['Legal form', pdfLegalFormName(inputs.legalForm)],
      ['Industry', pdfIndustryName(inputs.industry)],
      ['Model version', '2']
    ], [112,68], { fontSize: 7.6, aligns: ['left','right'] });

    drawSection('Interpretation and important limitations');
    [
      'All turnover, selling prices and costs in this report are entered excluding VAT. The VAT figure is only estimated output VAT on sales. It is not net VAT payable because purchase VAT, different rates by line, exemptions and payment timing are not modelled.',
      'The tax reserve is a user-selected illustration only. Actual Finnish taxation depends on the legal form and personal or company circumstances. YEL is an entered estimate, not a calculated contribution based on confirmed YEL work income.',
      'This model does not yet provide a detailed monthly cash-flow schedule, customer and supplier payment-term timing, a full balance sheet, a loan amortisation schedule, or detailed payroll and employer contributions.',
      'Forecasts and stress cases are scenarios based on entered assumptions, not predictions or guarantees. Validate prices, billable capacity, costs, licences, insurance and Finnish tax obligations before relying on the results.',
      'This report is a business-planning aid. It is not statutory accounting, tax advice, a financing commitment or regulated financial advice.'
    ].forEach((text) => drawParagraph('- ' + text, { size: 7.7, color: [75, 91, 84], gapAfter: 2 }));

    footer();
    const baseName = (inputs.scenarioName || 'financial-scenario')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'financial-scenario';
    doc.save(baseName + '-financial-report.pdf');
    setMessage('workspace-message', 'PDF report generated and downloaded.', 'success');
  } catch (error) {
    console.error('PDF export failed:', error);
    setMessage('workspace-message', 'Could not generate the PDF report. Check that the PDF library loaded, then try again.', 'error');
  }
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
    ['P&L break-even turnover per month', result.breakEvenOperating === null ? '' : result.breakEvenOperating],
    ['Cash break-even turnover per month', result.breakEvenCash === null ? '' : result.breakEvenCash],
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
$('export-pdf-button').addEventListener('click', exportPdf);
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
