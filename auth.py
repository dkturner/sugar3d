import webapp2
import db
import logging
from datetime import *
from urlparse import urlsplit, urlunsplit
from oauth.models import OAuth_Token
from oauth.handlers import AuthorizationHandler, AccessTokenHandler
import web_platform
from web_platform import web_to_bool

# Notes:
# Access tokens usually live shorter than access grant
# Refresh tokens usually live as long as access grant

class DbAuthorization(AuthorizationHandler):
    def authorize(self, client_id):
        logging.info('authorizing: %s' % (client_id,))
        return 'https://sugar3d-1166.appspot.com'

class DbAuthentication(AccessTokenHandler):
    def authenticate_client(self, client_id, client_secret):
        logging.info('authenticating client: %s -- %s' % (client_id, client_secret))
        if client_id == 'sugar3d':
            return True
        return False

    def authenticate_user(self, username, password):
        logging.info('authenticating user: %s -- %s' % (username, password))
        self.response.headers['access-control-allow-origin'] = '*'
        user_data = db.authenticate(username, password)
        if not user_data:
            return False, 'Invalid password'
        return True, user_data

language_map = {
    'AM': 'ru', 'AZ': 'ru', 'BY': 'ru', 'EE': 'ru', 'GE': 'ru', 'KG': 'ru', 'KZ': 'ru', 'LV': 'ru', 'MD': 'ru',
    'RU': 'ru', 'TJ': 'ru',
}

class LoginHandler(webapp2.RequestHandler):
    def post(self):
        domain = 'sugar3d-1166.appspot.com'
        scheme = 'https'
        if web_platform.is_debug_environment():
            domain = self.request.host
            scheme = 'http'

        logging.info('Auth request: {%s}', ', '.join('%s: "%s"' % (k, self.request.POST[k]) for k in self.request.POST))
        username = self.request.POST['username']
        password = self.request.POST['pwd_hash']
        redirect = self.request.POST.get('redirect', '/')
        redirect = urlunsplit([scheme, domain] + list(urlsplit(redirect)[2:]))
        refresh = '0; url=' + redirect
        self.response.headers['content-type'] = 'text/html'

        if web_to_bool(self.request.POST.get('new_user', False)):
            country, region, city, lat, lon = web_platform.geolocate(self.request)
            language = language_map.get(country, 'en')
            db.create_user(username, password, language)
        user_id, user_data = db.authenticate(username, password)
        if not user_data:
            self.error(401)
            refresh = '0; url=%s://%s/?auth=401' % (scheme, domain)
        else:
            country, region, city, lat, lon = web_platform.geolocate(self.request)
            if country:
                db.update_geolocation(user_id, country, region, city, lat, lon)
            token = OAuth_Token(
                client_id   = 'sugar3d',   # In this case we are our own OAuth client
                user_id     = str(user_id),
                scope       = 'site',
                extra       = user_data)
            token.put()
            # if ':' in domain:
            #     hostname = domain[:domain.find(':')]
            # else:
            #     hostname = domain
            self.response.set_cookie('authToken', value=token.access_token, expires=datetime.now() + timedelta(days=1))
        self.response.out.write('<html><head><meta http-equiv="refresh" content="')
        self.response.out.write(refresh)
        self.response.out.write('"></head><body></body></html>')
        self.response.headers['refresh'] = refresh

app = webapp2.WSGIApplication([
        ('/auth/authorize',    DbAuthorization),
        ('/auth/token',        DbAuthentication),
        ('/auth/login',        LoginHandler)
        ],debug=True)
