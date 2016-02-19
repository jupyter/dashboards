# Changelog

## 0.4.2 (2016-02-18)

* Fix code cell overflow in layout mode
* Fix scroll bars that appear within cells of a certain size
* Fix hidden cells from being cut-off in layout mode
* Fix failure to load extension JS in certain situations
* Fix meetup streaming demo filter box
* Update to Gridstack 0.2.4 to remove a workaround

## 0.4.1 (2016-02-07)

* Fix gridstack break with lodash>=4.0
* Remove notebook 4.1 cell focus highlight in dashboard preview
* Hide stderr and errors in dashboard preview, send them to the browser console

## 0.4.0 (2016-01-21)

* Separate `pip install` from `jupyter dashboards [install | activate | deactivate]`
* Match the Python package to the distribution name, `jupyter_dashboards`
* Fix cell overlap when one cell has the minimum height
* Prevent stderr and exception messages from displaying in dashboard modes
* Update demo notebooks to stop using deprecated `UrthData.setItem` from declarative widgets.

## 0.3.0 (2015-12-30)

* Make compatible with Jupyter Notebook 4.1.x
* Remove all download and deployment related backend code in. Refer users to the separate `jupyter_cms` and `jupyter_dashboards_bundlers` packages for these features.
* Keep compatible with Jupyter Notebook 4.0.x

## 0.2.2 (2015-12-15)

* Revert to old jupyter\_notebook\_server.py config hack to remain compatible with jupyter\_declarativewidgets and jupyter\_cms (until they change too)

## 0.2.1 (2015-12-15)

* Fix errors on install when profiles don't exist
* Fix styling leaking out of dashboard mode

## 0.2.0 (2015-12-01)

* Default to showing code instead of blank cells in layout mode
* Add menu items for packed vs stacked cell layout
* Make compatible with Jupyter Notebook 4.0.x
* Make compatible with jupyter_declarativewidgets 0.2.x
* System tests using Selenium locally, SauceLabs via Travis

## 0.1.1 (2015-12-02)

* Backport of UX fixes from 0.2.0
* Keep compatible with IPython Notebook 3.2.x
* Keep compatible with declarative widgets 0.1.x

## 0.1.0 (2015-11-17)

* First PyPI release
* Compatible with IPython Notebook 3.2.x on Python 2.7 or Python 3.3+
