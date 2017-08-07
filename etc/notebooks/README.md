# Jupyter Dashboards Demos

The [dashboards layout extension](https://github.com/jupyter/dashboards) is an
add-on for Jupyter Notebook. It lets you arrange your notebook outputs (text,
plots, widgets, ...) in grid- or report-like layouts. It saves information
about your layouts in your notebook document. Other people with the extension
can open your notebook and view your layouts.

The git repository for the project contains a handful of notebooks that you can
run and modify to learn how the dashboards extension works. After installing
the extension and learning the basics by reading the
[documentation](http://jupyter-dashboards-layout.readthedocs.io/en/latest/index.html),
do the following to get a copy of the example notebooks to run yourself.

```
# Get a copy of the project source and example notebooks
git clone https://github.com/jupyter/dashboards.git

# Activate the virtualenv or conda environment containing your
# install of jupyter notebook and the extension. Then install
# the demo requirements.
pip install -r dashboards/requirements-demo.txt

# Run the notebook server.
jupyter notebook --notebook-dir=./dashboards/etc/notebooks/
```

The following demos are kept up-to-date as issues with dependencies are found and fixed.

1. [Got Scotch?](got_scotch_demo/scotch_dashboard.ipynb) - show similarities
   between scotch varieties
2. [Plotting demo](plotting_demo.ipynb) - shows how matplotlib, bokeh, and plotly work in a dashboard layout
