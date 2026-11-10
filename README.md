# ☕ Brew2Basket — AI-Assisted Café Restock Copilot

> Tell Brew2Basket what's running low. It'll find a sensible restock and keep you in control of checkout.

Brew2Basket is a full-stack web application that helps independent café owners manage inventory and place restocking orders using plain-language requests. It tracks stock levels, forecasts demand using weighted sales averages, recommends suppliers, and processes payments via PayPal.

---

## ✨ Features

- **Plain-language restock planning** — describe what you need (e.g. *"we need espresso beans and oat milk, keep it under $180 and prioritize fast delivery"*) and get an instant plan
- **AI-powered or built-in planner** — uses an OpenAI-compatible API if configured, with a smart local fallback that balances price, delivery speed, and supplier rating
- **Live inventory radar** — tracks stock on hand, calculates days of stock left using a 7-day weighted moving average, and flags items as Critical / Reorder Soon / Healthy
- **Multi-café support** — manage separate ingredient lists and stock levels for multiple cafés
- **What-if demand forecasting** — simulate busy weeks (+25%, +50%) to plan quantities in advance
- **PayPal Sandbox checkout** — approve baskets and simulate real payments
- **Animated React UI** — smooth page transitions, protected routes, and persistent localStorage state
- **Classic vanilla JS version** — an original single-page version also included under `/public`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js (stdlib only — `http`, `fs`, `path`) |
| **AI Planner** | OpenAI-compatible API (works with Ollama, OpenAI, etc.) |
| **Payments** | PayPal Sandbox REST API |
| **Frontend (React)** | React 18, Vite, React Router v6, Framer Motion |
| **Frontend (Vanilla)** | Plain HTML, CSS, JavaScript + Lenis smooth scroll |
| **State** | React Context API + `localStorage` |

---

## 📁 Project Structure

```
brew2basket/
├── server.js              # Node.js HTTP server + all API routes
├── package.json
├── .env                   # API keys (not committed — see below)
├── .env.example           # Template for environment variables
├── public/                # Vanilla JS frontend (original version)
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── smooth-scroll.js
└── client/                # React + Vite frontend (full version)
    └── src/
        ├── App.jsx            # Router + animated page transitions
        ├── Login.jsx          # Auth entry point
        ├── useAuth.jsx        # Auth hook
        ├── ProtectedRoute.jsx
        ├── context/
        │   └── CafeContext.jsx  # Global state: cafes, catalog, inventory
        ├── components/
        │   ├── SiteLayout.jsx
        │   └── SplashScreen.jsx
        └── pages/
            ├── WelcomePage.jsx
            ├── DashboardPage.jsx   # Inventory radar + forecast
            ├── RestockPage.jsx     # Plan builder
            ├── CheckoutPage.jsx    # Basket approval + PayPal
            ├── SuccessPage.jsx
            ├── OrdersPage.jsx
            ├── ToolsPage.jsx       # Expiry watch, budget scenarios, supplier comparison
            ├── SetupPage.jsx       # Café profile + ingredient manager
            └── AccountPage.jsx
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- (Optional) An OpenAI-compatible API key for AI planning
- (Optional) PayPal Developer account for sandbox checkout

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/brew2basket.git
cd brew2basket
```

### 2. Set up environment variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in your values:

```env
# AI Planner (optional — app works without this using the built-in planner)
AI_API_KEY=your_openai_api_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini

# Or use Ollama locally:
# AI_API_KEY=ollama
# AI_BASE_URL=http://127.0.0.1:11434/v1
# AI_MODEL=qwen3:1.7b

# PayPal Sandbox (optional — demo checkout works without this)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com

# Server port (default: 3000)
PORT=3000
```

### 3. Run the app (Vanilla JS version)

The vanilla version needs no build step:

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

### 4. Run the React version

```bash
cd client
npm install
npm run dev
```

Open the Vite dev server URL shown in your terminal (usually **http://localhost:5173**).

> **Note:** The React app calls the backend at `/api/*`, so the Node.js server must be running on port 3000 at the same time.

---

## 🔌 API Reference

All API endpoints are served by `server.js`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/config` | Returns PayPal/AI availability flags |
| `GET` | `/api/catalog` | Returns the full product + supplier catalog |
| `GET` | `/api/inventory` | Returns stock snapshot with demand, risk level, and reorder suggestions |
| `POST` | `/api/plan` | Builds a restock plan from a plain-language request |
| `POST` | `/api/paypal/create-order` | Creates a PayPal sandbox order |
| `POST` | `/api/paypal/capture-order` | Captures an approved PayPal payment |

### POST `/api/plan` — Request Body

```json
{
  "request": "We need espresso beans and oat milk. Keep it under $180.",
  "budget": 180,
  "demandMultiplier": 1.25,
  "catalog": null
}
```

- `demandMultiplier`: `1.0` to `2.0` — scales quantities for busier-than-usual periods
- `catalog`: optional custom catalog array; uses the server's built-in catalog if `null`

---

## 🧠 How the Planner Works

1. **AI mode** (when `AI_API_KEY` is set): sends your request + catalog + budget to an OpenAI-compatible model and parses the structured JSON response
2. **Built-in fallback**: keyword-matches your request to catalog items, scores suppliers by rating + delivery speed + price, and trims quantities to fit within your budget

The inventory snapshot uses a **7-day weighted moving average** (more weight on recent days) to estimate daily demand and flag risk:
- 🔴 **Critical** — stock will run out before supplier can deliver
- 🟡 **Reorder soon** — within safety stock buffer
- 🟢 **Healthy** — adequately stocked

---

## 🖼️ Screenshots

> *Dashboard showing inventory risk radar with critical, soon, and healthy stock levels*

> *Restock plan view with supplier recommendations and basket approval*

---

## ⚙️ Configuration Notes

- All café profiles and ingredient data are saved in **browser localStorage** — no database required
- The `.env` file is excluded from version control via `.gitignore` — never commit your API keys
- PayPal integration uses the **sandbox** environment only — no real money is processed

---

## 📄 License

This project is for educational and demonstration purposes.

---

## 🙏 Acknowledgements

- [Lenis](https://github.com/darkroomengineering/lenis) — smooth scroll
- [Framer Motion](https://www.framer.com/motion/) — page animations
- [PayPal Developer](https://developer.paypal.com/) — sandbox checkout
- [Ollama](https://ollama.com/) — local AI model support
