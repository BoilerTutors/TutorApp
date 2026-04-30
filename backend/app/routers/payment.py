from typing import Optional
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
#import stripe
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import User

router = APIRouter()


class ConnectOnboardingCompleteRequest(BaseModel):
    account_id: str = Field(min_length=1)


def _append_query_param(url: str, key: str, value: str) -> str:
    split_url = urlsplit(url)
    query = dict(parse_qsl(split_url.query, keep_blank_values=True))
    query[key] = value
    return urlunsplit(
        (
            split_url.scheme,
            split_url.netloc,
            split_url.path,
            urlencode(query),
            split_url.fragment,
        )
    )


def _get_stripe_secret_key() -> str:
    stripe_secret_key = (
        settings.stripe_secret_key.get_secret_value()
        if settings.stripe_secret_key is not None
        else None
    )
    if not stripe_secret_key:
        raise HTTPException(status_code=500, detail="Stripe is not configured on the server")
    return stripe_secret_key


def _get_or_create_connected_account(current_user: User, db: Session) -> str:
    account_id = current_user.stripe_account_id
    if account_id:
        try:
            account = stripe.Account.retrieve(account_id)
        except stripe.error.StripeError as exc:
            message = exc.user_message or str(exc)
            raise HTTPException(status_code=400, detail=message)
        metadata_user_id = account.get("metadata", {}).get("user_id")
        if metadata_user_id and metadata_user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Stripe account does not belong to current user")
        return account_id

    try:
        account = stripe.Account.create(
            type="express",
            email=current_user.email,
            metadata={"user_id": str(current_user.id)},
        )
    except stripe.error.StripeError as exc:
        message = exc.user_message or str(exc)
        raise HTTPException(status_code=400, detail=message)

    account_id = account.id
    current_user.stripe_account_id = account_id
    db.commit()
    db.refresh(current_user)
    return account_id


@router.get("/connect/onboarding")
def create_connect_onboarding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    refresh_url: Optional[str] = Query(default=None),
    return_url: Optional[str] = Query(default=None),
):
    """
    Create a Stripe Connect account onboarding link and return it as JSON.
    Query params can override configured defaults:
    - refresh_url: where Stripe returns if onboarding is interrupted/expired
    - return_url: where Stripe returns after onboarding
    """
    stripe_secret_key = _get_stripe_secret_key()

    effective_refresh_url = refresh_url or settings.stripe_connect_refresh_url
    effective_return_url = return_url or settings.stripe_connect_return_url
    if not effective_refresh_url or not effective_return_url:
        raise HTTPException(
            status_code=400,
            detail="refresh_url and return_url are required (query params or server config)",
        )

    stripe.api_key = stripe_secret_key

    try:
        account_id = _get_or_create_connected_account(current_user, db)

        onboarding_return_url = _append_query_param(
            effective_return_url,
            "account_id",
            account_id,
        )

        account_link = stripe.AccountLink.create(
            account=account_id,
            refresh_url=effective_refresh_url,
            return_url=onboarding_return_url,
            type="account_onboarding",
        )
        account = stripe.Account.retrieve(account_id)
    except stripe.error.StripeError as exc:
        message = exc.user_message or str(exc)
        raise HTTPException(status_code=400, detail=message)

    return {
        "account_id": account_id,
        "onboarding_url": account_link.url,
        "refresh_url": effective_refresh_url,
        "return_url": onboarding_return_url,
        "details_submitted": bool(account.get("details_submitted")),
        "charges_enabled": bool(account.get("charges_enabled")),
        "payouts_enabled": bool(account.get("payouts_enabled")),
    }


@router.post("/connect/onboarding/complete")
def complete_connect_onboarding(
    data: ConnectOnboardingCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stripe_secret_key = _get_stripe_secret_key()

    stripe.api_key = stripe_secret_key
    try:
        account = stripe.Account.retrieve(data.account_id)
    except stripe.error.StripeError as exc:
        message = exc.user_message or str(exc)
        raise HTTPException(status_code=400, detail=message)

    metadata_user_id = account.get("metadata", {}).get("user_id")
    if metadata_user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Stripe account does not belong to current user")

    details_submitted = bool(account.get("details_submitted"))
    if not details_submitted:
        raise HTTPException(status_code=400, detail="Stripe onboarding is not complete yet")

    current_user.stripe_account_id = data.account_id
    db.commit()
    db.refresh(current_user)

    return {
        "message": "Stripe onboarding complete",
        "stripe_account_id": current_user.stripe_account_id,
        "details_submitted": details_submitted,
        "charges_enabled": bool(account.get("charges_enabled")),
        "payouts_enabled": bool(account.get("payouts_enabled")),
    }


@router.get("/connect/status")
def get_connect_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stripe_secret_key = _get_stripe_secret_key()
    stripe.api_key = stripe_secret_key

    account_id = _get_or_create_connected_account(current_user, db)

    try:
        account = stripe.Account.retrieve(account_id)
    except stripe.error.StripeError as exc:
        message = exc.user_message or str(exc)
        raise HTTPException(status_code=400, detail=message)

    details_submitted = bool(account.get("details_submitted"))
    charges_enabled = bool(account.get("charges_enabled"))
    payouts_enabled = bool(account.get("payouts_enabled"))
    ready_for_payments = details_submitted and charges_enabled
    ready_for_payouts = details_submitted and payouts_enabled

    return {
        "stripe_account_id": account_id,
        "details_submitted": details_submitted,
        "charges_enabled": charges_enabled,
        "payouts_enabled": payouts_enabled,
        "ready_for_payments": ready_for_payments,
        "ready_for_payouts": ready_for_payouts,
    }