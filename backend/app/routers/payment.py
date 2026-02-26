from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
import stripe
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import User

router = APIRouter()


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


@router.get("/connect/onboarding")
def create_connect_onboarding(
    current_user: User = Depends(get_current_user),
    refresh_url: str | None = Query(default=None),
    return_url: str | None = Query(default=None),
):
    """
    Create a Stripe Connect account onboarding link and return it as JSON.

    Query params can override configured defaults:
    - refresh_url: where Stripe returns if onboarding is interrupted/expired
    - return_url: where Stripe returns after onboarding
    """
    stripe_secret_key = (
        settings.stripe_secret_key.get_secret_value()
        if settings.stripe_secret_key is not None
        else None
    )
    if not stripe_secret_key:
        raise HTTPException(status_code=500, detail="Stripe is not configured on the server")

    effective_refresh_url = refresh_url or settings.stripe_connect_refresh_url
    effective_return_url = return_url or settings.stripe_connect_return_url
    if not effective_refresh_url or not effective_return_url:
        raise HTTPException(
            status_code=400,
            detail="refresh_url and return_url are required (query params or server config)",
        )

    stripe.api_key = stripe_secret_key

    try:
        account_id = current_user.stripe_account_id
        if not account_id:
            account = stripe.Account.create(
                type="express",
                email=current_user.email,
                metadata={"user_id": str(current_user.id)},
                
                business_type="individual",
                business_profile={
                    "url": "https://yourtutoringapp.com/tutors/sam",
                    "product_description": "Independent tutor providing educational services on the platform.",
                    "mcc": "8299"
                },
                individual={
                    "first_name": current_user.first_name,
                    "last_name": current_user.last_name,
                    # "phone": "+1234567890", # Uncomment and add if you have it!
                    # "address": { 
                    #     "line1": "123 Main St",
                    #     "city": "West Lafayette",
                    #     "state": "IN",
                    #     "postal_code": "47906"
                    # } 
                }
                
            )
            account_id = account.id

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
    except stripe.error.StripeError as exc:
        message = exc.user_message or str(exc)
        raise HTTPException(status_code=400, detail=message)

    # return RedirectResponse(url=account_link.url, status_code=status.HTTP_303_SEE_OTHER)
    return {
        "account_id": account_id,
        "onboarding_url": account_link.url,
        "refresh_url": effective_refresh_url,
        "return_url": onboarding_return_url,
    }


@router.post("/connect/onboarding/complete")
def complete_connect_onboarding(
    account_id: str = Query(min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stripe_secret_key = (
        settings.stripe_secret_key.get_secret_value()
        if settings.stripe_secret_key is not None
        else None
    )
    if not stripe_secret_key:
        raise HTTPException(status_code=500, detail="Stripe is not configured on the server")

    stripe.api_key = stripe_secret_key
    try:
        account = stripe.Account.retrieve(account_id)
    except stripe.error.StripeError as exc:
        message = exc.user_message or str(exc)
        raise HTTPException(status_code=400, detail=message)

    metadata_user_id = account.get("metadata", {}).get("user_id")
    if metadata_user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Stripe account does not belong to current user")

    details_submitted = bool(account.get("details_submitted"))
    if not details_submitted:
        raise HTTPException(status_code=400, detail="Stripe onboarding is not complete yet")

    current_user.stripe_account_id = account_id
    db.commit()
    db.refresh(current_user)

    return {
        "message": "Stripe onboarding complete",
        "stripe_account_id": current_user.stripe_account_id,
        "charges_enabled": bool(account.get("charges_enabled")),
        "payouts_enabled": bool(account.get("payouts_enabled")),
    }
