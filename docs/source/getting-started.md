# Getting started

This document describes some of the basics of installing and enabling the dashboards layout extension.

## Prerequisites

* Jupyter Notebook 4.2.x, 4.1.x, or 4.0.x running on Python 3.x or Python 2.7.x
* Edge, Chrome, Firefox, or Safari

## Installing and Enabling 

### On Jupyter Notebook 4.2

The following steps install the extension package using `pip` and enable the extension in the active Python environment.

```bash
pip install jupyter_dashboards
jupyter dashboards quick-setup --sys-prefix
```

Run `jupyter dashboards quick-setup --help` for other options. Note that the second command is a shortcut for the following:

```bash
jupyter nbextension install --py jupyter_dashboards --sys-prefix
jupyter nbextension enable --py jupyter_dashboards --sys-prefix
```

### On Jupyter Notebook 4.0, 4.1

Earlier versions of Jupyter Notebook do not support configuration of extensions in the active Python environment. The following steps install the extension package using `pip` and enable the extension in current operating system user profile (`~/.jupyter`).

```bash
pip install jupyter_dashboards
jupyter dashboards install --user --symlink --overwrite
jupyter dashboards activate
```

Run `jupyter dashboards install --help` for other options.

## Disabling and Uninstalling

### On Jupyter Notebook 4.2

The following steps deactivate the extension in the active Python environment and uninstall the package using `pip`.

```bash
jupyter dashboards quick-remove --sys-prefix
pip uninstall jupyter_dashboards
```

Note that the first command is a shortcut for the following:

```bash
jupyter nbextension disable --py jupyter_dashboards --sys-prefix
jupyter nbextension uninstall --py jupyter_dashboards --sys-prefix
```

### On Jupyter Notebook 4.0, 4.1

The following steps deactivate the extension in the current user profile and uninstall the package using `pip`.

```bash
jupyter dashboards deactivate
pip uninstall jupyter_dashboards
```

### For dashboards 0.4 and earlier

In addition to the steps listed for Jupyter Notebook 4.0, 4.1, you may need to remove this line from your `jupyter_notebook_config.py` file:

```python
# [YOUR_JUPYTER_CONFIG_PATH]/jupyter_notebook_config.py
c.NotebookApp.server_extensions.append('urth.dashboard.nbexts')
```

Note that there is no command to remove extension assets from the user profile in this version of Jupyter Notebook.
