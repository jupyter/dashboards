# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from tornado import web
from tornado.gen import Task, Return, coroutine
from tornado.process import Subprocess
from tornado.httputil import HTTPHeaders
import subprocess
import gzip

@coroutine
def call_subprocess(cmd, env={}, stdin_data=None):
    '''
    Spawns a subprocess and streams its stdout and stderr asynchronously.
    Sets the optional environment variables and feeds optional data on stdin.

    :param cmd:
    :param env:
    :param stdin_data:
    '''
    sub_process = Subprocess(
        cmd, 
        stdin=subprocess.PIPE,
        stdout=Subprocess.STREAM, 
        stderr=Subprocess.STREAM,
        env=env
    )

    if stdin_data:
        sub_process.stdin.write(stdin_data)
        sub_process.stdin.close()

    result, error = yield [
        Task(sub_process.stdout.read_until_close),
        Task(sub_process.stderr.read_until_close)
    ]

    raise Return((result, error))


@coroutine
def git_http_backend(request, root, path):
    '''
    Invokes git-http-backend like a CGI script.

    :param request:
    :param root:
    :param path:
    '''
    cgi_env = {
        'REQUEST_METHOD' : request.method,
        'GIT_HTTP_EXPORT_ALL' : 'yes',
        'GIT_PROJECT_ROOT' : root,
        'PATH_INFO' : '/'+path,
        'QUERY_STRING' : request.query,
        'CONTENT_TYPE' : request.headers.get('Content-Type', '')
    }
    
    result, error = yield call_subprocess(
        '/usr/lib/git-core/git-http-backend',
        cgi_env,
        request.body
    )

    raise Return((result, error))

def parse_git_http_backend(result):
    '''
    Parses output from git-http-backend into HTTPHeaders and body bytes.

    :param result:
    '''
    end_of_headers = result.find(b'\r\n\r\n')
    headers = HTTPHeaders.parse(result[:end_of_headers].decode('utf-8'))
    body = result[end_of_headers+4:]
    return headers, body


class GitSmartHTTPHandler(web.RequestHandler):
    '''
    Fronts git-http-backend to implement a gateway for git's smart http 
    protocol.
    '''
    def initialize(self, bundle_path):
        self.bundle_path = bundle_path

    @coroutine
    def invoke_git_http_backend(self, path):
        '''
        Invokes git-http-backend with the request and returns its response
        headers and body.
        '''
        # Handle gzip encoded data
        if self.request.headers.get('Content-Encoding') == 'gzip':
            self.request.body = gzip.decompress(self.request.body)


        result, error = yield git_http_backend(
            self.request, 
            self.bundle_path, 
            path
        )

        headers, body = parse_git_http_backend(result)
        
        # If there was anything on stderr, something went wrong
        if error:
            # Assume 500 unless we can detect something to the contrary
            status = headers.get('status', '500 internal server error')
            segs = status.split(' ')
            raise web.HTTPError(int(segs[0]), ' '.join(segs[1:]))

        # Encode as gzip if required
        # if self.request.headers.get('Accept-Encoding') == 'gzip':
            # body = gzip.compress(body)
            # self.set_header('Content-Encoding', 'gzip')

        # Respond with headers and body
        for key, value in headers.items():
            self.set_header(key, value)
        self.finish(body)

    @coroutine
    def get(self, path):
        yield self.invoke_git_http_backend(path)

    @coroutine
    def post(self, path):
        yield self.invoke_git_http_backend(path)