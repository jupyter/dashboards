# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

.PHONY: build clean configs dev dev-with-widgets help install js sdist system-test-local system-test-remote test 

PYTHON?=python3

REPO:=jupyter/pyspark-notebook:a388c4a66fd4
BOWER_REPO:=jupyter/pyspark-notebook-bower:a388c4a66fd4
PYTHON2_SETUP:=source activate python2;

help:
	@echo 'Host commands:'
	@echo '             build - builds a dev image with node/npm/bower for dev'
	@echo '             clean - clean built files'
	@echo '              demo - start notebook server with stable dashboard / widget extensions'
	@echo '               dev - start notebook server in a container with source mounted'
	@echo '  dev-with-widgets - like dev, but with stable declarativewidgets installed'
	@echo '           install - install latest sdist into a container'
	@echo '             sdist - build a source distribution into dist/'
	@echo '              test - run unit tests within a container'
	@echo ' system-test-local - run system tests locally'
	@echo 'system-test-remote - run system tests remotely on sauce labs, you must export SAUCE_USERNAME and SAUCE_ACCESS_KEY as environment variables'

build:
	@-docker rm -f bower-build
	@docker run -it --name bower-build \
		$(REPO) bash -c 'apt-get update && \
			apt-get install --yes npm && \
			ln -s /usr/bin/nodejs /usr/bin/node && \
			npm install -g bower && \
			apt-get clean'
	@docker commit bower-build $(BOWER_REPO)
	@-docker rm -f bower-build

configs:
# Make copies so that we don't volume mount git controlled files which will
# will get modified at runtime.
	@cp etc/jupyter_notebook_config.default.py etc/jupyter_notebook_config.py
	@cp etc/notebook.default.json etc/notebook.json

clean:
	@-rm etc/jupyter_notebook_config.py
	@-rm etc/notebook.json
	@-rm -rf dist
	@-rm -rf *.egg-info
	@-rm -rf etc/notebooks/local_dashboards
	@-rm -rf node_modules
	@-rm -rf urth_dash_js/notebook/bower_components
	@-find . -name __pycache__ -exec rm -fr {} \;

js:
	@docker run -it --rm \
		-v `pwd`:/src \
		$(BOWER_REPO) bash -c 'cd /src && npm install && npm run css && npm run bower'

dev: dev-$(PYTHON)

dev-python2: SETUP_CMD?=$(PYTHON2_SETUP)
dev-python2: EXTENSION_DIR=/opt/conda/envs/python2/lib/python2.7/site-packages/urth
dev-python2: _dev

dev-python3: EXTENSION_DIR=/opt/conda/lib/python3.4/site-packages/urth
dev-python3: _dev

_dev: NB_HOME?=/root
_dev: AUTORELOAD?=no
_dev: OPTIONS?=--rm -it
_dev: SERVER_NAME?=urth_dashboards_dev_server
_dev: CMD?=sh -c "python --version; jupyter notebook --no-browser --port 8888 --ip='*'"
_dev: configs js
# Need to use two commands here to allow for activation of multiple python versions
	@docker run $(OPTIONS) --name $(SERVER_NAME) \
		-p 9500:8888 \
		-e AUTORELOAD=$(AUTORELOAD) \
		-v `pwd`/urth_dash_js:$(NB_HOME)/.local/share/jupyter/nbextensions/urth_dash_js \
		-v `pwd`/urth:$(EXTENSION_DIR) \
		-v `pwd`/etc/jupyter_notebook_config.py:$(NB_HOME)/.jupyter/jupyter_notebook_config.py \
		-v `pwd`/etc/notebook.json:$(NB_HOME)/.jupyter/nbconfig/notebook.json \
		-v `pwd`/etc/notebooks:/home/jovyan/work \
		$(REPO) $(CMD)

dev-with-widgets: dev-with-widgets-$(PYTHON)

dev-with-widgets-python2: SETUP_CMD?=$(PYTHON2_SETUP)
dev-with-widgets-python2: EXTENSION_DIR=/opt/conda/envs/python2/lib/python2.7/site-packages/urth/dashboard
dev-with-widgets-python2: _dev-with-widgets

dev-with-widgets-python3: EXTENSION_DIR=/opt/conda/lib/python3.4/site-packages/urth/dashboard
dev-with-widgets-python3: _dev-with-widgets

