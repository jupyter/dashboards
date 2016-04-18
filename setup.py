# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import os
import sys
from setuptools import setup

# Get location of this file at runtime
HERE = os.path.abspath(os.path.dirname(__file__))

# Eval the version tuple and string from the source
VERSION_NS = {}
with open(os.path.join(HERE, 'jupyter_dashboards/_version.py')) as f:
    exec(f.read(), {}, VERSION_NS)

setup_args = dict(
    name='jupyter_dashboards',
    author='Jupyter Development Team',
    author_email='jupyter@googlegroups.com',
    description='Extension for Jupyter Notebook 4.0.x for laying out, viewing, and deploying notebooks as dynamic dashboards',
    long_description = '''
    This package adds the following features to Jupyter Notebook:

* Dashboard layout mode for arranging notebook cell outputs in a grid-like fashion
* Dashboard view mode for interacting with an assembled dashboard within the Jupyter Notebook
* Ability to share notebooks with dashboard layout metadata in them with other Jupyter Notebook users

See `the project README <https://github.com/jupyter-incubator/dashboards>`_
for more information.
''',
    url='https://github.com/jupyter-incubator/dashboards',
    version=VERSION_NS['__version__'],
    license='BSD',
    platforms=['Jupyter Notebook 4.0.x', 'Jupyter Notebook 4.1.x', 'Jupyter Notebook 4.2.x'],
    packages=[
        'jupyter_dashboards'
    ],
    include_package_data=True,
    scripts=[
        'scripts/jupyter-dashboards'
    ],
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

if 'setuptools' in sys.modules:
    # setupstools turns entrypoint scripts into executables on windows
    setup_args['entry_points'] = {
        'console_scripts': [
            'jupyter-dashboards = jupyter_dashboards.extensionapp:main'
        ]
    }
    # Don't bother installing the .py scripts if if we're using entrypoints
    setup_args.pop('scripts', None)

if __name__ == '__main__':
    setup(**setup_args)
