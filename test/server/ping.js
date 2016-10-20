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
      .expect(res => {
        if (res.text) throw new Error(`Body should be empty, got ${res.text}`);
      })
      .expect(200, done);
  });
});
