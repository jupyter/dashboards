# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import os
import shutil
import subprocess
import time
import re
import os.path
import glob
from tempfile import mkdtemp
from IPython.utils.path import get_ipython_dir
import IPython.nbformat as nbformat

# Absolute path to nbconvert templates
TEMPLATES_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'jinja_templates'))
# Absolute path for dashboard static resources
STATICS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static'))
# Template for manifest.yml
MANIFEST_TMPL = '''---
applications:
- name: {notebook_basename}
  memory: 128M
  env:
    KERNEL_SERVICE_URL: {kernel_server_url}
    TMPNB_MODE: {tmpnb_mode}
'''
DOCKERFILE_TMPL = '''FROM php:5.6-apache
ENV KERNEL_SERVICE_URL {kernel_server_url}
ENV TMPNB_MODE {tmpnb_mode}
COPY . /var/www/html/
'''

def to_php_app(notebook_fn, app_location=None, template_fn=None):
    '''
    Converts a notebook into a PHP Thebe application that will contact the
    Jupyter kernel server given in the KERNEL_SERVICE_URL environment variable
    to execute code.

    :param notebook_fn:
    :param app_location:
    :returns:
    '''
    # Invoke nbconvert to get the HTML
    full_output = to_thebe_html(notebook_fn, {}, 'html', os.getcwd(), template_fn)

    # Get a reasonable human readable name for the app
    notebook_basename = os.path.basename(notebook_fn)
    notebook_basename = os.path.splitext(notebook_basename)[0]

    notebook_dash = 'index.php'
    if app_location:
        output_path = app_location
    else:
        output_path = mkdtemp()

    # Write out the index.php file
    with open(os.path.join(output_path, notebook_dash), 'wb') as f:
        f.write(full_output)
    # Copy deployment readme
    shutil.copyfile(os.path.abspath(os.path.join(os.path.dirname(__file__), 'deploy/README.md')), os.path.join(output_path, 'README.md'))
    # Copy static assets for Thebe
    shutil.copytree(STATICS_PATH, os.path.join(output_path, 'static'))
    # Copy static assets for dashboard layout
    deps = os.path.join(get_ipython_dir(), 'nbextensions/urth_dash_js/notebook')
    components = [
        'bower_components/gridstack/dist/gridstack.min.css',
        'bower_components/gridstack/dist/gridstack.min.js',
        'bower_components/gridstack/dist/gridstack.min.map',
        'bower_components/jquery/dist/jquery.min.js',
        'bower_components/jquery/dist/jquery.min.map',
        'bower_components/jquery-ui/themes/smoothness/jquery-ui.min.css',
        'bower_components/lodash/lodash.min.js',
        'bower_components/requirejs/require.js'
    ]
    component_dirs = [
        'dashboard-common',
        'bower_components/jquery-ui/themes/smoothness/images'
    ]

    if os.path.isdir(deps):
        dest_components = os.path.join(output_path, 'static')
        for component in components:
            dest_file = os.path.join(dest_components, component)
            dest_dir = os.path.dirname(dest_file)
            if not os.path.exists(dest_dir):
                os.makedirs(dest_dir)
            shutil.copy(os.path.join(deps, component), dest_file)
        for comp_dir in component_dirs:
            shutil.copytree(os.path.join(deps, comp_dir), os.path.join(dest_components, comp_dir))

    add_urth_widgets(output_path, notebook_fn)

    return output_path

def to_git_repository(path):
    '''
    Turns the given path into a bare git repository.

    :param path:
    :returns:
    '''
    subprocess.check_call(['git', 'init', path])

    subprocess.check_call(['git', 'config', 'user.email', 'user@localhost'],
        cwd=path)
    subprocess.check_call(['git', 'config', 'user.name', 'user'], cwd=path)

    subprocess.check_call(['git', 'add', '.'], cwd=path)
    subprocess.check_call(['git', 'commit', '-m', 'initial deployment'],
        cwd=path)
    subprocess.check_call(['git', 'update-server-info'], cwd=path)

    return path

def to_zip(zipfile_path, path):
    '''
    Zips path into zipfile_path.

    :returns:
    '''
    shutil.make_archive(zipfile_path, "zip", path)

    return zipfile_path

def add_dockerfile(output_path, kernel_server_url, tmpnb_mode):
    '''
    Writes a Dockerfile to the output path with an environment variable
    pointing to the given Jupyter kernel server URL.

    :param output_path:
    :param kernel_server_url:
    :param tmpnb_mode:
    '''
    with open(os.path.join(output_path, 'Dockerfile'), 'w') as f:
        f.write(DOCKERFILE_TMPL.format(
            kernel_server_url=kernel_server_url,
            tmpnb_mode=tmpnb_mode
        ))

def add_cf_manifest(output_path, kernel_server_url, app_name, tmpnb_mode):
    '''
    Writes a Cloud Foundry manifest to the output path with an environment
    variable pointing to the given Jupyter kernel server URL and a default name of the
    app.

    :param output_path:
    :param kernel_server_url:
    :param app_name:
    :param tmpnb_mode:
    '''
    with open(os.path.join(output_path, 'manifest.yml'), 'w') as f:
        f.write(MANIFEST_TMPL.format(
            notebook_basename=app_name,
            kernel_server_url=kernel_server_url,
            tmpnb_mode=tmpnb_mode
        ))

