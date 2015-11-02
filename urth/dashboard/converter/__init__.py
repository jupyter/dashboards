# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import os
import shutil
import subprocess
import time
import re
import os.path
import errno
import fnmatch
import glob
from tempfile import mkdtemp
from jupyter_core.paths import jupyter_data_dir
import nbformat

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

    :param notebook_fn: notebook file path
    :param app_location: output directory
    :param template_fn: template file name
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

    # Handle associated files
    referenced_files = get_referenced_files(notebook_fn, 4)
    copylist(os.path.dirname(notebook_fn), output_path, referenced_files)

    # Write out the index.php file
    with open(os.path.join(output_path, notebook_dash), 'wb') as f:
        f.write(full_output)
    # Copy deployment readme
    shutil.copyfile(os.path.abspath(os.path.join(os.path.dirname(__file__), 'deploy/README.md')), os.path.join(output_path, 'README.md'))
    # Copy static assets for Thebe
    shutil.copytree(STATICS_PATH, os.path.join(output_path, 'static'))
    # Copy static assets for dashboard layout
    deps = os.path.join(jupyter_data_dir(), 'nbextensions/urth_dash_js/notebook')
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

def cell_uses_widgets(cell_source):
    '''
    Looks for urth-core-import in the cell and returns True if it is found,
    False otherwise.
    '''
    # Using find instead of a regex to help future-proof changes that might be
    # to how user's will use urth-core-import
    # (i.e. <link is=urth-core-import> vs. <urth-core-import>)
    return False if cell_source.find('urth-core-import') == -1 else True

def add_urth_widgets(output_path, notebook_file):
    '''
    Adds frontend bower components dependencies into the bundle for the dashboard
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
    ipython_dir = jupyter_data_dir()
    # Root of urth widgets within Jupyter
    urth_widgets_dir = os.path.join(ipython_dir, 'nbextensions/urth_widgets')
    # JavaScript entry point for widgets in Jupyter
    urth_widgets_js_dir = os.path.join(urth_widgets_dir, 'js')
    if not os.path.isdir(urth_widgets_dir):
        # urth widgets not installed so skip
        return

    # Check if any of the cells contain widgets, if not we do not to copy the bower_components
    notebook = nbformat.read(notebook_file, 4)
    any_cells_with_widgets = any(cell_uses_widgets(cell.get('source')) for cell in notebook.cells)
    if not any_cells_with_widgets:
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

    # Install the bower components into the urth_components directory
    shutil.copytree(os.path.join(urth_widgets_dir, 'bower_components'), output_urth_components_dir)


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
            '--log-level',
            'ERROR',
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

def get_referenced_files(abs_nb_path, version):
    '''
    Retrieves the full list of files referenced by a notebook's
    markdown cell comments, as relative paths. Temporarily changes
    the current working directory when called.
    '''
    expanded = _expand_references(os.path.dirname(abs_nb_path), get_references(abs_nb_path, version))
    return expanded

def get_references(abs_nb_path, version):
    '''
    Retrieves the raw references to files, folders, and exclusions
    from a notebook's markdown cell comments.
    '''
    notebook = nbformat.read(abs_nb_path, version)
    referenced_list = []
    for cell in notebook.cells:
        references = _get_references(cell)
        if references:
            referenced_list = referenced_list + references
    return referenced_list

def _get_references(cell):
    '''
    Retrieves the list of references from a cell, according to
    an expected way of identifying and separating them.
    '''
    referenced = None
    # invisible after execution: unrendered HTML comment
    if cell.get('cell_type').startswith('markdown') and cell.get('source').startswith('<!--associate:'):
        referenced = []
        lines = cell.get('source')[len('<!--associate:'):].splitlines()
        for line in lines:
            if line.startswith('-->'):
                break
            # Trying to go out of the current directory leads to
            # trouble when deploying
            if line.find('../') < 0 and not line.startswith('#'):
                referenced.append(line)
    # visible after execution: rendered as a code element within a pre element
    elif cell.get('cell_type').startswith('markdown') and cell.get('source').find('```') >= 0:
        referenced = []
        source = cell.get('source')
        offset = source.find('```')
        lines = source[offset + len('```'):].splitlines()
        for line in lines:
            if line.startswith('```'):
                break
            # Trying to go out of the current directory leads to
            # trouble when deploying
            if line.find('../') < 0 and not line.startswith('#'):
                referenced.append(line)
    return referenced

def _expand_references(dirpath, references):
    referenced_files = []
    referenced_files = _glob(dirpath, references)
    return referenced_files

def _glob(dirpath, references):
    globbed = []
    negations = []
    must_walk = []
    for pattern in references:
        if pattern and pattern.find('/') < 0:
            # simple shell glob
            cwd = os.getcwd()
            os.chdir(dirpath)
            if pattern.startswith('!'):
                negations = negations + glob.glob(pattern[1:])
            else:
                globbed = globbed + glob.glob(pattern)
            os.chdir(cwd)
        elif pattern:
            must_walk.append(pattern)

    for pattern in must_walk:
        pattern_is_negation = pattern.startswith('!')
        if pattern_is_negation:
            testpattern = pattern[1:]
        else:
            testpattern = pattern
        for root, dirs, files in os.walk(dirpath):
            for file in files:
                joined = os.path.join(root[len(dirpath) + 1:], file)
                if testpattern.endswith('/'):
                    if joined.startswith(testpattern):
                        if pattern_is_negation:
                            negations.append(joined)
                        else:
                            globbed.append(joined)
                elif testpattern.find('**') >= 0:
                    # path wildcard
                    ends = testpattern.split('**')
                    if len(ends) == 2:
                        if joined.startswith(ends[0]) and joined.endswith(ends[1]):
                            if pattern_is_negation:
                                negations.append(joined)
                            else:
                                globbed.append(joined)
                else:
                    # segments should be respected
                    if fnmatch.fnmatch(joined, testpattern):
                        if pattern_is_negation:
                            negations.append(joined)
                        else:
                            globbed.append(joined)

    for negated in negations:
        try:
            globbed.remove(negated)
        except ValueError as err:
            pass
    return set(globbed)

def copylist(src, dst, filepath_list):
    '''
    Copies the filepath_list, relative to src, into dst.
    '''
    # copy them to their own tree, making dirs as needed
    for f in filepath_list:
        if os.path.isfile(os.path.join(src, f)):
            parent_relative = os.path.dirname(f)
            if parent_relative:
                parent_dst = os.path.join(dst, parent_relative)
                try:
                    os.makedirs(parent_dst)
                except OSError as exc:
                    if exc.errno == errno.EEXIST:
                        pass
                    else:
                        raise exc
            shutil.copy2(os.path.join(src, f), os.path.join(dst, f))
