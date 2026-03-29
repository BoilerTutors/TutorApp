def test_root_returns_api_info(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "BoilerTutors API"
    assert "docs" in data

