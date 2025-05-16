def test_basic():
    assert True

def test_app_config():
    from app3 import app
    assert app.config['DEBUG'] is False
