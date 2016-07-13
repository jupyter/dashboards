# Developer tasks

This document includes instructions development environment for the dashboards layout extension. It also includes common steps in the developer workflow such as running tests, building docs, etc.

## Develop in Docker

Install [docker](https://docs.docker.com/engine/installation) on your system. Then clone this repository in a local directory that docker can volume mount:

```bash
# make a directory under ~ to put source
mkdir -p ~/projects
cd !$

# clone this repo
git clone https://github.com/jupyter-incubator/dashboards.git
```

Pull a base Docker image and build a subimage from it that includes `bower`, `nodejs`, and `npm` both as a dashboard dev dependency and as a prereq for example notebooks that use declarative widgets.

```bash
cd dashboards
make image
```

Install the necessary JS dependencies. Re-run this command any time your `bower.json` or `package.json` changes.

```bash
make js
```

Run the notebook server in a docker container.

```bash
# run notebook server in container
make dev
```

The final `make` command starts a local Docker container with the critical pieces of the source tree mounted where they need to be to get picked up by the notebook server in the container. Most code changes on your Mac will have immediate effect within the container.

To see the Jupyter instance with extensions working:

1. Run `docker-machine ls` and note the IP of the dev machine.
2. Visit http://THAT_IP:9500 in your browser

See the Makefile for other dev, test, build commands as well as options for each command.

## Develop with declarative widgets

If you want [declarative widgets](https://github.com/jupyter-incubator/declarativewidgets) available in you development environment, do the following:

```bash
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

## Develop against python 2.7

You can run a development environment against python 2.7 by adding an environment variable to your make calls.

```bash
# Run a development environment against 2.7
make dev-python2
# Run a development environment, with declarative widgets, against 2.7
make dev-with-widgets-python2
```

## Run Selenium tests

The project runs a small set of UI smoke tests using Selenium on Travis and Sauce Labs on every merge to the project master branch. You can run these tests locally if you install Selenium and then execute:

```bash
make system-test-local
```
