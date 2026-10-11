# PaisaPilot — AI Expense Intelligence 💰

**Antigravity + React + FastAPI + Supabase**

PaisaPilot is a personal finance web application built for Indian bank and UPI statements. Upload a bank/UPI statement CSV, and it will automatically categorize expenses, track budgets, predict month-end spending, detect recurring subscriptions, flag unusual transactions, and track savings goals.

> **Golden Rule**: All numbers (totals, percentages, projections) are calculated by code from real transaction data. An LLM is never allowed to invent financial figures. AI only explains numbers the code already computed.

---

## 🚀 Features

- **Bank & UPI Statement Parser**: Flexible parser handling statements from HDFC, SBI, ICICI, Axis, PayTM, PhonePe, and standard bank formats.
- **Auto-Categorization**: Multi-category keyword detection (Groceries, Transport, Food & Dining, Shopping, Utilities, etc.) with ML fallback using TF-IDF + Logistic Regression.
- **Budget Alerts & Forecasting**: Category budgets with 80% (Warning) and 100% (Over-budget) status tracking, plus a linear month-end budget simulator.
- **Recurring Payment Detection**: Automatic identification of subscriptions (Netflix, Spotify, Jio Fiber, etc.) with frequency detection and annual cost calculation.
- **Unusual Spending Detection**: Statistical anomaly detection flagging purchases above $\mu + 2.5\sigma$ or $3\times \text{median}$.
- **Savings Goals**: Goal progress bars with required monthly contribution calculator ($(\text{target} - \text{saved}) / \text{months left}$).
- **Month-over-Month Natural Summaries**: Deterministic narrative insights explaining category shifts.
- **Security & Privacy**: Strict user-level data isolation via Supabase RLS and token verification.

---

## 📁 Project Structure

```text
paisapilot/
├── AGENTS.md                   # Agent guidelines & rules
├── README.md                   # Documentation & setup guide
├── supabase_schema.sql         # Supabase SQL database schema & RLS policies
├── sample_data/
│   └── transactions.csv        # Synthetic sample transactions
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── app/
│   │   ├── main.py             # FastAPI entrypoint & CORS
│   │   ├── config.py           # Configuration loading
│   │   ├── auth.py             # Supabase JWT auth dependency
│   │   ├── db.py               # Supabase client / fallback store
│   │   ├── routers/
│   │   │   ├── transactions.py # Upload, list, edit, seed demo
│   │   │   ├── budgets.py      # Budgets CRUD & status calculation
│   │   │   ├── insights.py     # Projections, anomalies, summaries
│   │   │   ├── subscriptions.py# Recurring payment detection
│   │   │   └── goals.py        # Savings goals tracking
│   │   └── services/
│   │       ├── categorizer.py  # Keyword rule categorizer
│   │       ├── csv_parser.py   # Flexible Pandas CSV parser
│   │       ├── forecast.py     # Linear month-end spending model
│   │       ├── anomaly.py      # Statistical threshold anomaly detector
│   │       ├── recurring.py    # Subscription pattern detector
│   │       └── ml_categorizer.py # Scikit-learn TF-IDF + LogisticRegression
│   └── tests/
│       └── test_core_logic.py  # Pytest test suite
└── frontend/
    ├── .env.example
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx             # Router & auth provider
        ├── lib/
        │   ├── supabase.js     # Supabase client
        │   ├── api.js          # API fetch wrapper
        │   └── formatters.js   # Indian Rupee (₹) & date formatters
        ├── components/
        │   ├── Navbar.jsx
        │   ├── StatCard.jsx
        │   ├── UploadBox.jsx
        │   ├── CategoryPieChart.jsx
        │   └── MonthlyBarChart.jsx
        └── pages/
            ├── Login.jsx       # Auth & 1-click Demo mode
            ├── Dashboard.jsx   # Metrics, charts & quick upload
            ├── Transactions.jsx# Filter, search, inline category editor
            ├── Budget.jsx      # Budgets & linear projection simulator
            ├── Insights.jsx    # Projections, anomalies & summaries
            ├── Subscriptions.jsx # Recurring bills & detection
            └── Goals.jsx       # Savings targets & monthly requirements
```

---

## 🛠️ Getting Started

### 1. Database Setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in Supabase dashboard and run the entire SQL script from `supabase_schema.sql`.
3. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public key` (for frontend)
   - `service_role key` (for backend only)

### 2. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt

# Configure your backend/.env
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# FRONTEND_URL=http://localhost:5173

# Run the backend:
uvicorn app.main:app --reload --port 8000
```

To run test suite:
```bash
pytest -v
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Configure your frontend/.env
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-public-key
# VITE_API_URL=http://localhost:8000

# Run the frontend:
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🧪 Testing Checklist

- [x] Sign up, sign in, sign out with Supabase Auth
- [x] 1-Click Guest / Demo Mode available
- [x] Unauthenticated API call returns `401 Unauthorized`
- [x] Bank CSV parsing handles flexible column names and dates
- [x] Re-uploading duplicate rows skips duplicates automatically
- [x] Categories accurately categorized with inline editing support
- [x] Budget warnings trigger at 80% and over-budget alerts at 100%
- [x] Linear month-end spending simulation matches formula: $\text{spent} / \text{days\_elapsed} \times \text{days\_in\_month}$
- [x] Recurring detection identifies monthly & weekly services (Netflix, Spotify, Jio)
- [x] Statistical anomaly engine flags unusual purchases (e.g. ₹5,500 shopping vs ₹500–₹1,000 baseline)
- [x] Savings goals compute required monthly savings: $\text{remaining} / \text{months\_left}$
- [x] Indian Rupee formatting applied everywhere (`₹1,00,000`)
- [x] Dark mode toggle supported

