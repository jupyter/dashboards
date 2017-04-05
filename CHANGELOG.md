# Changelog

## 0.7.0 (2017-04-04)

* Updated to support notebook 5.0
* Fixed clipping at cell boundaries

## 0.6.1 (2016-08-18)

* Include LICENSE.md in source package

## 0.6.0 (2016-06-17)

* Switch to the [v1 dashboard layout specification](https://github.com/jupyter/dashboards/wiki/Dashboard-Metadata-and-Rendering)
* Automatically upgrade existing notebook metadata to the v1 spec
* Update example notebooks for compatibility with `jupyter_declarativewidgets` 0.6.0
* Remove `urth` moniker in favor of `jupyter_dashboards` for CSS classes, notebook metadata, etc.
* Fix gaps in grid when hiding cells

## 0.5.2 (2016-05-11)

* Fix report layout reset when switching between dashboard layout and preview

## 0.5.1 (2016-05-11)

* Hide errors from declarative widgets in dashboard layout and preview
* Fix the state of the show code checkbox in layout view when switching layout types
* Fix history window slider widgetin the community outreach demo
* Fix missing imports in the declarative widgets scotch demo
* Fix copy/pasted cells receive the same layout metadata
* Fix lost cells in report layout after clear and refresh
* Fix layout toolbar button default state

## 0.5.0 (2016-04-26)

* Add report layout for simple top-to-bottom, full-width dashboards
* Add buttons to move a cell to the top, bottom, or notebook order in layout mode
* Make compatible with Jupyter Notebook 4.0.x to 4.2.x
* Fix bokeh example race condition
* Fix browser scrolling when dragging cells in layout view

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
