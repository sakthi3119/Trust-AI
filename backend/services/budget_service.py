"""
Budget Guardian Service
Tracks user spending and enforces budget constraints.
"""

from datetime import datetime, date
from sqlalchemy.orm import Session
from models import Transaction, User


def get_spent_today(db: Session, user_id: int = 1) -> float:
    today = date.today().isoformat()
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id, Transaction.date == today)
        .all()
    )
    return sum(t.amount for t in transactions)


def get_spent_this_month(db: Session, user_id: int = 1) -> float:
    month_prefix = date.today().strftime("%Y-%m")
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id, Transaction.date.like(f"{month_prefix}%"))
        .all()
    )
    return sum(t.amount for t in transactions)


def get_transactions_today(db: Session, user_id: int = 1) -> list:
    today = date.today().isoformat()
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id, Transaction.date == today)
        .order_by(Transaction.timestamp.desc())
        .all()
    )


def add_transaction(db: Session, user_id: int, amount: float, category: str, description: str) -> Transaction:
    today = date.today().isoformat()
    tx = Transaction(
        user_id=user_id,
        amount=amount,
        category=category,
        description=description,
        date=today,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def is_within_budget(db: Session, user_id: int, amount: float) -> dict:
    """
    Check if a proposed expense fits within the daily budget.
    Returns {allowed, remaining, warning}
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"allowed": True, "remaining": 9999, "warning": None}

    spent = get_spent_today(db, user_id)
    remaining = user.daily_budget - spent

    if amount > remaining:
        return {
            "allowed": False,
            "remaining": remaining,
            "warning": f"This would exceed your daily budget by ₹{amount - remaining:.0f}. Remaining: ₹{remaining:.0f}",
        }
    if (remaining - amount) < (user.daily_budget * 0.10):
        return {
            "allowed": True,
            "remaining": remaining - amount,
            "warning": f"Warning: Only ₹{remaining - amount:.0f} will be left after this expense.",
        }
    return {"allowed": True, "remaining": remaining - amount, "warning": None}


def get_budget_status(db: Session, user_id: int = 1) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {}

    spent_today = get_spent_today(db, user_id)
    spent_month = get_spent_this_month(db, user_id)
    remaining_today = max(0, user.daily_budget - spent_today)
    remaining_month = max(0, user.monthly_budget - spent_month)

    warning = None
    if remaining_today < user.daily_budget * 0.15:
        warning = f"⚠️ Low daily budget! Only ₹{remaining_today:.0f} remaining today."
    elif remaining_month < user.monthly_budget * 0.10:
        warning = f"⚠️ Monthly budget almost exhausted. ₹{remaining_month:.0f} left this month."

    return {
        "daily_budget": user.daily_budget,
        "spent_today": spent_today,
        "remaining_today": remaining_today,
        "monthly_budget": user.monthly_budget,
        "spent_month": spent_month,
        "remaining_month": remaining_month,
        "warning": warning,
        "transactions_today": get_transactions_today(db, user_id),
    }
