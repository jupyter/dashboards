# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import os
import errno
from setuptools import setup
from setuptools.command.install import install

from notebook.nbextensions import install_nbextension
from notebook.services.config import ConfigManager
from jupyter_core.paths import jupyter_config_dir

# Get location of this file at runtime
HERE = os.path.abspath(os.path.dirname(__file__))

# Eval the version tuple and string from the source
VERSION_NS = {}
with open(os.path.join(HERE, 'urth/dashboard/_version.py')) as f:
    exec(f.read(), {}, VERSION_NS)

EXT_DIR = os.path.join(HERE, 'urth_dash_js')

def makedirs(path):
    '''
    mkdir -p and ignore existence errors compatible with Py2/3.
    '''
    try:
        os.makedirs(path)
    except OSError as e:
        if e.errno == errno.EEXIST and os.path.isdir(path):
            pass
        else:
            raise

class InstallCommand(install):
    def run(self):
        # Config managers for frontend and backend
        server_cm = ConfigManager(config_dir=jupyter_config_dir())
        js_cm = ConfigManager()

        # Ensure directories exist
        makedirs(server_cm.config_dir)
        makedirs(js_cm.config_dir)

        print('Installing Python server extension')
        install.run(self)

        print('Installing notebook JS extension')
        install_nbextension(EXT_DIR, overwrite=True, user=True)

        print('Enabling notebook JS extension')
        js_cm.update('notebook', {"load_extensions": {'urth_dash_js/notebook/main': True}})

        print('Enabling Python server extension')
        cfg = server_cm.get('jupyter_notebook_config')
        server_extensions = (
            cfg.setdefault('NotebookApp', {})
            .setdefault('server_extensions', [])
        )
        if 'urth.dashboard.nbexts' not in server_extensions:
            cfg['NotebookApp']['server_extensions'] += ['urth.dashboard.nbexts']
        server_cm.update('jupyter_notebook_config', cfg)

setup(
    name='jupyter_dashboards',
    author='Jupyter Development Team',
    author_email='jupyter@googlegroups.com',
    description='Extension for Jupyter Notebook 4.0.x for laying out, viewing, and deploying notebooks as dynamic dashboards',
    long_description = '''
    This package adds the following features to Jupyter Notebook:

* Dashboard layout mode for arranging notebook cell outputs in a grid-like fashion
* Dashboard view mode for interacting with an assembled dashboard within the Jupyter Notebook
* Ability to share notebooks with dashboard layout metadata in them with other Jupyter Notebook users
* Ability to nbconvert a notebook to a separate dashboard web application

See `the project README <https://github.com/jupyter-incubator/dashboards>`_
for more information. 
''',
    url='https://github.com/jupyter-incubator/dashboards',
    version=VERSION_NS['__version__'],
    license='BSD',
    platforms=['Jupyter Notebook 4.0.x'],
    packages=[
        'urth', 
        'urth.dashboard', 
        'urth.dashboard.nbexts',
        'urth.dashboard.converter'
    ],
    include_package_data=True,
    install_requires=[],
    cmdclass={
        'install': InstallCommand
    },
    classifiers=[
        'Intended Audience :: Developers',
        'Intended Audience :: System Administrators',
        'Intended Audience :: Science/Research',
        'License :: OSI Approved :: BSD License',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3.3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5'
    ]
)