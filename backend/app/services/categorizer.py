"""Categorizer Service - Keyword rules for transaction categorization."""

RULES: dict[str, list[str]] = {
    "Groceries": [
        "grocery", "bigbasket", "blinkit", "zepto", "dmart", "supermarket",
        "nature's basket", "kirana", "provision", "more retail", "spencer"
    ],
    "Transport": [
        "uber", "ola", "rapido", "metro", "petrol", "fuel", "irctc", "railway",
        "flight", "indigo", "air india", "auto", "toll", "fastag"
    ],
    "Subscription": [
        "netflix", "spotify", "prime video", "hotstar", "youtube premium",
        "icloud", "google one", "apple music", "disney", "audible", "aha", "sony liv"
    ],
    "Food & Dining": [
        "restaurant", "zomato", "swiggy", "cafe", "dominos", "mcdonald", "pizza",
        "starbucks", "subway", "burger king", "kfc", "diner", "tea stall", "chai point"
    ],
    "Shopping": [
        "amazon", "flipkart", "myntra", "ajio", "meesho", "zara", "h&m", "croma",
        "reliance digital", "nykaa", "tata cliq", "decathlon", "lifestyle"
    ],
    "Bills & Utilities": [
        "electricity", "recharge", "jio", "airtel", "vi", "vodafone", "wifi",
        "broadband", "gas bill", "water bill", "bescom", "tneb", "mahavitaran",
        "piped gas", "cylinder"
    ],
    "Health": [
        "pharmacy", "apollo", "medplus", "hospital", "clinic", "diagnostic",
        "1mg", "pharmeasy", "doctor", "dentist", "lab test"
    ],
    "Entertainment": [
        "bookmyshow", "pvr", "inox", "steam", "playstation", "cinema", "theatre",
        "gaming", "amusement"
    ],
    "Education": [
        "udemy", "coursera", "college", "tuition", "books", "edx", "school",
        "course", "exam fee", "unacademy"
    ],
    "Income": [
        "salary", "interest", "dividend", "refund", "credit interest", "freelance",
        "stipend", "bonus"
    ],
}


def categorize(description: str) -> str:
    """Categorizes a transaction description based on predefined keyword rules.
    
    Returns category name or 'Uncategorized'.
    """
    if not description:
        return "Uncategorized"
    text = description.lower()
    for category, keywords in RULES.items():
        if any(k in text for k in keywords):
            return category
    return "Uncategorized"

