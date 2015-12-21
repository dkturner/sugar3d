__author__ = 'David Turner'

import os
from uuid import uuid4
from google.appengine.ext.blobstore import blobstore
from google.appengine.api import images, mail, taskqueue
from google.appengine.ext import db
import cloudstorage as gcs
import time
import urllib

def is_debug_environment():
    if os.getenv('SERVER_SOFTWARE') and os.getenv('SERVER_SOFTWARE').startswith('Google App Engine/'):
        return False
    return True

def web_to_bool(data):
    if data is None:
        return False
    if isinstance(data, (str, unicode)):
        try:
            if data.title() == 'True':
                return True
            if data.title() == 'False':
                return False
        except:
            try:
                return int(data)
            except:
                return len(data) > 0
    return bool(data)


def geolocate(request):
    country = request.headers.get('X-Appengine-Country', None)
    region = request.headers.get('X-Appengine-Region', None)
    city = request.headers.get('X-Appengine-City', None)
    latlon = request.headers.get('X-Appengine-Citylatlong', '').split(',')
    lat, lon = None, None
    if len(latlon) == 2:
        lat, lon = latlon
    import logging
    logging.info('Platform geolocate: %s, %s, %s, %s, %s' % (country, region, city, lat, lon))
    return country, region, city, lat, lon


def _copy(dst, src):
    while True:
        bytes = src.read(16384)
        if len(bytes) == 0:
            break
        dst.write(bytes)

def get_secure_url(href, serve_as_filename=None):
    if is_debug_environment():
        return href
    filename = href[32:]
    signature, expires = _create_url_signature(filename)
    url = 'https://storage.cloud.google.com%s?GoogleAccessId=%s&Expires=%d&Signature=%s' % (
        filename, SERVICE_ACCOUNT_ADDRESS, expires, urllib.quote(signature))
    if serve_as_filename:
        url = url + '&response-content-disposition=attachment;%20filename=' + urllib.quote(serve_as_filename)
    return url

def _create_url_signature(resource, expiration=60*60*12):
    expires_time = time.time() + expiration
    payload = "GET\n\n\n%s\n%s" % (expires_time, resource)
    sha_hash = SHA256.new(payload)
    signer = PKCS1_v1_5.new(SERVICE_ACCOUNT_PRIVATE_KEY)
    signature = signer.sign(sha_hash)
    return signature.encode('base64'), expires_time


def queue_task(queue, url, **kwargs):
    taskqueue.add(queue_name=queue, url=url, params=kwargs)

if is_debug_environment():
    email_sender = 'daddy@sugar-1166.appspotmail.com'
else:
    email_sender = 'Sugar 3d <daddy@sugar-1166.appspotmail.com>'

def send_mail(to, subject, body_html, body_txt, attachments):
    msg = mail.EmailMessage(sender=email_sender, to=to, subject=subject)
    if body_html:
        msg.html = body_html
    msg.body = body_txt
    if attachments:
        for i in xrange(len(attachments)):
            if isinstance(attachments[i], (list, tuple)) and len(attachments[i]) == 3:
                attachments[i] = mail.Attachment(attachments[i][0], attachments[i][1], content_id=attachments[i][2])
        msg.attachments = attachments
    msg.send()


SERVICE_ACCOUNT_ADDRESS = '1025171404406-5ahkqjuqfd19hpuvrscfikv47uj5220a@developer.gserviceaccount.com'

