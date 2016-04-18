# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

def _jupyter_nbextension_paths():
    '''API for JS extension installation on notebook 4.2'''
    return [{
        'section': 'notebook',
        'src': 'nbextension',
        'dest': 'jupyter_dashboards',
        'require': 'jupyter_dashboards/notebook/main'
    }]