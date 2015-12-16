# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import os
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
SERVER_EXT_CONFIG = "c.NotebookApp.server_extensions.append('urth.dashboard.nbexts')"

class InstallCommand(install):
    def run(self):
        print('Installing Python module')
        install.run(self)
        
        print('Installing notebook extension')
        install_nbextension(EXT_DIR, overwrite=True, user=True)
        cm = ConfigManager()
        print('Enabling extension for notebook')
        cm.update('notebook', {"load_extensions": {'urth_dash_js/notebook/main': True}})

        print('Installing notebook server extension')
        fn = os.path.join(jupyter_config_dir(), 'jupyter_notebook_config.py')

        if os.path.isfile(fn):
            with open(fn, 'r+') as fh:
                lines = fh.read()
                if SERVER_EXT_CONFIG not in lines:
                    fh.seek(0, 2)
                    fh.write('\n')
                    fh.write(SERVER_EXT_CONFIG)
        else:
            with open(fn, 'w') as fh:
                fh.write('c = get_config()\n')
                fh.write(SERVER_EXT_CONFIG)

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