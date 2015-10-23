# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

.PHONY: build clean dev help sdist test install remote

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
		-u jovyan \
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

dev: NB_HOME?=/home/jovyan/.ipython
dev: REPO?=jupyter/pyspark-notebook:3.2
dev: CMD?=sh -c "ipython notebook --no-browser --port 8888 --ip='*'"
dev: AUTORELOAD?=no
dev: configs js
	@docker run -it --rm \
		-p 9500:8888 \
		-e USE_HTTP=1 \
		-e PASSWORD='' \
		-e AUTORELOAD=$(AUTORELOAD) \
		-v `pwd`/urth_dash_js:$(NB_HOME)/nbextensions/urth_dash_js \
		-v `pwd`/urth:/opt/conda/lib/python3.4/site-packages/urth \
		-v `pwd`/etc/ipython_notebook_config.py:$(NB_HOME)/profile_default/ipython_notebook_config.py \
		-v `pwd`/etc/notebook.json:$(NB_HOME)/profile_default/nbconfig/notebook.json \
		-v `pwd`/etc/notebooks:/home/jovyan/work \
		$(REPO) $(CMD)

dev-with-widgets: NB_HOME?=/home/jovyan/.ipython
dev-with-widgets: REPO?=cloudet/pyspark-notebook-bower
dev-with-widgets: CMD?=sh -c "ipython notebook --no-browser --port 8888 --ip='*'"
dev-with-widgets: AUTORELOAD?=no
dev-with-widgets: configs js
# We volume mount the config, so don't let the container corrupt the committed copy
	@docker run -it --rm \
		-p 9500:8888 \
		-e USE_HTTP=1 \
		-e PASSWORD='' \
		-e AUTORELOAD=$(AUTORELOAD) \
		-v `pwd`/../declarativewidgets:/declarativewidgets \
		-v `pwd`/urth_dash_js:$(NB_HOME)/nbextensions/urth_dash_js \
		-v `pwd`/urth/dashboard:/opt/conda/lib/python3.4/site-packages/urth/dashboard \
		-v `pwd`/etc/ipython_notebook_config.py:$(NB_HOME)/profile_default/ipython_notebook_config.py \
		-v `pwd`/etc/notebook.json:$(NB_HOME)/profile_default/nbconfig/notebook.json \
		-v `pwd`/etc/notebooks:/home/jovyan/work \
		$(REPO) bash -c 'pip install $$(ls -1 /declarativewidgets/dist/*.tar.gz | tail -n 1) && \
			$(CMD)'

install: REPO?=jupyter/pyspark-notebook:3.2
install: CMD?=exit
install:
	@docker run -it --rm \
		-v `pwd`:/src \
		$(REPO) bash -c 'cd /src/dist && \
			pip install $$(ls -1 *.tar.gz | tail -n 1) && \
			$(CMD)'

sdist: REPO?=jupyter/pyspark-notebook:3.2
sdist: RELEASE?=
sdist: BUILD_NUMBER?=0
sdist: GIT_COMMIT?=HEAD
sdist: js
	@docker run -it --rm \
		-v `pwd`:/src \
		$(REPO) bash -c 'cp -r /src /tmp/src && \
			cd /tmp/src && \
			echo "$(BUILD_NUMBER)-$(GIT_COMMIT)" > VERSION && \
			python setup.py sdist && \
			cp -r dist /src'

test: REPO?=jupyter/pyspark-notebook:3.2
test: CMD?=bash -c 'cd /src; python3 -B -m unittest discover -s test'
test:
	@docker run -it --rm \
		-v `pwd`:/src \
		$(REPO) $(CMD)
