import pytest


@pytest.mark.skip(reason="TODO: create users + auth token fixture, then test /messages endpoints")
def test_messages_list_requires_auth(client):
    # Example:
    # resp = client.get("/messages")
    # assert resp.status_code in (401, 403)
    assert True

