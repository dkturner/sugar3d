def clean_auth_db():
    from models import OAuth_Token
    OAuth_Token.remove_old()

def get_user(bearer_token):
    from models import OAuth_Token
    for i in xrange(5):
        token = OAuth_Token.get_by_access_token(bearer_token)
        if token:
            return token.user_id, token.extra
        import time
        time.sleep(0.5)
    return None