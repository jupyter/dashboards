// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var wd = require('wd');
require('colors');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var parseArgs = require('minimist');
var Dashboard =  require('./dashboard');

//  Parse the args
var args = parseArgs(process.argv);
args.local = args['test-type'] === 'local';
args.remote = !args.local;

//  Setup chai
chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

// Configure webdriver
wd.configureHttp({
    timeout: 60000,
    retryDelay: 15000,
    retries: 5,
    baseUrl: args.baseurl
});

//  The browser capabilities we would like setup by selenium
var desired = {browserName: 'chrome', platform: 'OS X 10.10'};
desired.platform = args.platform || desired.platform;
desired.browserName = args.browser || desired.browserName;
desired.tags = ['dashboard', 'system-test', desired.browserName];
// If there is a build number, include it in the desired attributes for sauce labs
if(process.env.TRAVIS_JOB_NUMBER) {
  desired.tunnelIdentifier = process.env.TRAVIS_JOB_NUMBER;
  desired.build = 'dashboards-build-' + process.env.TRAVIS_JOB_NUMBER;
}

//  The selenium test server, local or remote, we will be using to test against
var testServer = 'http://' + args.server + '/wd/hub';
if(args.remote) {
  testServer = 'http://' + process.env.SAUCE_USERNAME + ':' + process.env.SAUCE_ACCESS_KEY + '@' + args.server + '/wd/hub';
}

console.log('Travis job number is: ', process.env.TRAVIS_JOB_NUMBER);
console.log('Sauce user name is not defined? ', !!process.env.SAUCE_USERNAME);
console.log('Sauce access key is defined? ', !!process.env.SAUCE_ACCESS_KEY);

/**
  * A helper class to setup webdriver, create a browser, and dashboard objects for
  * use within the system tests.
  */
var Boilerplate = function(){
  this.browser = wd.promiseChainRemote(testServer);
  this.dashboard = new Dashboard(wd, this.browser);
  this.allPassed = true;
};

/**
  * Setups the before and after calls for each of your tests. The boilerplate
  * will start each test on startingURL, which is a relative path to the resource to load.
  */
Boilerplate.prototype.setup = function(testName, startingURL){
  var that = this;
  startingURL = startingURL ? startingURL : '/';
  desired.name = testName ? 'Urth Dashboard System Test - ' + testName
    : 'Urth Dashboard System Test';

  before(function(done){
    this.browser.init(desired).nodeify(done);
  }.bind(this));

  beforeEach(function(done){
    this.browser.get(startingURL).nodeify(done);
  }.bind(this));

  after(function(done){
    var result = this.browser.quit();
    if(args.remote) {
      result = result.sauceJobStatus(this.allPassed);
    }
    result.nodeify(done);
  }.bind(this));

  afterEach(function(done) {
    that.allPassed = that.allPassed && (this.currentTest.state === 'passed');
    done();
  });
};

module.exports = Boilerplate;
