"""Authentication helpers.

- authenticate_user (verify email + password)
- create_access_token (JWT generation)
- get_current_user (decode token, return User)
- handle_mfa (generate code, verify code, check expiry/attempts)
"""
