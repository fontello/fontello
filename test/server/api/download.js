'use strict';


const Promise = require('bluebird');
const request = require('supertest')(TEST.N.config.bind.default.mount);
const assert  = require('assert');
const JSZip   = require('jszip');
const path    = require('path');
const fs      = require('fs');


function binaryParser(res, callback) {
  res.setEncoding('binary');
  res.data = '';
  res.on('data', chunk => {
    res.data += chunk;
  });
  res.on('end', () => {
    callback(null, new Buffer(res.data, 'binary'));
  });
}


describe('API.download', function () {

  it('with custom icon', function () {
    return Promise.resolve()
      .then(() => Promise.fromCallback(cb => request
        .post('/')
        .attach('config', path.join(__dirname, 'fixtures', 'config_custom.json'))
        .set('Accept', 'application/json')
        .expect(200)
        .end(cb)))
      .then(res => Promise.fromCallback(cb => request
        .get(`/${res.text}/get`)
        .expect(200)
        .parse(binaryParser)
        .end(cb)))
      .then(res => {
        let fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'result_custom.zip'));

        return Promise.all([
          JSZip.loadAsync(res.body)
            .then(zip => zip.file(/fontello-[0-9a-f]+\/font\/fontello\.svg/)[0].async('string')),
          JSZip.loadAsync(fixture)
            .then(zip => zip.file(/fontello-[0-9a-f]+\/font\/fontello\.svg/)[0].async('string'))
        ]);
      })
      .then(values => assert.strictEqual(values[0], values[1]));
  });


  it('with fontelico icon', function () {
    return Promise.resolve()
      .then(() => Promise.fromCallback(cb => request
        .post('/')
        .attach('config', path.join(__dirname, 'fixtures', 'config_fontelico.json'))
        .set('Accept', 'application/json')
        .expect(200)
        .end(cb)))
      .then(res => Promise.fromCallback(cb => request
        .get(`/${res.text}/get`)
        .expect(200)
        .parse(binaryParser)
        .end(cb)))
      .then(res => {
        let fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'result_fontelico.zip'));

        return Promise.all([
          JSZip.loadAsync(res.body)
            .then(zip => zip.file(/fontello-[0-9a-f]+\/font\/fontello\.svg/)[0].async('string')),
          JSZip.loadAsync(fixture)
            .then(zip => zip.file(/fontello-[0-9a-f]+\/font\/fontello\.svg/)[0].async('string'))
        ]);
      })
      .then(values => assert.strictEqual(values[0], values[1]));
  });
});
