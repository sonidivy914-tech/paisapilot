"""Authentication Dependency - Verifies Supabase JWT access token."""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db import supabase

bearer = HTTPBearer(auto_error=False)


def get_current_user_id(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    """Extracts and verifies Bearer token via Supabase Auth.
    Returns the user's UUID string.
    Raises 401 if token is missing, invalid, or expired.
    """
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Authorization token required")

    try:
        result = supabase.auth.get_user(creds.credentials)
        if not result or not getattr(result, "user", None):
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return result.user.id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

