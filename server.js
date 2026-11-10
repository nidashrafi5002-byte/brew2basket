const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
loadEnv(path.join(ROOT, '.env'));
const PORT = Number(process.env.PORT || 3000);
const CATALOG = [
  { id: 'beans', name: 'House espresso beans', category: 'Coffee', unit: '5 lb bag', demand: 'High', icon: '☕', offers: [{ vendor: 'Northstar Roasters', price: 54, lead: 'Tomorrow', rating: 4.9, note: 'Fresh roast · free delivery over $100' }, { vendor: 'Morning Bell Coffee', price: 49, lead: '3 days', rating: 4.6, note: 'Best unit price · 3 day delivery' }] },
  { id: 'oat', name: 'Barista oat milk', category: 'Dairy alternative', unit: 'case of 6', demand: 'High', icon: '🥛', offers: [{ vendor: 'Field & Foam', price: 24, lead: 'Tomorrow', rating: 4.8, note: 'Barista blend · free delivery over $100' }, { vendor: 'Daily Pour Supply', price: 21, lead: '4 days', rating: 4.5, note: 'Lowest price · 4 day delivery' }] },
  { id: 'cups', name: 'Compostable hot cups', category: 'Packaging', unit: 'sleeve of 50', demand: 'Medium', icon: '🥤', offers: [{ vendor: 'Good Earth Packaging', price: 18, lead: '2 days', rating: 4.7, note: 'Compostable · free delivery over $100' }, { vendor: 'Cup & Co.', price: 15, lead: '5 days', rating: 4.4, note: 'Lowest price · 5 day delivery' }] },
  { id: 'syrup', name: 'Vanilla syrup', category: 'Pantry', unit: '750 ml bottle', demand: 'Low', icon: '🍯', offers: [{ vendor: 'Sweet Current', price: 13, lead: 'Tomorrow', rating: 4.8, note: 'Small batch · free delivery over $100' }, { vendor: 'Daily Pour Supply', price: 10, lead: '3 days', rating: 4.3, note: 'Lowest price · 3 day delivery' }] },
  { id: 'tea', name: 'Loose leaf breakfast tea', category: 'Tea', unit: '1 lb tin', demand: 'Medium', icon: '🫖', offers: [{ vendor: 'Juniper & Leaf', price: 28, lead: '2 days', rating: 4.9, note: 'Organic · free delivery over $100' }, { vendor: 'Tea Cartel', price: 23, lead: '5 days', rating: 4.5, note: 'Best price · 5 day delivery' }] },
  { id: 'sugar', name: 'Raw cane sugar', category: 'Pantry', unit: '10 lb bag', demand: 'Low', icon: '🧂', offers: [{ vendor: 'Good Earth Pantry', price: 16, lead: '2 days', rating: 4.7, note: 'Fair trade · free delivery over $100' }, { vendor: 'Bulk Basket', price: 12, lead: '4 days', rating: 4.4, note: 'Best price · 4 day delivery' }] }
];

// Illustrative cafe inventory and the last 7 days of unit sales (oldest to newest).
// The weighted moving average gives more weight to recent sales when estimating demand.
const INVENTORY = [
  { productId: 'beans', onHand: 1, sales7d: [1, 1, 2, 1, 2, 1, 2], leadDays: 1, safetyDays: 2, targetCoverDays: 3 },
  { productId: 'oat', onHand: 8, sales7d: [1, 2, 1, 2, 1, 2, 2], leadDays: 1, safetyDays: 2, targetCoverDays: 3 },
  { productId: 'cups', onHand: 16, sales7d: [2, 1, 2, 2, 1, 2, 2], leadDays: 2, safetyDays: 2, targetCoverDays: 3 },
  { productId: 'syrup', onHand: 2, sales7d: [0, 1, 1, 0, 1, 1, 2], leadDays: 1, safetyDays: 2, targetCoverDays: 3 },
  { productId: 'tea', onHand: 6, sales7d: [1, 0, 1, 0, 1, 0, 1], leadDays: 2, safetyDays: 2, targetCoverDays: 3 },
  { productId: 'sugar', onHand: 3, sales7d: [1, 1, 1, 0, 1, 1, 1], leadDays: 2, safetyDays: 2, targetCoverDays: 3 }
];

