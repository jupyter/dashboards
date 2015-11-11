# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

.PHONY: build clean configs demo dev dev-with-widgets help install js sdist test
PYTHON?=python3
PYTHON2_SETUP?=source activate python2; pip install ipython[notebook]==3.2;

help:
	@echo 'Host commands:'
	@echo '           clean - clean built files'
	@echo '            demo - start notebook server with stable dashboard / widget extensions'
	@echo '             dev - start notebook server in a container with source mounted'
	@echo 'dev-with-widgets - like dev, but with stable declarativewidgets installed'
	@echo '         install - install latest sdist into a container'
	@echo '           sdist - build a source distribution into dist/'
	@echo '            test - run unit tests within a container'

configs:
# Make copies so that we don't volume mount git controlled files which will
# will get modified at runtime.
	@cp etc/ipython_notebook_config.default.py etc/ipython_notebook_config.py
	@cp etc/notebook.default.json etc/notebook.json

clean:
	@-rm etc/ipython_notebook_config.py
	@-rm etc/notebook.json
	@-rm -rf dist
	@-rm -rf *.egg-info
	@-rm -rf etc/notebooks/test_app
	@-rm -rf etc/notebooks/local_dashboards
	@-rm -rf node_modules
	@-rm -rf urth_dash_js/notebook/bower_components
	@-find . -name __pycache__ -exec rm -fr {} \;

js: REPO?=cloudet/pyspark-notebook-bower
js:
	@docker run -it --rm \
		-v `pwd`:/src \
		$(REPO) bash -c 'cd /src && npm install && npm run css && npm run bower'

demo: NB_HOME?=/home/jovyan/.ipython
demo: REPO?=cloudet/pyspark-notebook-bower
demo: CMD?=ipython notebook --no-browser --port 8888 --ip="*"
demo: configs
	@docker run -it --rm \
		-p 9500:8888 \
		-v `pwd`:/dashboards \
		-v `pwd`/../declarativewidgets:/declarativewidgets \
		-v `pwd`/etc/ipython_notebook_config.py:$(NB_HOME)/profile_default/ipython_notebook_config.py \
		-v `pwd`/etc/notebooks:/home/jovyan/work \
		$(REPO) bash -c 'pip install $$(ls -1 /dashboards/dist/*.tar.gz | tail -n 1) && \
			pip install $$(ls -1 /declarativewidgets/dist/*.tar.gz | tail -n 1) && \
			$(CMD)'

dev: dev-$(PYTHON)

dev-python2: CMD?=sh -c "$(PYTHON2_SETUP) ipython notebook --no-browser --port 8888 --ip='*'"
dev-python2: EXTENSION_DIR=/opt/conda/envs/python2/lib/python2.7/site-packages/urth
dev-python2: _dev

dev-python3: EXTENSION_DIR=/opt/conda/lib/python3.4/site-packages/urth
dev-python3: CMD?=sh -c "ipython notebook --no-browser --port 8888 --ip='*'"
dev-python3: _dev

_dev: NB_HOME?=/home/jovyan/.ipython
_dev: REPO?=cloudet/pyspark-notebook-bower
_dev: AUTORELOAD?=no
_dev: configs js
	@docker run -it --rm \
		-p 9500:8888 \
		-e USE_HTTP=1 \
		-e PASSWORD='' \
		-e AUTORELOAD=$(AUTORELOAD) \
		-v `pwd`/urth_dash_js:$(NB_HOME)/nbextensions/urth_dash_js \
		-v `pwd`/urth:$(EXTENSION_DIR) \
		-v `pwd`/etc/ipython_notebook_config.py:$(NB_HOME)/profile_default/ipython_notebook_config.py \
		-v `pwd`/etc/notebook.json:$(NB_HOME)/profile_default/nbconfig/notebook.json \
		-v `pwd`/etc/notebooks:/home/jovyan/work \
		$(REPO) $(CMD)


dev-with-widgets: dev-with-widgets-$(PYTHON)

dev-with-widgets-python2: SETUP_CMD?=$(PYTHON2_SETUP)
dev-with-widgets-python2: EXTENSION_DIR=/opt/conda/envs/python2/lib/python2.7/site-packages/urth/dashboard
dev-with-widgets-python2: _dev-with-widgets

dev-with-widgets-python3: EXTENSION_DIR=/opt/conda/lib/python3.4/site-packages/urth/dashboard
dev-with-widgets-python3: _dev-with-widgets

_dev-with-widgets: NB_HOME?=/home/jovyan/.ipython
_dev-with-widgets: REPO?=cloudet/pyspark-notebook-bower
_dev-with-widgets: CMD?=sh -c "ipython notebook --no-browser --port 8888 --ip='*'"
_dev-with-widgets: AUTORELOAD?=no
_dev-with-widgets: configs js
	# We volume mount the config, so don't let the container corrupt the committed copy
	@docker run -it --rm \
		-p 9500:8888 \
		-e USE_HTTP=1 \
		-e PASSWORD='' \
		-e AUTORELOAD=$(AUTORELOAD) \
		-v `pwd`/../declarativewidgets:/declarativewidgets \
		-v `pwd`/urth_dash_js:$(NB_HOME)/nbextensions/urth_dash_js \
		-v `pwd`/urth/dashboard:$(EXTENSION_DIR) \
		-v `pwd`/etc/ipython_notebook_config.py:$(NB_HOME)/profile_default/ipython_notebook_config.py \
		-v `pwd`/etc/notebook.json:$(NB_HOME)/profile_default/nbconfig/notebook.json \
		-v `pwd`/etc/notebooks:/home/jovyan/work \
		$(REPO) bash -c '$(SETUP_CMD) pip install $$(ls -1 /declarativewidgets/dist/*.tar.gz | tail -n 1);  $(CMD)'

install: install-$(PYTHON)

install-python2: SETUP_CMD=$(PYTHON2_SETUP)
install-python2: _install

install-python3: _install

_install: REPO?=cloudet/pyspark-notebook-bower
_install: CMD?=exit
_install:
	@docker run -it --rm \
		-v `pwd`:/src \
		$(REPO) bash -c '$(SETUP_CMD) cd /src/dist && \
			pip install $$(ls -1 *.tar.gz | tail -n 1) && \
			$(CMD)'

sdist: REPO?=cloudet/pyspark-notebook-bower
sdist: js
	@docker run -it --rm \
		-v `pwd`:/src \
		$(REPO) bash -c 'cp -r /src /tmp/src && \
			cd /tmp/src && \
			python setup.py sdist $(POST_SDIST) && \
			cp -r dist /src'

test: test-$(PYTHON)

test-python2: CMD?=bash -c '$(PYTHON2_SETUP) cd /src; python -B -m unittest discover -s test'
test-python2: _test

test-python3: CMD?=bash -c 'cd /src; python -B -m unittest discover -s test'
test-python3: _test

_test: REPO?=cloudet/pyspark-notebook-bower
_test:
	@docker run -it --rm \
		-v `pwd`:/src \
		$(REPO)  $(CMD)

release: POST_SDIST=register upload
release: sdist
