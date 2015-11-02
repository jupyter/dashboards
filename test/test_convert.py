# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import unittest
import shutil
import os
import tempfile
from zipfile import ZipFile
import urth.dashboard.converter
from jupyter_core.paths import jupyter_data_dir

TEST_URL = 'http://jupyter.example.com:8888/'
URTH_WIDGETS_DIR = os.path.join(jupyter_data_dir(), 'nbextensions/urth_widgets/')
URTH_WIDGETS_JS_DIR = os.path.join(URTH_WIDGETS_DIR, 'js')
URTH_VIZ_DIR = os.path.join(URTH_WIDGETS_DIR, 'components/urth-viz')
URTH_CORE_DIR = os.path.join(URTH_WIDGETS_DIR, 'components/urth-core')
BOWER_COMPONENT_DIR = os.path.join(jupyter_data_dir(), 'nbextensions/urth_widgets/bower_components/component-a')

class TestConverter(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        os.makedirs(URTH_WIDGETS_JS_DIR)
        os.makedirs(URTH_CORE_DIR)
        os.makedirs(URTH_VIZ_DIR)
        os.makedirs(BOWER_COMPONENT_DIR)
        def fake_bower(a,b):
            os.makedirs(b)
        urth.dashboard.converter.install_notebook_components = fake_bower


    def test_to_php_app(self):
        self.assertTrue(urth.dashboard.converter.to_php_app)
        app_location = urth.dashboard.converter.to_php_app('test/resources/env.ipynb')
        self.assertTrue(os.path.exists(os.path.join(app_location, 'index.php')), 'expected main output file is missing')
        with open(os.path.join(app_location, 'index.php')) as f:
            contents = f.read()
            self.assertTrue('DOCTYPE' in contents)
            self.assertTrue('data-main="./static/main.js' in contents)

    def test_to_php_app_zip(self):
        self.assertTrue(urth.dashboard.converter.to_php_app)
        self.assertTrue(urth.dashboard.converter.to_zip)
        app_location = urth.dashboard.converter.to_php_app('test/resources/env.ipynb')
        self.assertTrue(os.path.exists(os.path.join(app_location, 'index.php')), 'expected main output file is missing')
        with open(os.path.join(app_location, 'index.php')) as f:
            contents = f.read()
            self.assertTrue('DOCTYPE' in contents)
            self.assertTrue('data-main="./static/main.js' in contents)
        _, zipfile_path = tempfile.mkstemp(suffix='.zip')
        urth.dashboard.converter.to_zip(zipfile_path, app_location)
        with ZipFile(zipfile_path + '.zip') as testzip:
            namelist = testzip.namelist()
            self.assertTrue('index.php' in namelist)
            self.assertTrue('data-main="./static/main.js"' in contents)

    def test_to_php_app_temp(self):
        self.assertTrue(urth.dashboard.converter.to_php_app)
        location = tempfile.mkdtemp()
        app_location = urth.dashboard.converter.to_php_app('test/resources/env.ipynb', location)
        self.assertEqual(location, app_location)
        self.assertTrue(os.path.exists(os.path.join(app_location, 'index.php')))
        with open(os.path.join(app_location, 'index.php')) as f:
            contents = f.read()
            self.assertTrue('DOCTYPE' in contents)
            self.assertTrue('data-main="./static/main.js"' in contents)

    def test_to_git_repo(self):
        self.assertTrue(urth.dashboard.converter.to_git_repository)
        location = tempfile.mkdtemp()
        with open(os.path.join(location, 'README'), 'w') as fh:
            fh.write('test')
        urth.dashboard.converter.to_php_app('test/resources/env.ipynb', location)
        app_location = urth.dashboard.converter.to_git_repository(location)
        self.assertTrue(os.path.exists(os.path.join(app_location, 'static')), 'expected static folder is missing')
        self.assertTrue(os.path.exists(os.path.join(app_location, 'README')), 'expected README is missing')
        self.assertTrue(os.path.exists(os.path.join(app_location, '.git/objects/pack')), 'expected git metadata is missing')

    def test_add_cf_manifest(self):
        self.assertTrue(urth.dashboard.converter.add_cf_manifest)
        app_location = urth.dashboard.converter.to_php_app('test/resources/env.ipynb')
        urth.dashboard.converter.add_cf_manifest(app_location, TEST_URL, 'fake_name', 'true')
        self.assertTrue(os.path.exists(os.path.join(app_location, 'manifest.yml')), 'expected manifest is missing')
        with open(os.path.join(app_location, 'manifest.yml')) as f:
            contents = f.read()
        self.assertTrue(TEST_URL in contents)
        self.assertTrue('fake_name' in contents)
        self.assertTrue('\n  memory: ' in contents)
        self.assertIn('TMPNB_MODE: true', contents)

    def test_add_dockerfile(self):
        self.assertTrue(urth.dashboard.converter.add_dockerfile)
        app_location = urth.dashboard.converter.to_php_app('test/resources/env.ipynb')
        urth.dashboard.converter.add_dockerfile(app_location, TEST_URL, 'false')
        self.assertTrue(os.path.exists(os.path.join(app_location, 'Dockerfile')), 'expected manifest is missing')
        with open(os.path.join(app_location, 'Dockerfile')) as f:
            contents = f.read()
        self.assertTrue(TEST_URL in contents)
        self.assertTrue('FROM php' in contents)
        self.assertIn('ENV TMPNB_MODE false', contents)

    def test_add_urth_widgets(self):
        self.assertTrue(urth.dashboard.converter.add_urth_widgets)
        location = tempfile.mkdtemp()
        urth.dashboard.converter.add_urth_widgets(location, 'test/resources/env.ipynb')
        self.assertTrue(os.path.exists(os.path.join(location, 'static/urth_widgets')), 'urth widgets folder does not exist')
        self.assertTrue(os.path.exists(os.path.join(location, 'static/urth_components')), 'bower components were not moved')
        # Testing to make sure we do not add bower components if we do not need to
        location = tempfile.mkdtemp()
        urth.dashboard.converter.add_urth_widgets(location, 'test/resources/no_imports.ipynb')
        self.assertFalse(os.path.exists(os.path.join(location, 'static/urth_widgets')), 'urth widgets folder exists when it should not')
        self.assertFalse(os.path.exists(os.path.join(location, 'static/urth_components')), 'bower components were moved')

    def test_get_cell_references_comment(self):
        self.assertTrue(urth.dashboard.converter._get_references)
        no_references = urth.dashboard.converter._get_references({'source':'!ls', 'cell_type':'code'})
        self.assertTrue(no_references is None)

    def test_get_cell_references_comment_multiline(self):
        cell = {'cell_type':'markdown', 'source':'<!--associate:\na\nb/\n#comment\n-->'}
        references = urth.dashboard.converter._get_references(cell)
        self.assertTrue('a' in references and 'b/' in references, str(references))
        self.assertEqual(len(references), 3, str(references))

    def test_get_cell_references_comment_trailing_filename(self):
        cell = {'cell_type':'markdown', 'source':'<!--associate:c\na\nb/\n#comment\n-->'}
        references = urth.dashboard.converter._get_references(cell)
        self.assertTrue('a' in references and 'b/' in references and 'c' in references, str(references))
        self.assertEqual(len(references), 3, str(references))

    def test_get_cell_references_precode(self):
        self.assertTrue(urth.dashboard.converter._get_references)
        no_references = urth.dashboard.converter._get_references({'source':'!ls', 'cell_type':'code'})
        self.assertTrue(no_references is None)

    def test_get_cell_references_precode_mdcomment(self):
        cell = {'cell_type':'markdown', 'source':'```\na\nb/\n#comment\n```'}
        references = urth.dashboard.converter._get_references(cell)
        self.assertTrue('a' in references and 'b/' in references, str(references))
        self.assertEqual(len(references), 3, str(references))

    def test_get_cell_references_precode_backticks(self):
        cell = {'cell_type':'markdown', 'source':'```c\na\nb/\n#comment\n```'}
        references = urth.dashboard.converter._get_references(cell)
        self.assertTrue('a' in references and 'b/' in references and 'c' in references, str(references))
        self.assertEqual(len(references), 3, str(references))

    def test_glob_dir(self):
        self.assertTrue('resources/env.ipynb' in urth.dashboard.converter._glob(os.path.join(os.getcwd(), 'test'), ['resources/env.ipynb']))

    def test_glob_subdir(self):
        self.assertTrue('resources/env.ipynb' in urth.dashboard.converter._glob(os.path.join(os.getcwd(), 'test'), ['resources/']))

    def test_glob_splat(self):
        globs = urth.dashboard.converter._glob(os.getcwd(), ['*'])
        self.assertTrue('AUTHORS' in globs, globs)

    def test_glob_splatsplat_in_middle(self):
        globs = urth.dashboard.converter._glob(os.path.join(os.getcwd(), 'urth_dash_js'), ['notebook/**/dashboard.js'])
        self.assertTrue('notebook/dashboard-view/dashboard.js' in globs, globs)

    def test_glob_splatsplat_trailing(self):
        globs = urth.dashboard.converter._glob(os.path.join(os.getcwd(), 'urth_dash_js'), ['notebook/**'])
        self.assertTrue('notebook/dashboard-view/dashboard.js' in globs, globs)

    def test_glob_splatsplat_leading(self):
        globs = urth.dashboard.converter._glob(os.path.join(os.getcwd(), 'urth_dash_js'), ['**/dashboard.js'])
        self.assertTrue('notebook/dashboard-view/dashboard.js' in globs, globs)

    def test_cell_uses_widgets(self):
        self.assertTrue(urth.dashboard.converter.cell_uses_widgets)
        self.assertTrue(urth.dashboard.converter.cell_uses_widgets('<urth-core-import>'), 'urth-core-import was not found when it should have been')
        self.assertTrue(urth.dashboard.converter.cell_uses_widgets('<link is="urth-core-import">'), 'urth-core-import was not found when it should have been')
        self.assertFalse(urth.dashboard.converter.cell_uses_widgets('<link>'), 'urth-core-import was found when it should not have been')
