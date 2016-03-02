'use strict';


var request = require('supertest')(TEST.N.config.bind.default.mount);


describe('HTTP alive', function () {

  it('/ GET', function (done) {
    request
      .get('/')
      .expect(/<!DOCTYPE html>/)
      .expect(200, done);
  });

  it('/ HEAD', function (done) {
    request
      .head('/')
      .expect('')
      .expect(200, done);
  });
});
