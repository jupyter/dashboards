# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

.PHONY: clean dev dev-with-widgets help install js sdist test 

REPO:=jupyter/pyspark-notebook:a388c4a66fd4
BOWER_REPO:=jupyter/pyspark-notebook-bower:a388c4a66fd4

help:
	@echo 'Host commands:'
	@echo '           build - builds a dev image with node/npm/bower for declarativewidgets'
	@echo '           clean - clean built files'
	@echo '             dev - start notebook server in a container with source mounted'
	@echo 'dev-with-widgets - like dev, but with declarativewidgets sdist installed'
	@echo '         install - install latest dashboards sdist into a container'
	@echo '           sdist - build a dashboards source distribution into dist/'
	@echo '            test - run unit tests within a container'

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

dev: NB_HOME?=/root
dev: CMD?=sh -c "jupyter notebook --no-browser --port 8888 --ip='*'"
dev: AUTORELOAD?=no
dev: configs js
	@docker run -it --rm \
		-p 9500:8888 \
		-e AUTORELOAD=$(AUTORELOAD) \
		-v `pwd`/urth_dash_js:$(NB_HOME)/.local/share/jupyter/nbextensions/urth_dash_js \
		-v `pwd`/urth:/opt/conda/lib/python3.4/site-packages/urth \
		-v `pwd`/etc/jupyter_notebook_config.py:$(NB_HOME)/.jupyter/jupyter_notebook_config.py \
		-v `pwd`/etc/notebook.json:$(NB_HOME)/.jupyter/nbconfig/notebook.json \
		-v `pwd`/etc/notebooks:/home/jovyan/work \
		$(REPO) $(CMD)

dev-with-widgets: NB_HOME?=/root
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
		-v `pwd`/urth_dash_js:$(NB_HOME)/.local/share/jupyter/nbextensions/urth_dash_js \
		-v `pwd`/urth/dashboard:/opt/conda/lib/python3.4/site-packages/urth/dashboard \
		-v `pwd`/etc/jupyter_notebook_config.py:$(NB_HOME)/.jupyter/jupyter_notebook_config.py \
		-v `pwd`/etc/notebook.json:$(NB_HOME)/.jupyter/nbconfig/notebook.json \
		-v `pwd`/etc/notebooks:/home/jovyan/work \
		$(BOWER_REPO) bash -c 'pip install $$(ls -1 /declarativewidgets/dist/*.tar.gz | tail -n 1) && \
			$(CMD)'

install: CMD?=exit
install:
	docker run -it --rm \
		-v `pwd`:/src \
		--user jovyan \
		$(REPO) bash -c 'cd /src/dist && \
			pip install --no-binary :all: $$(ls -1 *.tar.gz | tail -n 1); \
			$(CMD)'

sdist: js
	@docker run -it --rm \
		-v `pwd`:/src \
		$(REPO) bash -c 'cp -r /src /tmp/src && \
			cd /tmp/src && \
			echo "$(BUILD_NUMBER)-$(GIT_COMMIT)" > VERSION && \
			python setup.py sdist && \
			cp -r dist /src'

test: CMD?=bash -c 'cd /src; python3 -B -m unittest discover -s test'
test:
	@docker run -it --rm \
		-v `pwd`:/src \
		$(REPO) $(CMD)
