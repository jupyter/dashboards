// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var Boilerplate = require('./utils/boilerplate');
var boilerplate = new Boilerplate();
/**
  * Tests clicking through the dashboard buttons in the View menu.
  */
describe('Dashboard View Menu Buttons', function() {
  boilerplate.setup(this.title, '/notebooks/test/system-test/Basic.ipynb');
  var dashboard = boilerplate.dashboard;
  it('clicking "Layout Dashboard" should switch to layout view', function(done) {
    dashboard.clickLayoutViewMenuButton();
    dashboard.assertInLayoutView();
    dashboard.done(done);
  });
  
  it('clicking "Notebook" should switch to notebook view', function(done) {
    dashboard.clickNotebookViewMenuButton();
    dashboard.assertInNotebookView();
    dashboard.done(done);
  });
  
  it('clicking "View Dashboard" should switch to dashboard view', function(done) {
    dashboard.clickDashboardViewMenuButton();
    dashboard.assertInDashboardView();
    dashboard.done(done);
  });
});
