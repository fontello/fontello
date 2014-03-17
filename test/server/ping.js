/*global describe, it*/


'use strict';


var request = require('supertest')('http://localhost:3000');


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
