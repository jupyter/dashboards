# Developer tasks

This document includes instructions development environment for the dashboards
layout extension. It also includes common steps in the developer workflow such
as running tests, building docs, etc.

Install [conda](https://conda.io/miniconda.html) on your system.
Then clone this repository in a local directory.

```bash
# make a directory under ~ to put source
mkdir -p ~/projects
cd !$

# clone this repo
git clone https://github.com/jupyter/dashboards.git
```

Create a conda environment with the necessary dev and test dependencies.

```bash
cd dashboards
make env
```

Install the necessary JS dependencies. Re-run this command any time your
`bower.json` or `package.json` changes.

```bash
make js
```

Run a notebook server with the dashboard extension enabled.

```bash
make notebook
```

Travis runs a small set of UI smoke tests using Selenium on Sauce Labs on every
merge to the git master branch. You can run these tests locally if you install
Selenium.

```bash
# install selenium first, e.g., on OSX
brew install selenium-server-standalone
# run the smoke tests
make test
```

ReadTheDocs builds the project documentation on every merge to git master.
You can build the documentation locally as well.

```bash
make docs
```

Run `make help` to get a full list of development tasks.