try:
    import Crypto.Hash.SHA256 as SHA256
    import Crypto.PublicKey.RSA as RSA
    import Crypto.Signature.PKCS1_v1_5 as PKCS1_v1_5
    SERVICE_ACCOUNT_PRIVATE_KEY = RSA.importKey(
     'MIIEowIBAAKCAQEAxQuoe5bP2JLIr/Crx7+4UFbnZz+wYF5QVj7JysOdmcODH31EhoezT25JUcxv\nRJ5n3gNeNY+RKljtypzI+n3ivAMIfRKK5ZL'
     'Rd0tLcHezD5kDZ1ja1k931FP3SmH4jhFQ1pKEg/dq\nWrvJwO7NEEm7oF9kGYGmW9V01qORiGF0sV7O+OF+X3wOU7cN4IqGHOnSPJ9R7GojhnuXSJ'
     'HeRs+i\naq7QYnxI3Jt4iT9lAjF8a5+QJ+3v14xZFAvpGu1fGZ7z1Xy8UPixsEd7QnTQqIpPkmIcGXjGXOiT\ngOobsytRLz9K05p8oXI8LyOKG3u'
     'opVDg4/Ey+WkLC6NCqfvxPkcXjQIDAQABAoIBAEb2ZdzseTnz\n0taaBCNRxl0Yjwm+BBUQojoNLrsZK77ejHBgurcAU/E9NKaCy2eY7Ksl512+sH'
     'bhw/F9+VtMzsUL\nCpmQffkjoNAni6mbUh9B6dnkRBt+Txdmjd553fu7/LLp3VNxXRoEGyqiVbOR+kJNWE1fRbw46XUL\nPzQwdMgTTLiD+sv4r0t'
     'LvW0FzI5R7Z2nzuiL77Y6bf2qS/BfTcttPtpyJUzm5IrVJgNsxC0bI/8F\nlTpAc5Wxp7DLezKGnNhqbK2YnbqtBcFPJPpvFBCjBMCOhhxo5H7g7v'
     'YL0aoxlvUza/mrJAPNP4Xz\nf9ycWwUHJ4LxJSpYmGpRCEOHsQECgYEA72mlDzPNpcaLVVWjhTAzosneu3btLh5T2G7sBPyaM2fl\nf6BedZMyiiM'
     'hV9U4l8rsznWmKwpDXaQCQT3AVeC9LsPFCgZJwcygzRElHOxtaMJLH/zGjdxu5Gn0\nogNQyS+6+9R7ITCp1SNNj8vD0AOJOli4ezjyym9rPRccSX'
     'nVKWECgYEA0rKRBeUIVYxsCHOcxkPp\nns2nDIJBlPUooe6qUmUjVv0c+40cBw6IZGmGzFQvU0kWW/nOlqmafB6RF58vo6e2wl48qcQg/CHA\nDoG'
     'b/leFgA5LNOi/xYpFC/XRbFXGiIpRNXoYr0XA21UlDm34Cb5vIAgg3wlzto+eJP9CHSoIwa0C\ngYAlTE4cujNVmkLmvnrFKydAOzbp+bMlti/Vzi'
     'IS/M+BJrSIV5Gfu5jqEGMHbf5tF34hBA8pMWYh\nVoXLaDVoq6SNfo5Z63TeLmT2za78fJDm+y39A8JjI25bQ26LNv0E+tykkwvDtfMfc2qH9nTBG'
     'Wvt\nnRjQiaS5iPYqBEmx4LsmwQKBgQDACOiNCtaxwi6k9VqqijNf/eiHSiEj9t512OV7+5peKoxD6bTl\n6aT+f//QM9p+elrasbBNOYAIKIPtl7'
     'T/4Fh+hw2bXZsCsnAtyIu5IWQX9u8s5gYDsaaE5CNgLj2p\nLQgfSY0+EsFYJx6DLE+p8duuwjnTjvXcKsHkzpIfqrQYcQKBgDXsx/rtd6q9jCQ1R'
     'd+g8V/ZYt4X\n3IavPVKnI/wxSVJXObUKtDH1UtKbpDxw+h9GPCRc+r4pLUns1CMUGljR/Kdk0gyXpAHkq5P4FU1b\n/PptikVByxSzsWXgCzs3XW'
     'ANqgb+5r6cNjoJ5vJPMvZVY07/BadYjvzKBGBibEndYBCo\n'.decode('base64'))
except:
    SERVICE_ACCOUNT_PRIVATE_KEY = None

