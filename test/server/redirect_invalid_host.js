'use strict';


const supertest = require('supertest');
const url       = require('url');


describe('Invalid host', function () {

  it('should redirect to default', async function () {
    let port = url.parse(TEST.N.config.bind.default.mount).port;

    await supertest(`http://127.0.0.1:${port}`)
      .get('/')
      .expect('Location', `http://localhost:${port}/`)
      .expect(302);
  });
});
