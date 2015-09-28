# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from . import bundle_handler

def load_jupyter_server_extension(nb_app):
    '''
    Loads all extensions within this package.
    '''
    nb_app.log.info('Loaded urth.dashboard.nbexts')
    bundle_handler.load_jupyter_server_extension(nb_app)