function normalizeCatalog(input) {
  if (!Array.isArray(input)) return CATALOG;
  return input.slice(0, 40).map((row, index) => {
    if (!row || typeof row !== 'object') return null;
    const id = String(row.id || `custom-${index}`).slice(0, 40);
    const name = String(row.name || '').trim().slice(0, 80);
    const unit = String(row.unit || '').trim().slice(0, 40);
    const offers = Array.isArray(row.offers) ? row.offers.slice(0, 5).map(offer => ({
      vendor: String(offer.vendor || '').trim().slice(0, 80),
      price: Number(offer.price),
      lead: String(offer.lead || 'Unknown').slice(0, 30),
      rating: Math.max(1, Math.min(5, Number(offer.rating) || 4)),
      note: String(offer.note || '').slice(0, 140)
    })).filter(offer => offer.vendor && Number.isFinite(offer.price) && offer.price > 0 && offer.price <= 100000) : [];
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(id) || !name || !unit || !offers.length) return null;
    return { id, name, unit, category: String(row.category || 'Ingredient').slice(0, 50), demand: 'Custom', icon: String(row.icon || '🧺').slice(0, 8), offers };
  }).filter(Boolean);
}

function inventorySnapshot() {
  return INVENTORY.map((record) => {
    const product = CATALOG.find((item) => item.id === record.productId);
    const weights = record.sales7d.map((_, index) => index + 1);
    const weightedDemand = record.sales7d.reduce((sum, sales, index) => sum + sales * weights[index], 0)
      / weights.reduce((sum, weight) => sum + weight, 0);
    const daysLeft = weightedDemand > 0 ? record.onHand / weightedDemand : null;
    const reorderPoint = Math.ceil(weightedDemand * (record.leadDays + record.safetyDays));
    const suggestedQuantity = Math.max(0, Math.ceil(weightedDemand * record.targetCoverDays) - record.onHand);
    const risk = daysLeft !== null && daysLeft <= record.leadDays
      ? 'critical'
      : daysLeft !== null && daysLeft <= record.leadDays + record.safetyDays
        ? 'soon'
        : 'healthy';
    return {
      productId: record.productId,
      name: product.name,
      unit: product.unit,
      icon: product.icon,
      onHand: record.onHand,
      sales7d: record.sales7d,
      averageDailyDemand: Number(weightedDemand.toFixed(2)),
      daysLeft: daysLeft === null ? null : Number(daysLeft.toFixed(1)),
      leadDays: record.leadDays,
      safetyDays: record.safetyDays,
      reorderPoint,
      suggestedQuantity,
      risk
    };
  });
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !Object.hasOwn(process.env, match[1])) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function send(res, status, data, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 100_000) reject(new Error('Request too large')); });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

