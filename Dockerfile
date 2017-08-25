FROM jupyter/base-notebook
USER root
ADD . .
RUN chown -R $NB_USER .
USER $NB_USER
RUN conda install -y -q --file requirements.txt --file requirements-demo.txt
RUN conda install -y -q jupyter_dashboards
