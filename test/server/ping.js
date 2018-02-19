'use strict';


var request = require('supertest')(TEST.N.config.bind.default.mount);


describe('HTTP alive', function () {

  it('/ GET', function () {
    return request
      .get('/')
      .expect(/<!DOCTYPE html>/)
      .expect(200);
  });

  it('/ HEAD', function () {
    return request
      .head('/')
      .expect(200, {})
      .expect(res => {
        if (res.text) throw new Error(`Body should be empty, got ${res.text}`);
      });
  });
});
