# Getting started

This document describes some of the basics of installing and enabling the
dashboards layout extension.

## Prerequisites

* Jupyter Notebook >=4.2 running on Python 3.x or Python 2.7.x
* Edge, Chrome, Firefox, or Safari

## Installing and Enabling

The following steps install the extension package using `pip` and enable the
extension in the active Python environment.

```bash
pip install jupyter_dashboards
jupyter dashboards quick-setup --sys-prefix
```

Run `jupyter dashboards quick-setup --help` for other options. Note that the
second command is a shortcut for the following:

```bash
jupyter nbextension install --py jupyter_dashboards --sys-prefix
jupyter nbextension enable --py jupyter_dashboards --sys-prefix
```

Alternatively, the following command both installs and enables the package
using `conda`.

```bash
conda install jupyter_dashboards -c conda-forge
```

## Disabling and Uninstalling

The following steps deactivate the extension in the active Python environment
and uninstall the package using `pip`.

```bash
jupyter dashboards quick-remove --sys-prefix
pip uninstall jupyter_dashboards
```

Note that the first command is a shortcut for the following:

```bash
jupyter nbextension disable --py jupyter_dashboards --sys-prefix
jupyter nbextension uninstall --py jupyter_dashboards --sys-prefix
```

The following command deactivates and uninstalls the package if it was 
installed using `conda`.

```bash
conda remove jupyter_dashboards
```

## Legacy Notes

If you installed the dashboard extension against Jupyter notebook 4.0 or 4.1,
you may need to manually remove this line from your
`jupyter_notebook_config.py` file when uninstalling or upgrading:

```python
# [YOUR_JUPYTER_CONFIG_PATH]/jupyter_notebook_config.py
c.NotebookApp.server_extensions.append('urth.dashboard.nbexts')
```
