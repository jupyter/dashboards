# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from notebook.utils import url_path_join, url2path
from notebook.base.handlers import IPythonHandler
from tornado import web
from tornado import escape
from .. import converter
from . import git_handler
import errno
import random
import string
import tempfile
import os
import zipfile
import shutil

# Well-known endpoint for Bluemix one-click deploys
BLUEMIX_DEPLOY = 'https://hub.jazz.net/deploy/index.html?repository='

def generate_id(size=15, chars=string.ascii_letters + string.digits):
    '''
    Generates a random string from ascii letters and digits.
    '''
    return ''.join(random.SystemRandom().choice(chars) for _ in range(size))

class NewBundleHandler(IPythonHandler):
    def initialize(self, nb_dir, tmp_dir):
        self.nb_dir = nb_dir
        self.tmp_dir = tmp_dir

        # Make directory where bundles will reside until pickup
        os.makedirs(self.tmp_dir, mode=0o770, exist_ok=True)

    @web.authenticated
    def get(self):
        '''
        Converts a notebook into an application bundle. Respects the `type`
        query  argument as the type of bundle to produce. Responds with the
        bundle or a pointer to it depending on the type.

        :arg notebook: path to the notebook relative to the notebook directory
            root
        :arg type: `bluemix` generates a Bluemix application
        '''
        notebook = self.get_query_argument('notebook')
        bundle_type = self.get_query_argument('type')
        abs_nb_path = os.path.join(self.nb_dir, url2path(notebook))

        if not os.path.isfile(abs_nb_path):
            raise web.HTTPError(400, 'notebook not found')

        if bundle_type == 'bluemix':
            self._get_bluemix_app(abs_nb_path)
        elif bundle_type == 'zip':
            self._get_app_zip(abs_nb_path)
        elif bundle_type == 'dashboard':
            self._get_local_app(abs_nb_path)
        elif bundle_type == 'ipynb':
            self._get_ipynb_with_files(abs_nb_path)
        else:
            raise web.HTTPError(400, 'unknown bundle type')

    def _create_app_bundle(self, abs_nb_path, bundle_dir_suffix=None,
        bundle_root=None, overwrite=False, template_fn=None):
        '''
        Creates an application bundle containing a manifest.yml for Cloud
        Foundry and a Dockerfile for Docker.

        :param abs_nb_path:
        :param bundle_dir_suffix:
        :param bundle_root:
        :param overwrite:
        :return: 6-tuple of notebook basename, unique ID of the bundle,
            absolute path to the bundle directory, URL of this Jupyter server,
            URL of the kernel service that will be used as the backend for
            the dashboard when deployed, whether the kernel service is tmpnb 
            or not
        '''
        notebook_basename = os.path.basename(abs_nb_path)
        notebook_basename = os.path.splitext(notebook_basename)[0]

        if bundle_root is None:
            bundle_id = generate_id()
            bundle_dir = os.path.join(self.tmp_dir,
                bundle_id,
                notebook_basename
            )
        else:
            bundle_id = notebook_basename
            bundle_dir = os.path.join(bundle_root,
                notebook_basename
            )

        if bundle_dir_suffix is not None:
            bundle_dir = bundle_dir + bundle_dir_suffix

        # Get client facing scheme and host of this jupyter notebook server
        jupyter_server = '{proto}://{host}{path}'.format(
            proto=self.request.protocol,
            host=self.request.host,
            path=self.application.settings['base_url']
        )

        # Determine if using tmpnb or not
        tmpnb_mode = os.getenv('TMPNB_MODE', 'false')

        # Determine what server to use for later execution of the dashboard
        kernel_server = os.getenv('KERNEL_SERVICE_URL')
        if kernel_server is None:
            # Use this server for execution if one is not provided
            kernel_server = jupyter_server
            tmpnb_mode = 'false'

        if overwrite:
            # Clean up bundle dir if it exists
            shutil.rmtree(bundle_dir, True)

        # Try up to three times to make the bundle directory
        for i in range(3):
            try:
                os.makedirs(bundle_dir)
            except OSError as exc:
                if exc.errno == errno.EEXIST:
                    pass
                else:
                    raise exc
            else:
                break
        else:
            raise RuntimeError('could not create bundle directory')
        # Do the conversion
        converter.to_php_app(abs_nb_path, bundle_dir, template_fn)

        # Return metadata
        return {
            'notebook_basename' : notebook_basename, 
            'bundle_id' : bundle_id, 
            'bundle_dir' : bundle_dir, 
            'jupyter_server' : jupyter_server, 
            'kernel_server' : kernel_server,
            'tmpnb_mode' : tmpnb_mode
        }

    def _get_bluemix_app(self, abs_nb_path):
        '''
        Creates a temporary git repository containing the application bundle.
        Redirects the user's browser to the Bluemix deploy URL with a pointer
        back to the git repository.

        :param abs_nb_path:
        '''
        md = self._create_app_bundle(abs_nb_path, '.git')
        converter.add_cf_manifest(
            md['bundle_dir'], 
            md['kernel_server'], 
            md['notebook_basename'], 
            md['tmpnb_mode']
        )
        converter.to_git_repository(md['bundle_dir'])
        # The jupyter_server already includes the base_url
        bundle_url_path = url_path_join('bundle',
            md['bundle_id'],
            md['notebook_basename'] + '.git'
        )

        # Include repository URL as the argument to deployer
        repository = escape.url_escape(md['jupyter_server'] + bundle_url_path)
        self.redirect(BLUEMIX_DEPLOY+repository)

    def _get_app_zip(self, abs_nb_path):
        '''
        Creates a zip file containing a dashboard application bundle.

        :param abs_nb_path:
        '''
        md = self._create_app_bundle(abs_nb_path)
        converter.add_cf_manifest(
            md['bundle_dir'], 
            md['kernel_server'], 
            md['notebook_basename'], 
            md['tmpnb_mode']
        )
        converter.add_dockerfile(
            md['bundle_dir'], 
            md['kernel_server'], 
            md['tmpnb_mode']
        )
        # Make the zip Archive
        converter.to_zip(md['bundle_dir'], md['bundle_dir'])
        self.set_header('Content-Disposition', 'attachment; filename={}.zip'.format(md['notebook_basename']))
        self.set_header('Content-Type', 'application/zip')
        with open(md['bundle_dir'] + '.zip', 'rb') as zipfile:
            self.write(zipfile.read())
        self.flush()
        self.finish()

    def _get_ipynb_with_files(self, abs_nb_path):
        '''
        Creates a zip file containing the ipynb and associated files.

        :param abs_nb_path: absolute path to the notebook file
        '''
        notebook_basename = os.path.basename(abs_nb_path)
        notebook_basename = os.path.splitext(notebook_basename)[0]

        # pick a tmp directory for the "bundle"
        bundle_id = generate_id()
        bundle_dir = os.path.join(self.tmp_dir,
            bundle_id,
            notebook_basename
        )
        zipfile_path = os.path.join(self.tmp_dir,
            bundle_id,
            notebook_basename
        )
        # Try up to three times to make the bundle directory
        for i in range(3):
            try:
                os.makedirs(bundle_dir)
            except OSError as exc:
                if exc.errno == errno.EEXIST:
                    pass
                else:
                    raise exc
            else:
                break
        else:
            raise RuntimeError('could not create bundle directory')

        referenced_files = converter.get_referenced_files(abs_nb_path, 4)
        # make the zip Archive, is there a more efficient way that copy+zip?
        converter.copylist(os.path.dirname(abs_nb_path), bundle_dir, referenced_files)
        shutil.copy2(abs_nb_path, os.path.join(bundle_dir, os.path.basename(abs_nb_path)))
        shutil.make_archive(zipfile_path, 'zip', bundle_dir)

        # send the archive
        self.set_header('Content-Disposition', 'attachment; filename={}.zip'.format(notebook_basename))
        self.set_header('Content-Type', 'application/zip')
        with open(zipfile_path + '.zip', 'rb') as zipfile:
            self.write(zipfile.read())
        self.flush()
        self.finish()

    def _get_local_app(self, abs_nb_path):
        '''
        Creates a serveable location in the working directory containing a dashboard application bundle.

        :param abs_nb_path:
        '''
        md = self._create_app_bundle(abs_nb_path, bundle_root=os.path.join(self.nb_dir, 'local_dashboards'), overwrite=True, template_fn='local.tpl')
        with open(md['bundle_dir']+'/index.php', encoding="utf-8") as f:
            php = f.read()
        # Just hack the replacement of the one PHP bit for now. Would be better
        # if we could generate plain HTML down in the converter but it requires
        # two templates or a custom preprocessor.
        html = php.replace('<?php echo $_ENV["KERNEL_SERVICE_URL"] ?>', md['jupyter_server'])
        html = html.replace('<?php echo $_ENV["TMPNB_MODE"] ?>', 'false')
        with open(md['bundle_dir']+'/index.html', 'w', encoding='utf-8') as fh:
            fh.write(html)
        bundle_url_path = url_path_join(self.application.settings['base_url'],
            'files',
            'local_dashboards',
            escape.url_escape(md['bundle_id'], False),
            'index.html'
        )
        self.redirect(bundle_url_path)

def load_jupyter_server_extension(nb_app):
    '''
    Adds a handler for bundle creation. Adds a static file handler to serve
    assets that are pulled separately from the bundle creation request.

    :param nb_app: instance of IPython.html.NotebookApp
    '''
    web_app = nb_app.web_app
    host_pattern = '.*$'
    handler_url = url_path_join(web_app.settings['base_url'], '/bundle')
    bundle_tmp_path = os.path.join(tempfile.gettempdir(), 'bundle')
    web_app.add_handlers(host_pattern, [
        (handler_url, NewBundleHandler, {
            'nb_dir': nb_app.notebook_dir,
            'tmp_dir' : bundle_tmp_path,
        }),
        (handler_url+'/(.*)', git_handler.GitSmartHTTPHandler, {
            'bundle_path' : bundle_tmp_path
        })
    ])