_dev-with-widgets: NB_HOME?=/root
_dev-with-widgets: CMD?=sh -c "python --version; jupyter notebook --no-browser --port 8888 --ip='*'"
_dev-with-widgets: AUTORELOAD?=no
_dev-with-widgets: configs js
# We volume mount the config, so don't let the container corrupt the committed copy
# Need to use two commands here to allow for activation of multiple python versions
	@docker run -it --rm \
		-p 9500:8888 \
		-e USE_HTTP=1 \
		-e PASSWORD='' \
		-e AUTORELOAD=$(AUTORELOAD) \
		-v `pwd`/../declarativewidgets:/declarativewidgets \
		-v `pwd`/urth_dash_js:$(NB_HOME)/.local/share/jupyter/nbextensions/urth_dash_js \
		-v `pwd`/urth/dashboard:$(EXTENSION_DIR) \
		-v `pwd`/etc/jupyter_notebook_config.py:$(NB_HOME)/.jupyter/jupyter_notebook_config.py \
		-v `pwd`/etc/notebook.json:$(NB_HOME)/.jupyter/nbconfig/notebook.json \
		-v `pwd`/etc/notebooks:/home/jovyan/work \
		$(BOWER_REPO) bash -c '$(SETUP_CMD) pip install --no-binary :all: $$(ls -1 /declarativewidgets/dist/*.tar.gz | tail -n 1); $(CMD)'

install: install-$(PYTHON)

install-python2: SETUP_CMD=$(PYTHON2_SETUP)
install-python2: _install

install-python3: _install

_install: CMD?=exit
_install:
	@docker run -it --rm \
		--user jovyan \
		-v `pwd`:/src \
		$(REPO) bash -c '$(SETUP_CMD) cd /src/dist && \
			pip install $$(ls -1 *.tar.gz | tail -n 1) ; \
			$(CMD)'

sdist: js
	@docker run -it --rm \
		-v `pwd`:/src \
		$(REPO) bash -c 'cp -r /src /tmp/src && \
			cd /tmp/src && \
			python setup.py sdist $(POST_SDIST) && \
			cp -r dist /src'

test: test-$(PYTHON)

test-python2: SETUP_CMD?=$(PYTHON2_SETUP)
test-python2: _test

test-python3: _test

_test: REPO?=cloudet/pyspark-notebook-bower
_test: CMD?=cd /src; python --version; python -B -m unittest discover -s test
_test:
# Need to use two commands here to allow for activation of multiple python versions
	@docker run -it --rm \
		-v `pwd`:/src \
		$(REPO) bash -c '$(SETUP_CMD) $(CMD)'

release: POST_SDIST=register upload
release: sdist
		$(REPO) $(CMD)

_system-test-local-setup:
# Check if deps are installed when running locally
	@which chromedriver || (echo "chromedriver not found (brew install chromedriver)"; exit 1)
	@which selenium-server || (echo "selenium-server not found (brew install selenium-server-standalone)"; exit 1)
	@cd system-test/bin; ./run-selenium.sh

_system-test-local-teardown:
	@-cd system-test/bin; ./kill-selenium.sh

system-test-local: TEST_SERVER?=192.168.99.1:4444
system-test-local: BASEURL?=http://192.168.99.100:9500
system-test-local: TEST_TYPE?=local
system-test-local: _system-test-local-setup _system-test _system-test-local-teardown

system-test-remote: TEST_TYPE?=remote
system-test-remote: BASEURL?=http://127.0.0.1:9500
system-test-remote: TEST_SERVER?=ondemand.saucelabs.com
system-test-remote: _system-test

_system-test: SERVER_NAME?=urth_dashboards_integration_test_server
_system-test: REPO?=cloudet/pyspark-notebook-bower
_system-test: CMD?=bash -c 'cd /src; npm run system-test -- --baseurl $(BASEURL) --server $(TEST_SERVER) --test-type $(TEST_TYPE)'
_system-test:
	-@docker rm -f $(SERVER_NAME)
	@OPTIONS=-d SERVER_NAME=$(SERVER_NAME) $(MAKE) dev
	@echo 'Waiting 20 seconds for server to start...'
	@sleep 20
	@echo 'Running system integration tests...'
	@docker run --rm -it \
		--net=host \
		-e SAUCE_USERNAME=$(SAUCE_USERNAME) \
		-e SAUCE_ACCESS_KEY=$(SAUCE_ACCESS_KEY) \
		-e TRAVIS_JOB_NUMBER=$(TRAVIS_JOB_NUMBER) \
		-v `pwd`:/src \
		$(REPO) $(CMD)
	-@docker rm -f $(SERVER_NAME)
