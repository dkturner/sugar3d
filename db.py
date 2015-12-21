__author__ = 'David Turner'

import MySQLdb, MySQLdb.converters
import web_platform
import logging
import json
from time import time
from datetime import datetime
from calendar import timegm
from dateutil.parser import parse as parse_date

class UnauthorizedError(Exception):
    def __init__(self, target_type, target_person):
        Exception.__init__(self, 'no write access')
        self.target_type = target_type
        self.target_person = target_person

def connect():
    if web_platform.is_debug_environment():
        return MySQLdb.connect(host='localhost', user='admin_sugar3d', passwd='sugar3d', db='sugar3d', charset='utf8')
    else:
        return MySQLdb.connect(unix_socket='/cloudsql/sugar3d-1166:sugar3d', user='root', db='sugar3d', charset='utf8')

_current_transaction = None

def execute_command(sql, *args):
    if _current_transaction and not _current_transaction.finished:
        return _current_transaction.execute_command(sql, *args)
    con = connect()
    csr = con.cursor()
    try:
        csr.execute(sql, args)
        con.commit()
        return csr.lastrowid
    finally:
        csr.close()
        con.close()

def execute_many(sql, arglist):
    if _current_transaction and not _current_transaction.finished:
        return _current_transaction.execute_many(sql, arglist)
    con = connect()
    csr = con.cursor()
    try:
        csr.executemany(sql, arglist)
        con.commit()
    finally:
        csr.close()
        con.close()

def query(sql, *args):
    if _current_transaction and not _current_transaction.finished:
        return _current_transaction.query(sql, *args)
    con = connect()
    csr = con.cursor()
    try:
        csr.execute(sql, args)
        return csr.fetchall()
    finally:
        csr.close()
        con.close()

class transaction(object):
    def __init__(self):
        self._con = connect()
        self._csr = self._con.cursor()
        self._count = 1

    @property
    def finished(self):
        return self._csr == None

    def push(self):
        self._count += 1

    def pop(self):
        self._count -= 1
        if self._count == 0:
            self._con.commit()
        return self._count

    def execute_command(self, sql, *args):
        self._csr.execute(sql, args)
        return self._csr.lastrowid

    def query(self, sql, *args):
        self._csr.execute(sql, args)
        return self._csr.fetchall()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if not exc_type:
            self._con.commit()
        if self._csr:
            self._csr.close()
            self._con.close()
            self._csr = None

def begin_transaction():
    global _current_transaction
    if _current_transaction and not _current_transaction.finished:
        _current_transaction.push()
    else:
        _current_transaction = transaction()
    return _current_transaction

def end_transaction():
    global _current_transaction
    if _current_transaction:
        if _current_transaction.pop() == 0:
            _current_transaction = None

