"""Database Module - Connects to Supabase using the service_role key.
Provides fallback in-memory store for development/testing when Supabase credentials are not set.
"""

import os
import uuid
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


class MockTableQuery:
    def __init__(self, table_name: str, store: dict):
        self.table_name = table_name
        self.store = store
        self.filters = []
        self._order_by = None
        self._desc = False
        self._limit = None

    def select(self, *columns):
        return self

    def eq(self, column: str, value):
        self.filters.append((column, value))
        return self

    def gte(self, column: str, value):
        self.filters.append((column, value, "gte"))
        return self

    def lte(self, column: str, value):
        self.filters.append((column, value, "lte"))
        return self

    def ilike(self, column: str, pattern: str):
        self.filters.append((column, pattern, "ilike"))
        return self

    def order(self, column: str, desc: bool = False):
        self._order_by = column
        self._desc = desc
        return self

    def limit(self, count: int):
        self._limit = count
        return self

    def execute(self):
        records = self.store.setdefault(self.table_name, [])
        result = []
        for r in records:
            match = True
            for f in self.filters:
                if len(f) == 2:
                    col, val = f
                    if r.get(col) != val:
                        match = False
                        break
                elif len(f) == 3:
                    col, val, op = f
                    row_val = r.get(col)
                    if op == "gte" and (row_val is None or str(row_val) < str(val)):
                        match = False
                        break
                    elif op == "lte" and (row_val is None or str(row_val) > str(val)):
                        match = False
                        break
                    elif op == "ilike":
                        sub = val.replace("%", "").lower()
                        if row_val is None or sub not in str(row_val).lower():
                            match = False
                            break
            if match:
                result.append(r.copy())

        if self._order_by:
            result.sort(key=lambda x: str(x.get(self._order_by, "")), reverse=self._desc)

        if self._limit:
            result = result[:self._limit]

        class Response:
            def __init__(self, data):
                self.data = data
        return Response(result)

    def insert(self, data):
        class InsertBuilder:
            def __init__(self, table_name, store, payload):
                self.table_name = table_name
                self.store = store
                self.payload = payload

            def execute(self):
                records = self.store.setdefault(self.table_name, [])
                inserted = []
                items = self.payload if isinstance(self.payload, list) else [self.payload]
                for item in items:
                    record = item.copy()
                    if "id" not in record:
                        record["id"] = str(uuid.uuid4())
                    if "created_at" not in record:
                        record["created_at"] = datetime.utcnow().isoformat()
                    records.append(record)
                    inserted.append(record)

                class Response:
                    def __init__(self, data):
                        self.data = data
                return Response(inserted)
        return InsertBuilder(self.table_name, self.store, data)

    def update(self, values: dict):
        class UpdateBuilder:
            def __init__(self, table_name, store, values, filters):
                self.table_name = table_name
                self.store = store
                self.values = values
                self.filters = list(filters)

            def eq(self, column: str, value):
                self.filters.append((column, value))
                return self

            def execute(self):
                records = self.store.setdefault(self.table_name, [])
                updated = []
                for r in records:
                    match = True
                    for col, val in self.filters:
                        if r.get(col) != val:
                            match = False
                            break
                    if match:
                        r.update(self.values)
                        updated.append(r.copy())

                class Response:
                    def __init__(self, data):
                        self.data = data
                return Response(updated)
        return UpdateBuilder(self.table_name, self.store, values, self.filters)

    def upsert(self, data, on_conflict: str = ""):
        class UpsertBuilder:
            def __init__(self, table_name, store, payload, conflict_keys):
                self.table_name = table_name
                self.store = store
                self.payload = payload
                self.conflict_keys = [k.strip() for k in conflict_keys.split(",") if k.strip()]

            def execute(self):
                records = self.store.setdefault(self.table_name, [])
                items = self.payload if isinstance(self.payload, list) else [self.payload]
                upserted = []
                for item in items:
                    found = None
                    if self.conflict_keys:
                        for r in records:
                            if all(r.get(k) == item.get(k) for k in self.conflict_keys):
                                found = r
                                break
                    if found:
                        found.update(item)
                        upserted.append(found.copy())
                    else:
                        rec = item.copy()
                        if "id" not in rec:
                            rec["id"] = str(uuid.uuid4())
                        records.append(rec)
                        upserted.append(rec.copy())

                class Response:
                    def __init__(self, data):
                        self.data = data
                return Response(upserted)
        return UpsertBuilder(self.table_name, self.store, data, on_conflict)

    def delete(self):
        class DeleteBuilder:
            def __init__(self, table_name, store, filters):
                self.table_name = table_name
                self.store = store
                self.filters = list(filters)

            def eq(self, column: str, value):
                self.filters.append((column, value))
                return self

            def execute(self):
                records = self.store.setdefault(self.table_name, [])
                remaining = []
                deleted = []
                for r in records:
                    match = True
                    for col, val in self.filters:
                        if r.get(col) != val:
                            match = False
                            break
                    if match:
                        deleted.append(r)
                    else:
                        remaining.append(r)
                self.store[self.table_name] = remaining

                class Response:
                    def __init__(self, data):
                        self.data = data
                return Response(deleted)
        return DeleteBuilder(self.table_name, self.store, self.filters)


class MockAuth:
    def get_user(self, token: str):
        if not token or token == "invalid":
            raise Exception("Invalid token")
        class MockUser:
            def __init__(self, uid):
                self.id = uid
                self.email = f"{uid}@example.com"
        class MockResult:
            def __init__(self, uid):
                self.user = MockUser(uid)
        return MockResult(token if len(token) > 5 else "mock-user-123")


class MockSupabase:
    def __init__(self):
        self._store = {
            "categories": [
                {"name": "Groceries"}, {"name": "Transport"}, {"name": "Subscription"},
                {"name": "Food & Dining"}, {"name": "Shopping"}, {"name": "Bills & Utilities"},
                {"name": "Health"}, {"name": "Entertainment"}, {"name": "Education"},
                {"name": "Travel"}, {"name": "Income"}, {"name": "Uncategorized"}
            ],
            "transactions": [],
            "budgets": [],
            "subscriptions": [],
            "goals": []
        }
        self.auth = MockAuth()

    def table(self, table_name: str) -> MockTableQuery:
        return MockTableQuery(table_name, self._store)


supabase = None
is_mock_mode = False

if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and not SUPABASE_URL.startswith("https://placeholder"):
    try:
        from supabase import create_client
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        print("Connected to Supabase client successfully.")
    except Exception as e:
        print(f"Warning: Supabase initialization failed ({e}), falling back to mock mode.")
        supabase = MockSupabase()
        is_mock_mode = True
else:
    print("Notice: No live Supabase URL configured in backend/.env. Running with development in-memory store.")
    supabase = MockSupabase()
    is_mock_mode = True

