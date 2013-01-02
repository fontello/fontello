/*global before, describe, it*/


'use strict';


var request = require('supertest')('http://localhost:3000');


describe('Server HTTP', function () {
  before(function (done) {
    var
    runner      = require('../../lib/runner'),
    application = require('../../fontello');

    runner.bootstrap(application, ['server'], done);
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
