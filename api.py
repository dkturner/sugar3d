__author__ = 'David Turner'

import db
from json import dumps, loads
from bottle import BaseRequest, Bottle, request, response, error, debug, abort, HTTPError
from markupsafe import escape
import oauth
import logging
import web_platform
import appmail
import re
from datetime import datetime
import urllib, urllib2, hmac, hashlib
from xml.etree.ElementTree import parse as xmlParse
from web_platform import web_to_bool


debug(True)
bottle = Bottle()
BaseRequest.MEMFILE_MAX = 10 * 1024 * 1024


def json(data):
    response.content_type = 'application/json'
    return dumps(data)

def error(id, message):
    response.status = 500
    return {'errorid': id, 'errormsg': message}

def assert_authorized(role):
    if role is None:
        return
    if not request.user_id:
        raise HTTPError(401, "Authorization required", **{'Access-Control-Allow-Origin': '*'})
    if role not in request.user_roles:
        raise HTTPError(403, "Forbidden: role %s not authorized" % (role,), **{'Access-Control-Allow-Origin': '*'})

def apicall(url, authz=None, methods=['GET', 'POST']):
    def wrapper(fn):
        def invoke():
            response.add_header('Access-Control-Allow-Origin', '*')
            auth = request.headers.get('Authorization')
            request.user_id = None
            request.user_roles = []
            if auth and auth.startswith('Bearer '):
                user = oauth.get_user(auth[7:])
                if user:
                    userId, userData = user
                    request.user_id = userId
                    request.user_roles = ['user']
                else:
                    logging.error('Failed to resolve auth token %s', auth[7:])
            assert_authorized(authz)
            try:
                return json(fn(request.json or request.params))
            except db.UnauthorizedError as x:
                response.status = 403
                return dict(errorid=403, errormsg='no write access',
                            targetType=x.target_type, targetPerson=x.target_person)
            except Exception as x:
                import traceback
                if web_platform.is_debug_environment():
                    response.status = 500
                    return dict(errorid=0, errormsg=str(x), traceback=traceback.format_exc())
                else:
                    logging.error(traceback.format_exc())
                    return error(0, str(x))
        def options():
            response.add_header('Access-Control-Allow-Origin', '*')
            response.add_header('Access-Control-Allow-Methods', 'POST')
            response.add_header('Access-Control-Allow-Credentials', 'true')
            response.add_header('Access-Control-Allow-Headers', 'accept,authorization,content-type')
        bottle.route(url, method='OPTIONS')(options)  # needed for CORS
        for m in methods:
            result = bottle.route(url, method=m)(invoke)
        return result
    return wrapper

@bottle.route('/tasks/maintenance')
def maintenance():
    try:
        oauth.clean_auth_db()
        web_platform.run_maintenance()
        return json(dict(status='ok'))
    except:
        import traceback
        return json(dict(status='error', traceback=traceback.format_exc()))

