/*global before, describe, it*/


'use strict';


var path    = require('path');
var request = require('supertest')('http://localhost:3000');


describe('Server HTTP', function () {
  before(function (done) {
    function init(N) {
      require('../../lib/autoload.js')(N);
      N.wire.after('init:server', function() { done(); });
    }

    // Replace real process arguments passing 'server' option for the runner.
    process.argv = ['node', 'fontello.js', 'server'];

    require('../../lib/system/runner').bootstrap({
      root: path.resolve(__dirname, '../..')
    , init: init
    });
  });

  it("/ GET", function (done) {
    request
      .get('/')
      .expect(/fontello/)
      .expect(200, done);
  });

  it("/ HEAD", function (done) {
    request
      .head('/')
      .expect('')
      .expect(200, done);
  });
});
