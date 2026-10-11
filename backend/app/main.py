"""PaisaPilot Backend Application Entry Point."""

import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path so 'app' package is found
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import transactions, budgets, insights, subscriptions, goals

load_dotenv()

app = FastAPI(
    title="PaisaPilot API",
    description="AI Expense Intelligence backend — calculates financial totals, projections, subscriptions, anomalies strictly in code.",
    version="1.0.0",
)

frontend_url_env = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

if frontend_url_env:
    for url in frontend_url_env.split(","):
        cleaned = url.strip().rstrip("/")
        if cleaned:
            origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(origins)),
    allow_origin_regex=r"^https?:\/\/.*(\.vercel\.app|\.netlify\.app|\.pages\.dev|\.onrender\.com)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(insights.router)
app.include_router(subscriptions.router)
app.include_router(goals.router)


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend server status."""
    return {"status": "ok", "app": "PaisaPilot", "version": "1.0.0"}

