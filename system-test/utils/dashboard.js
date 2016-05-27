// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
  * Encapsulates the features of the dashboard UI.
  * TODO: As more features are added, this file will grow. Need to refactor
  *       functionality into submodules to keep this file maintainable.
  */
var Dashboard = function(wd, browser) {
  this.browser = browser;
  this.wd = wd;
  this.lastCommand = browser;
};

//  Represents different UI elements in the notebook/dashboard UI
var DashboardElements = {
  "notebookViewButton": "#jupyter-dashboard-view-toolbar-buttons > button:nth-of-type(1)",
  "layoutViewButton": "#jupyter-dashboard-view-toolbar-buttons > .dashboard-authoring-btn-container > button:nth-of-type(1)",
  "dashboardViewButton": "#jupyter-dashboard-view-toolbar-buttons > button:nth-of-type(2)",
  "layoutViewHelpArea" : "#notebook_panel > .help-area",
  "jupyterHeaderContainer": "#header-container",
  "viewMenuButton" : "ul.nav > li:nth-child(3)",
  "notebookViewMenuButton" : "#jupyter-dashboard-notebook-view",
  "layoutViewMenuButton" : "#jupyter-dashboard-layout-menu",
  "layoutViewGridMenuButton" : "#jupyter-dashboard-auth-grid",
  "dashboardViewMenuButton" : "#jupyter-dashboard-view"
};
//  Represents expressions run in the browser for verification
var DashboardExpressions = {
  "noJupyterHeader": "document.querySelectorAll('#notebook_panel > .help-area').length === 0"
};
//  Genereic error logging function for callbacks below
var logError = function(msg,err) {
  if(err) {
      console.error(err, msg);
  }
};
//  Timeout to check for elements
var timeout = 20000;

/**
  * Performs a click on the Notebook View Button in the notebook toolbar.
  * Assumes the current page is in notebook view.
  */
Dashboard.prototype.clickNotebookViewButton = function(){
   this.lastCommand = this.lastCommand
    .waitForElementByCssSelector(
      DashboardElements.notebookViewButton, this.wd.asserters.isDisplayed, timeout,
      logError.bind(undefined,'Could not find Notebook View Button'))
    .elementByCssSelector(DashboardElements.notebookViewButton)
    .click();
    return this;
};
/**
  * Performs a click on the Notebook View Button in the notebook toolbar.
  * Assumes the current page is in notebook view.
  */
Dashboard.prototype.clickLayoutViewButton = function(){
   this.lastCommand = this.lastCommand
    .waitForElementByCssSelector(
      DashboardElements.layoutViewButton,this.wd.asserters.isDisplayed, timeout,
      logError.bind(undefined,'Could not find Layout View Button'))
    .elementByCssSelector(DashboardElements.layoutViewButton)
    .click();
    return this;
};
/**
  * Performs a click on the Notebook View Button in the notebook toolbar.
  * Assumes the current page is in notebook view.
  */
Dashboard.prototype.clickDashboardViewButton = function(){
  this.lastCommand = this.lastCommand
    .waitForElementByCssSelector(
      DashboardElements.dashboardViewButton, this.wd.asserters.isDisplayed, timeout,
      logError.bind(undefined,'Could not find Dashboard View Button'))
    .elementByCssSelector(DashboardElements.dashboardViewButton)
    .click();
    return this;
};
/**
  * Performs a click on the Notebook View Button in the notebook toolbar.
  * Assumes the current page is in notebook view.
  */
Dashboard.prototype.clickNotebookViewMenuButton = function(){
   this.lastCommand = this.lastCommand
     .waitForElementByCssSelector(
       DashboardElements.viewMenuButton, this.wd.asserters.isDisplayed, timeout,
       logError.bind(undefined,'Could not find "View" menu button'))
     .elementByCssSelector(DashboardElements.viewMenuButton)
     .click()
    .waitForElementByCssSelector(
      DashboardElements.notebookViewMenuButton, this.wd.asserters.isDisplayed, timeout,
      logError.bind(undefined,'Could not find notebook view menu button'))
    .elementByCssSelector(DashboardElements.notebookViewMenuButton)
    .click();
    return this;
};
/**
  * Performs a click on the Notebook View Button in the notebook toolbar.
  * Assumes the current page is in notebook view.
  */
Dashboard.prototype.clickLayoutViewMenuButton = function(){
   this.lastCommand = this.lastCommand
    .waitForElementByCssSelector(
       DashboardElements.viewMenuButton, this.wd.asserters.isDisplayed, timeout,
       logError.bind(undefined,'Could not find "View" menu button'))
    .elementByCssSelector(DashboardElements.viewMenuButton)
    .click()
    .waitForElementByCssSelector(
      DashboardElements.layoutViewMenuButton,this.wd.asserters.isDisplayed, timeout,
      logError.bind(undefined,'Could not find layout view menu button'))
    .elementByCssSelector(DashboardElements.layoutViewMenuButton)
    .moveTo()
    .waitForElementByCssSelector(
      DashboardElements.layoutViewGridMenuButton,this.wd.asserters.isDisplayed, timeout,
      logError.bind(undefined,'Could not find layout view grid menu button'))
    .elementByCssSelector(DashboardElements.layoutViewGridMenuButton)
    .click();
    return this;
};
/**
  * Performs a click on the Notebook View Button in the notebook toolbar.
  * Assumes the current page is in notebook view.
  */
Dashboard.prototype.clickDashboardViewMenuButton = function(){
  this.lastCommand = this.lastCommand
    .waitForElementByCssSelector(
      DashboardElements.viewMenuButton, this.wd.asserters.isDisplayed, timeout,
      logError.bind(undefined,'Could not find "View" menu button'))
    .elementByCssSelector(DashboardElements.viewMenuButton)
    .click()
    .waitForElementByCssSelector(
      DashboardElements.dashboardViewMenuButton, this.wd.asserters.isDisplayed, timeout,
      logError.bind(undefined,'Could not find dashboard view menu button'))
    .elementByCssSelector(DashboardElements.dashboardViewMenuButton)
    .click();
    return this;
};

/**
  * Asserts the current view is the notebook view.
  */
Dashboard.prototype.assertInNotebookView = function(){
  this.lastCommand = this.lastCommand
    //  Assert there is no help area in notebook view
    .waitForConditionInBrowser(
      DashboardExpressions.noJupyterHeader, timeout)
      // Assert we can see the notebook header
    .waitForElementByCssSelector(
      DashboardElements.jupyterHeaderContainer, this.wd.asserters.isDisplayed, timeout,
      logError.bind(undefined,'Could not find the jupyter header'));
    return this;
};
/**
  * Asserts the current view is the layout view.
  */
Dashboard.prototype.assertInLayoutView = function(){
  this.lastCommand = this.lastCommand
    .waitForElementByCssSelector(
      DashboardElements.layoutViewHelpArea, this.wd.asserters.isDisplayed, timeout,
      logError.bind(undefined,'Could not find layout mode help area'));
    return this;
};
/**
  * Asserts the current view is the dashboard view.
  */
Dashboard.prototype.assertInDashboardView = function(){
  this.lastCommand = this.lastCommand
    .waitForElementByCssSelector(
      DashboardElements.jupyterHeaderContainer, this.wd.asserters.isNotDisplayed, timeout,
      logError.bind(undefined,'The jupyter header is diplayed'));
    return this;
};

Dashboard.prototype.done = function(done) {
    this.lastCommand
        .execute('Jupyter.notebook.dirty = false;')
        .nodeify(done);
    return this;
};
module.exports = Dashboard;
