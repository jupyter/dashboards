[![PyPI version](https://badge.fury.io/py/jupyter_dashboards.svg)](https://badge.fury.io/py/jupyter_dashboards) [![Build Status](https://travis-ci.org/jupyter-incubator/dashboards.svg?branch=master)](https://travis-ci.org/jupyter-incubator/dashboards) [![Google Group](https://img.shields.io/badge/-Google%20Group-lightgrey.svg)](https://groups.google.com/forum/#!forum/jupyter)

# Jupyter Dynamic Dashboards from Notebooks

Extensions for Jupyter Notebook to enable the layout and deployment of dashboards from notebooks.

## What It Gives You

Watch from minute 41 to 51 of the [September 1st Jupyter meeting video recording](https://www.youtube.com/watch?v=SJiezXPhVv8).

* Dashboard layout mode for arranging notebook cell outputs in a grid-like fashion
* Dashboard view mode for interacting with an assembled dashboard within the Jupyter Notebook
* Ability to share notebooks with dashboard layout metadata in them with other Jupyter Notebook users
* Ability to nbconvert a notebook to a separate dashboard web application

## What It Lacks

* Robust story for independent dashboard deployment (see below)
* More formal user docs / tutorials

## Prerequisites

* Jupyter Notebook 4.0.x running on Python 3.x or Python 2.7.x
* Edge, Chrome, Firefox, or Safari

Note: If you're running IPython Notebook 3.2.x, you can install the older 0.1.x version of the extension.

## Try It

If you want to try the dashboard extension and demos without installing it yourself, visit the [jupyter-incubator/showcase binder](http://mybinder.org/repo/jupyter-incubator/showcase). If the binder site is full, try the tmpnb instance at [http://jupyter.cloudet.xyz](http://jupyter.cloudet.xyz).

## Install It

`pip install jupyter_dashboards` and then restart your Notebook server if it was running during the install.

## Develop It

This repository is setup for a Dockerized development environment. On a Mac, do this one-time setup if you don't have a local Docker environment yet.

```
brew update

# make sure we have node and npm for frontend preprocessing
brew install npm node

# make sure you're on Docker >= 1.7
brew install docker-machine docker
docker-machine create -d virtualbox dev
eval "$(docker-machine env dev)"
```

Clone this repository in a local directory that docker can volume mount:

```
# make a directory under ~ to put source
mkdir -p ~/projects
cd !$

# clone this repo
git clone https://github.com/jupyter-incubator/dashboards.git
```

Pull a base Docker image and build a subimage from it that includes bower both as a dashboard dev dependency and as a prereq for example notebooks that use declarative widgets.

```
cd dashboards
make build
```

Run the notebook server in a docker container:

```
# run notebook server in container
make dev
```

The final `make` command starts a local Docker container with the critical pieces of the source tree mounted where they need to be to get picked up by the notebook server in the container. Most code changes on your Mac will have immediate effect within the container.

To see the Jupyter instance with extensions working:

1. Run `docker-machine ls` and note the IP of the dev machine.
2. Visit http://THAT_IP:9500 in your browser

See the Makefile for other dev, test, build commands as well as options for each command.

### Develop with Declarative Widgets

If you want [declarative widgets](https://github.com/jupyter-incubator/declarativewidgets) available in you development environment, do the following:

```
# On your host, clone the widgets project as a peer of the dashboards folder
git clone https://github.com/jupyter-incubator/declarativewidgets.git

# Build the widgets into a source tarballs
cd declarativewidgets
make sdist

# Run a container that has both
cd ../dashboards
make dev-with-widgets
```

To see the Jupyter instance with both extensions working:

1. Run `docker-machine ls` and note the IP of the dev machine.
2. Visit http://THAT_IP:9500 in your browser

### Develop Against Python 2.7

You can run a development environment against python 2.7 by adding an environment variable to your make calls.

```
# Run a development environment against 2.7
PYTHON=python2 make dev
# Run a development environment, with declarative widgets, against 2.7
PYTHON=python2 make dev-with-widgets
# Run unit tests against 2.7
PYTHON=python2 make test
```

## Package

The dashboard features are implemented as a Jupyter Notebook extension against the stock 4.0.x version of the notebook project, not a fork. With the dev setup above, if you run `make sdist` you should get a source tarball in the `dist/` directory of your clone. You should be able to install that tarball using `pip` anywhere you please with one caveat: the `setup.py` assumes you are installing to profile_default. There's no easy way to determine that you want to install against a different user at `pip install` time.

## Deploy

It's within the scope of this incubator project to allow users to both:

1. Dashboard layouts within notebooks, persist the layout metadata within the notebook JSON, and share those dashboard-notebooks with other Jupyter users, and
2. Convert and deploy dashboard-notebooks as standalone web applications.

At the moment, the second point is still very much a proof of concept. It currently relies on [thebe](https://github.com/oreillymedia/thebe) as a client for talking to a remote kernel, [tmpnb](https://github.com/jupyter/tmpnb) for provisioning remote kernels, and proper configuration of the kernel environment so that dashboard-launched kernels have access to the same data, libraries, etc. as the notebook authoring environment. Security is practically non-existent, scalability is limited, and compatibility is fixed with an older version of Jupyter.

None of these are inherent flaws. Dashboards are simply a new use case that pushes the Jupyter dependencies beyond their current limits. It's wonderful, in fact, that we are able to show dashboard deployment using what exists in open source today.

Here is our near-term roadmap for improving the deployment options:

* [Deployment Roadmap](https://github.com/jupyter-incubator/dashboards/wiki/Deployment-Roadmap)
* [Deployed Dashboard Threat Analysis](https://github.com/jupyter-incubator/dashboards/wiki/Deployed-Dashboard-Threat-Analysis) which the roadmap seeks to address

All this said, if you'd like to try external deployment today for your **non-production use case**, you can do one of two things.

First, you can click *File &rarr; Deploy As &rarr; Local Dashboard*. This will use the local Jupyter Notebook instance both as a static web server for the dashboard assets (via the `/files` endpoint) and as the kernel provisioner (via `/api/kernels`). Keep in mind, however, that kernels launched by Thebe are not tracked in the Notebook UI and cannot be cleaned up easily.

Alternatively, if you have a tmpnb instance running somewhere that spawns Notebook server containers with access to all the same libraries, extensions, and data as the notebook server you used to author the dashboard-notebook, you can click *File &rarr; Download As &rarr; Dashboard Bundle (.zip)*. Unzip the file your browser downloads and follow the README contained within to run a standalone web server for the dashboard frontend and configure it  with a pointer to your tmpnb deployment.

#### Deployment Caveats

It is important to realize that kernels launched by your deployed dashboard will not being running in the same directory or possibly even the same environment as your original notebook. You must refer to external, kernel-side resources in a portable manner (e.g., put it in an external data store, use absolute file paths if your only concern is *File &rarr; Deploy As &rarr; Local Dashboard*). You must also ensure your kernel environment has all the same libraries installed as your notebook authoring environment.

It is also your responsibility to associate any frontend, dashboard-side assets with your notebook before packaging it for deployment. See the [associations demo](etc/notebooks/associations_demo/associations-demo.ipynb) for one mechanism you can use.

If you are using [declarative widgets](https://github.com/jupyter-incubator/declarativewidgets) in your dashboard, you should be mindful of the following when you deploy your dashboard.

* You must run the entire notebook successfully before deploying. This action ensures all external Polymer components are properly installed on the notebook server and can be bundled with your converted notebook.
* You cannot use `<urth-core-import>` elements in custom Polymer widgets that you develop outside your notebook. See [issue #78](https://github.com/jupyter-incubator/dashboards/issues/78) for the discussion and current workaround.
