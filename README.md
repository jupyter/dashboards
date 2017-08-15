# Jupyter Dashboards - Layout Extension

[![PyPI version](https://badge.fury.io/py/jupyter_dashboards.svg)](https://badge.fury.io/py/jupyter_dashboards) [![Build Status](https://travis-ci.org/jupyter/dashboards.svg?branch=master)](https://travis-ci.org/jupyter/dashboards) [![Google Group](https://img.shields.io/badge/-Google%20Group-lightgrey.svg)](https://groups.google.com/forum/#!forum/jupyter)

## Overview

The dashboards layout extension is an add-on for Jupyter Notebook. It lets you
arrange your notebook outputs (text, plots, widgets, ...) in grid- or
report-like layouts. It saves information about your layouts in your notebook
document. Other people with the extension can open your notebook and view your
layouts.

![Dashboard layout screenshot](docs/source/_static/dashboards_intro.png)

For a sample of what's possible with the dashboard layout extension, have a look at the [demo dashboard-notebooks](etc/notebooks) in this repository.

## Installation

Detailed installation instructions appear in the [Getting started
page](http://jupyter-dashboards-layout.readthedocs.io/en/latest/getting-started.html)
of the project docs. Here's a quickstart using pip or conda:

```bash
# install using pip from pypi and then activate the extension
pip install jupyter_dashboards
jupyter dashboards quick-setup --sys-prefix

# install using conda from conda-forge, no activation required
conda install jupyter_dashboards -c conda-forge
```

## Contributing

The [Development
page](http://jupyter-dashboards-layout.readthedocs.io/en/latest/development.html)
includes information about setting up a dev environment and typical dev tasks.
