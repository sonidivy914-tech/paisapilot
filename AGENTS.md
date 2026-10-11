# PaisaPilot — Project Rules

## Stack
- Frontend: React + Vite + Tailwind + Recharts (JavaScript, no TypeScript)
- Backend: Python FastAPI + Pandas
- Database/Auth: Supabase (Postgres). Do NOT use any other database.

## Rules
1. All financial numbers (totals, %, projections) must be computed in code from transaction data. Never let an LLM generate financial figures.
2. Use only synthetic data in sample_data/. Never ask for bank passwords or UPI PINs.
3. Never hardcode secrets. Read from .env. Never commit .env files.
4. Every backend route must require a verified Supabase JWT and filter by user_id.
5. Keep code simple and commented. Prefer small functions over clever ones.
6. Amounts are in INR (₹). Format with Indian grouping (1,00,000).
7. After each feature, run the app/tests and report what passed or failed.
8. Do not install new libraries without telling me why.