function localPlan(request, budget, catalog = CATALOG, demandMultiplier = 1) {
  const text = String(request || '').toLowerCase();
  let selected = catalog.filter(item => {
    const phrases = [item.name, item.category, item.id].map(value => String(value || '').toLowerCase());
    return phrases.some(phrase => phrase.length > 2 && text.includes(phrase))
      || phrases.some(phrase => phrase.split(/[^a-z0-9]+/).some(word => word.length > 3 && text.includes(word)));
  });
  if (!selected.length) selected = catalog.slice(0, 3);
  const parsedBudget = Number(String(request).match(/(?:under|below|max(?:imum)?|budget(?: of)?|\$)\s*\$?(\d{2,4})/i)?.[1]);
  const max = Math.min(1500, Math.max(35, Number(budget) || parsedBudget || 180));
  const perUnit = Math.max(1, Math.ceil(max / selected.length / 30 * demandMultiplier));
  const urgent = /fast|urgent|tomorrow|asap/i.test(text);
  const cheapest = /cheap|lowest price|lowest cost|save money|budget/i.test(text);
  const items = selected.map(item => {
    const days = offer => /tomorrow/i.test(offer.lead) ? 1 : Number(String(offer.lead).match(/\d+/)?.[0] || 99);
    const score = offer => offer.rating * 4 + (days(offer) === 1 ? 3 : 0) - offer.price / 10;
    const offer = [...item.offers].sort((a, b) => urgent ? days(a) - days(b) : cheapest ? a.price - b.price : score(b) - score(a))[0];
    const reason = urgent ? `Selected ${offer.vendor} for its ${offer.lead} delivery.` : cheapest ? `Selected the lower-price offer from ${offer.vendor}.` : 'A balanced supplier offer for this restock.';
    return { productId: item.id, quantity: Math.min(4, Math.max(1, perUnit)), vendor: offer.vendor, reason };
  });
  let total = items.reduce((sum, row) => sum + catalog.find(item => item.id === row.productId).offers.find(o => o.vendor === row.vendor).price * row.quantity, 0);
  while (total > max && items.some(row => row.quantity > 1)) {
    const row = [...items].reverse().find(item => item.quantity > 1);
    row.quantity--;
    total = items.reduce((sum, it) => sum + catalog.find(item => item.id === it.productId).offers.find(o => o.vendor === it.vendor).price * it.quantity, 0);
  }
  const demandNote = demandMultiplier > 1 ? ` Quantities account for a ${Math.round((demandMultiplier - 1) * 100)}% busier period.` : '';
  return { items, summary: `A practical restock using this café's catalog, within the $${max} cap. Quantities are kept lean so you can replenish without tying up too much cash.${demandNote}`, budget: max, demandMultiplier, mode: 'Built-in demo planner' };
}

async function aiPlan(request, budget, catalog = CATALOG, demandMultiplier = 1) {
  const base = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.AI_API_KEY}` },
    body: JSON.stringify({ model: process.env.AI_MODEL || 'gpt-4o-mini', temperature: 0.2, max_tokens: 450, response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `You are Brew2Basket, a careful purchasing copilot for an independent cafe. Recommend only products and vendors in the supplied café catalog. Keep order total within the user's budget. Prefer reliable/fast delivery when the request implies urgency, otherwise balance price and rating. Never claim you executed payment. Return JSON with keys summary (string) and items (array of {productId, quantity, vendor, reason}). Use 1-4 units per item; include only relevant products. Catalog: ${JSON.stringify(catalog)}` },
        { role: 'user', content: `Request: ${String(request).slice(0, 2000)}\nBudget ceiling in USD: ${Math.min(1500, Math.max(35, Number(budget) || 180))}\nExpected demand multiplier: ${demandMultiplier}x typical usage. Keep quantities lean while accounting for this scenario.` }
      ] }),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
  const data = await response.json();
  const result = JSON.parse(data.choices?.[0]?.message?.content || '{}');
  const items = (Array.isArray(result.items) ? result.items : []).map(row => {
    const product = catalog.find(item => item.id === row.productId);
    if (!product) return null;
    const offer = product.offers.find(o => o.vendor === row.vendor) || [...product.offers].sort((a,b) => a.price-b.price)[0];
    return { productId: product.id, quantity: Math.max(1, Math.min(4, Math.floor(Number(row.quantity) || 1))), vendor: offer.vendor, reason: String(row.reason || 'Recommended for this restock.').slice(0, 180) };
  }).filter(Boolean);
  if (!items.length) throw new Error('AI provider did not return usable recommendations');
  const max = Math.min(1500, Math.max(35, Number(budget) || 180));
  let total = items.reduce((sum, row) => sum + catalog.find(p => p.id === row.productId).offers.find(o => o.vendor === row.vendor).price * row.quantity, 0);
  while (total > max && items.some(row => row.quantity > 1)) {
    const row = [...items].reverse().find(item => item.quantity > 1); row.quantity--;
    total = items.reduce((sum, it) => sum + catalog.find(p => p.id === it.productId).offers.find(o => o.vendor === it.vendor).price * it.quantity, 0);
  }
  return { items, summary: String(result.summary || 'A balanced restock recommendation.').slice(0, 500), budget: max, demandMultiplier, mode: process.env.AI_MODEL || 'AI planner' };
}

