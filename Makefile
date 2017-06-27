# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

.PHONY: activate build clean docs env help notebook nuke release sdist test

SA:=source activate
ENV:=dashboards
SHELL:=/bin/bash

help:
# http://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

activate: ## eval $(make activate)
	@echo "$(SA) $(ENV)"

clean: ## Make a clean source tree
	@-rm -rf dist
	@-rm -rf *.egg-info
	@-rm -rf __pycache__ */__pycache__ */*/__pycache__
	@-find . -name '*.pyc' -exec rm -fv {} \;
	@-rm -rf node_modules
	@-rm -rf ./jupyter_dashboards/nbextension/notebook/bower_components

docs: ## Make HTML documentation
	$(SA) $(ENV) && make -C docs html

build: env
env: ## Make a dev environment
	conda create -y -n $(ENV) -c conda-forge python=3 \
		--file requirements.txt \
		--file requirements-test.txt
	$(SA) $(ENV) && \
		pip install -r requirements-doc.txt -r requirements-demo.txt && \
		npm install && \
		npm run bower && \
		pip install -e . && \
		jupyter dashboards quick-setup --sys-prefix && \
		jupyter nbextension enable --py widgetsnbextension --sys-prefix
		#jupyter declarativewidgets quick-setup --sys-prefix

js: ## Make JavaScript assets
	npm install
	npm run bower
	$(SA) $(ENV) && \
		pip install -e . && \
		jupyter dashboards quick-setup --sys-prefix

notebook: ## Make a notebook server
	$(SA) $(ENV) && jupyter notebook --notebook-dir=./etc/notebooks

nuke: clean ## Make clean + remove conda env
	-conda env remove -n $(ENV) -y

release: js ## Make a release on PyPI
	$(SA) $(ENV) && python setup.py sdist register upload

sdist: js ## Make a dist/*.tar.gz source distribution
	$(SA) $(ENV) && python setup.py sdist

test: ## Make a local test run
	@./system-test/bin/run-system-test.sh

test-saucelabs:
	@TEST_SERVER=ondemand.saucelabs.com TEST_TYPE=remote ./system-test/bin/run-system-test.sh

