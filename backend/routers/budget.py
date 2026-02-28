from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas import TransactionCreate, TransactionResponse, BudgetStatus
from services import budget_service
from models import User
from auth_utils import get_current_user

router = APIRouter()


@router.get("/status", response_model=BudgetStatus)
def get_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return budget_service.get_budget_status(db, user_id=current_user.id)


@router.post("/transaction", response_model=TransactionResponse)
def add_transaction(
    tx: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget_service.is_within_budget(db, current_user.id, tx.amount)
    return budget_service.add_transaction(
        db, current_user.id, tx.amount, tx.category, tx.description
    )


@router.get("/check")
def check_budget(
    amount: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return budget_service.is_within_budget(db, current_user.id, amount)


@router.put("/settings")
def update_budget(
    daily: float = None,
    monthly: float = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if daily is not None:
        current_user.daily_budget = daily
    if monthly is not None:
        current_user.monthly_budget = monthly
    db.commit()
    return {"daily_budget": current_user.daily_budget, "monthly_budget": current_user.monthly_budget}
