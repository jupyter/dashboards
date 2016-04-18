# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import os.path
import sys

from ._version import __version__

from notebook.nbextensions import (InstallNBExtensionApp, EnableNBExtensionApp, 
    DisableNBExtensionApp, flags, aliases)
    
try:
    from notebook.nbextensions import BaseNBExtensionApp
    _new_extensions = True
except ImportError:
    BaseNBExtensionApp = object
    _new_extensions = False
    
from traitlets import Unicode
from traitlets.config.application import catch_config_error
from traitlets.config.application import Application

# Make copies to reuse flags and aliases
INSTALL_FLAGS = {}
INSTALL_FLAGS.update(flags)

INSTALL_ALIASES = {}
INSTALL_ALIASES.update(aliases)
del INSTALL_ALIASES['destination']

class ExtensionInstallApp(InstallNBExtensionApp):
    '''Subclass that installs this particular extension.'''
    name = u'jupyter-dashboards-extension-install'
    description = u'Install the jupyter_dashboards extension'

    flags = INSTALL_FLAGS
    aliases = INSTALL_ALIASES

    examples = """
        jupyter dashboards install
        jupyter dashboards install --user
        jupyter dashboards install --prefix=/path/to/prefix
        jupyter dashboards install --nbextensions=/path/to/nbextensions
    """

    destination = Unicode('')

    def _classes_default(self):
        return [ExtensionInstallApp, InstallNBExtensionApp]

    def start(self):
        here = os.path.abspath(os.path.join(os.path.dirname(__file__)))

        self.log.info("Installing jupyter_dashboards JS notebook extensions")
        self.extra_args = [os.path.join(here, 'nbextension')]
        self.destination = 'jupyter_dashboards'
        self.install_extensions()
        self.log.info('Done.')


class ExtensionActivateApp(EnableNBExtensionApp):
    '''Subclass that activates this particular extension.'''
    name = u'jupyter-dashboards-extension-activate'
    description = u'Activate the jupyter_dashboards extension'

    flags = {}
    aliases = {}

    examples = """
        jupyter dashboards activate
    """

    def _classes_default(self):
        return [ExtensionActivateApp, EnableNBExtensionApp]

    def start(self):
        self.log.info("Activating jupyter_dashboards JS notebook extensions")
        self.section = "notebook"
        self.enable_nbextension("jupyter_dashboards/notebook/main")
        self.log.info("Done.")

class ExtensionDeactivateApp(DisableNBExtensionApp):
    '''Subclass that deactivates this particular extension.'''
    name = u'jupyter-dashboards-extension-deactivate'
    description = u'Deactivate the jupyter_dashboards extension'

    flags = {}
    aliases = {}

    examples = """
        jupyter dashboards deactivate
    """

    def _classes_default(self):
        return [ExtensionDeactivateApp, DisableNBExtensionApp]

    def start(self):
        self.log.info("Deactivating jupyter_dashboards JS notebook extensions")
        self.section = "notebook"
        self.disable_nbextension("jupyter_dashboards/notebook/main")
        self.log.info("Done.")

class ExtensionQuickSetupApp(BaseNBExtensionApp):
    """Installs and enables all parts of this extension"""
    name = "jupyter dashboards quick-setup"
    version = __version__
    description = "Installs and enables all features of the jupyter_dashboards extension"

    def start(self):
        self.argv.extend(['--py', 'jupyter_dashboards'])
        
        from notebook import nbextensions
        install = nbextensions.InstallNBExtensionApp()
        install.initialize(self.argv)
        install.start()
        enable = nbextensions.EnableNBExtensionApp()
        enable.initialize(self.argv)
        enable.start()

class ExtensionQuickRemovalApp(BaseNBExtensionApp):
    """Disables and uninstalls all parts of this extension"""
    name = "jupyter dashboards quick-remove"
    version = __version__
    description = "Disables and removes all features of the jupyter_dashboards extension"

    def start(self):
        self.argv.extend(['--py', 'jupyter_dashboards'])

        from notebook import nbextensions
        enable = nbextensions.DisableNBExtensionApp()
        enable.initialize(self.argv)
        enable.start()
        install = nbextensions.UninstallNBExtensionApp()
        install.initialize(self.argv)
        install.start()

class ExtensionApp(Application):
    '''CLI for extension management.'''
    name = u'jupyter_dashboards extension'
    description = u'Utilities for managing the jupyter_dashboards extension'
    examples = ""

    subcommands = {}
    if _new_extensions:
        subcommands.update({
            "quick-setup": (
                ExtensionQuickSetupApp,
                "Install and enable everything in the package (notebook>=4.2)"
            ),
            "quick-remove": (
                ExtensionQuickRemovalApp,
                "Disable and uninstall everything in the package (notebook>=4.2)"
            )
        })
    else:
        subcommands.update(dict(
            install=(
                ExtensionInstallApp,
                "Install the extension."
            ),
            activate=(
                ExtensionActivateApp,
                "Activate the extension."
            ),
            deactivate=(
                ExtensionDeactivateApp,
                "Deactivate the extension."
            )
        ))

    def _classes_default(self):
        classes = super(ExtensionApp, self)._classes_default()

        # include all the apps that have configurable options
        for appname, (app, help) in self.subcommands.items():
            if len(app.class_traits(config=True)) > 0:
                classes.append(app)

    @catch_config_error
    def initialize(self, argv=None):
        super(ExtensionApp, self).initialize(argv)

    def start(self):
        # check: is there a subapp given?
        if self.subapp is None:
            self.print_help()
            sys.exit(1)

        # This starts subapps
        super(ExtensionApp, self).start()

def main():
    ExtensionApp.launch_instance()