def add_urth_widgets(output_path, notebook_file):
    '''
    Adds fronted bower components dependencies into the bundle for the dashboard
    application. Creates the following directories under output_path:

    static/urth_widgets: Stores the js for urth_widgets which will be loaded in
                         the frontend of the dashboard
    static/urth_components: The directory for all of the bower components of the
                            dashboard.

    NOTE: This function is too specific to urth widgets. In the
        future we should investigate ways to make this more generic.

    :param output_path: The output path of the dashboard being assembled
    :param notebook_file: The absolute path to the notebook file being packaged
    '''
    ipython_dir = get_ipython_dir()
    # Root of urth widgets within Jupyter
    urth_widgets_dir = os.path.join(ipython_dir, 'nbextensions/urth_widgets')
    # JavaScript entry point for widgets in Jupyter
    urth_widgets_js_dir = os.path.join(urth_widgets_dir, 'js')
    if not os.path.isdir(urth_widgets_dir):
        # urth widgets not installed so skip
        return

    # Root of urth widgets within a dashboard app
    output_urth_widgets_dir = os.path.join(output_path, 'static/urth_widgets/')
    # JavaScript entry point for widgets in dashboard app
    output_js_dir = os.path.join(output_urth_widgets_dir, 'js')
    # Web referenceable path from which all urth widget components will be served
    output_urth_components_dir = os.path.join(output_path, 'static/urth_components/')

    # Copy urth widgets js and installed bower components into the app under
    # static/urth_widgets
    shutil.copytree(urth_widgets_js_dir, output_js_dir)

    # Read the notebook's contents and get the required components
    notebook_components = get_notebook_components(notebook_file)

    # Add the components for urth widgets to the list of widgets to be installed
    urth_widgets = get_urth_widgets(urth_widgets_dir)

    # Combine the urth widget's components and the notebook's components for a
    # complete list of what needs to be installed
    all_components = notebook_components + urth_widgets

    # Install the bower componentsin the urth
    install_notebook_components(all_components, output_urth_components_dir)

def get_urth_widgets(urth_widgets_dir):
    '''
    Builds a list of the directories where the urth widgets' bower components are
    located on the filesystem.
    NOTE: This is very specific to urth widgets and should be refactored to
          generically load dependencies of a notebook.

    :param urth_widgets_dir: The directory where the urth widgets extension is
        installed on the filesystem.
    '''
    urth_widgets_components = []
    for urth_dir in glob.glob(os.path.join(urth_widgets_dir, 'bower_components/urth-*')):
        urth_widgets_components.append(urth_dir)
    return urth_widgets_components

def get_cell_components(cell_source):
    '''
    Finds any link html tags within the cell source. If these tags have
    a package attribute those values will be returned.

    :param cell_source: The source code within a notebook cell
    '''
    link_regex = '<link([^>]*)>'
    package_regex = 'package\s*=\s*[\'"]([^\'"]*)[\'"]'
    link_matches = re.findall(link_regex, cell_source)
    link_attributes = ' '.join(link_matches)
    all_components = re.findall(package_regex, link_attributes)
    return all_components

def get_notebook_components(notebook_file):
    '''
    Builds a list of bower components found within the notebook.

    :param notebook_file: The absolute path to the notebook file to read.
    '''
    # with open(notebook_file) as notebook:
    #     notebook_text = notebook.read()
    #     notebook.close()

    notebook = nbformat.read(notebook_file, 4)

    all_components = []
    # Ensure no error cells first
    for cell in notebook.cells:
        all_components = all_components + get_cell_components(cell.get('source'))

    return all_components


def install_notebook_components(components, components_dir):
    '''
    Installs a list of bower components into a specified directory by calling
    bower install.

    :param components: The components to be installed
    :param components_dir: The directory to install the components.
    '''
    #   NOTE: Ideally we would just want to do a bower install in the directory
    #         we wish to install the components in, but running the command
    #         will create a bower_components under that directory. So we
    #         currently install to a tmp dir and move the bower_components folder
    #         to be the install folder we want.
    tmp_install_dir = mkdtemp()
    subprocess.check_call(['bower', 'install'] + components + ['--allow-root', '--config.interactive=false'], cwd=tmp_install_dir)
    shutil.move(os.path.join(tmp_install_dir,'bower_components'), components_dir)

def to_thebe_html(path, env_vars, fmt, cwd, template_fn):
    '''
    Converts a notebook at path with env vars and current working directory set.
    If the conversion subprocess emits anything on its stderr, raises
    RuntimeError. Otherwise, returns the notebook in the requested format:
    html or notebook (JSON).
    '''
    if env_vars is None:
        env_vars = {}
    env_vars['PATH'] = os.environ['PATH']

    proc = subprocess.Popen([
            'ipython',
            'nbconvert',
            '--quiet',
            '--stdout',
            '--TemplateExporter.template_path=["{}"]'.format(TEMPLATES_PATH),
            '--template',
            template_fn if template_fn is not None and os.path.isfile(os.path.join(TEMPLATES_PATH, template_fn)) else 'thebe.tpl',
            '--to',
            fmt,
            path
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=cwd,
        env=env_vars
    )
    stdout, stderr = proc.communicate()
    if stderr:
        raise RuntimeError('nbconvert wrote to stderr: {}'.format(stderr))
    return stdout