async function paypalToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'}/v1/oauth2/token`, { method: 'POST', headers: { authorization: `Basic ${auth}`, 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  if (!res.ok) throw new Error(`PayPal authentication failed (${res.status})`);
  return (await res.json()).access_token;
}

async function paypalRequest(endpoint, payload) {
  const base = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
  const token = await paypalToken();
  const res = await fetch(`${base}${endpoint}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `PayPal request failed (${res.status})`);
  return data;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/api/config') {
      return send(res, 200, { paypalClientId: process.env.PAYPAL_CLIENT_ID || '', paypalReady: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET), aiReady: Boolean(process.env.AI_API_KEY) });
    }
    if (req.method === 'GET' && url.pathname === '/api/catalog') return send(res, 200, CATALOG);
    if (req.method === 'GET' && url.pathname === '/api/inventory') return send(res, 200, inventorySnapshot());
    if (req.method === 'POST' && url.pathname === '/api/plan') {
      const body = await readJson(req);
      if (typeof body.request !== 'string' || !body.request.trim()) return send(res, 400, { error: 'Tell Brew2Basket what you need to restock.' });
      const catalog = body.catalog === undefined ? CATALOG : normalizeCatalog(body.catalog);
      if (!catalog.length) return send(res, 400, { error: 'Add at least one ingredient and supplier offer before building a plan.' });
      const demandMultiplier = Math.max(1, Math.min(2, Number(body.demandMultiplier) || 1));
      try { return send(res, 200, await (process.env.AI_API_KEY ? aiPlan(body.request, body.budget, catalog, demandMultiplier) : Promise.resolve(localPlan(body.request, body.budget, catalog, demandMultiplier)))); }
      catch (err) {
        const reason = err.name === 'TimeoutError' || err.name === 'AbortError'
          ? 'AI planner timed out after 25 seconds'
          : err.message;
        return send(res, 200, { ...localPlan(body.request, body.budget, catalog, demandMultiplier), notice: `AI planner unavailable; using the built-in planner (${reason}).` });
      }
    }
    if (req.method === 'POST' && url.pathname === '/api/paypal/create-order') {
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return send(res, 503, { error: 'PayPal sandbox is not configured.' });
      const body = await readJson(req); const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 1 || amount > 1500) return send(res, 400, { error: 'Invalid order total.' });
      const order = await paypalRequest('/v2/checkout/orders', { intent: 'CAPTURE', purchase_units: [{ description: 'Brew2Basket cafe restock', amount: { currency_code: 'USD', value: amount.toFixed(2) } }] });
      return send(res, 200, { id: order.id });
    }
    if (req.method === 'POST' && url.pathname === '/api/paypal/capture-order') {
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return send(res, 503, { error: 'PayPal sandbox is not configured.' });
      const body = await readJson(req);
      if (!/^[A-Z0-9]+$/.test(body.orderId || '')) return send(res, 400, { error: 'Invalid order ID.' });
      const captured = await paypalRequest(`/v2/checkout/orders/${body.orderId}/capture`, {});
      return send(res, 200, { status: captured.status, orderId: captured.id, captureId: captured.purchase_units?.[0]?.payments?.captures?.[0]?.id || '' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' }, { allow: 'GET, HEAD' });
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(PUBLIC, `.${relative}`);
    if (!file.startsWith(PUBLIC + path.sep) && file !== path.join(PUBLIC, 'index.html')) return send(res, 403, { error: 'Forbidden.' });
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'Not found.' });
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'x-content-type-options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    send(res, 500, { error: err.message || 'Unexpected server error.' });
  }
});

server.listen(PORT, () => console.log(`Brew2Basket is ready at http://localhost:${PORT}`));



