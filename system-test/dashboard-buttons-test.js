// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var Boilerplate = require('./utils/boilerplate');
var boilerplate = new Boilerplate();
/**
  * Tests clicking through the dashboard buttons in the notebook toolbar.
  */
describe('Dashboard View Buttons', function() {
  boilerplate.setup(this.title, '/notebooks/test/system-test/Basic.ipynb');
  var dashboard = boilerplate.dashboard;

  it('clicking layout view should switch to layout view', function(done) {
    dashboard.clickLayoutViewButton();
    dashboard.assertInLayoutView();
    dashboard.done(done);
  });

  it('clicking notebook view should switch to notebook view', function(done) {
    dashboard.clickNotebookViewButton();
    dashboard.assertInNotebookView();
    dashboard.done(done);
  });
  
  it('clicking dashboard view should switch to dashboard view', function(done) {
    dashboard.clickDashboardViewButton();
    dashboard.assertInDashboardView();
    dashboard.done(done);
  });
});
