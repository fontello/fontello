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
    callback(null, Buffer.from(res.data, 'binary'));
  });
}


describe('API.download', function () {

  it('with custom icon', function () {
    return Promise.resolve()
      .then(() => request
        .post('/')
        .field('url', 'http://example.com')
        .attach('config', path.join(__dirname, 'fixtures', 'config_custom.json'))
        .set('Accept', 'application/json')
        .expect(200)
      )
      .then(res => request
        .get(`/${res.text}/get`)
        .expect(200)
        .parse(binaryParser)
      )
      .then(res => {
        let fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'result_custom.zip'));

        return Promise.all([
          JSZip.loadAsync(res.body)
            .then(zip => zip.file(/fontello-[0-9a-f]+\/font\/fontello\.svg/)[0].async('string')),
          JSZip.loadAsync(fixture)
            .then(zip => zip.file(/fontello-[0-9a-f]+\/font\/fontello\.svg/)[0].async('string'))
        ]);
      })
      // copyright year can change, strip it
      .then(([ actual, expected ]) => assert.strictEqual(
        actual.replace(/<metadata>.+<\/metadata>/, ''),
        expected.replace(/<metadata>.+<\/metadata>/, ''))
      );
  });


  it('with fontelico icon', function () {
    return Promise.resolve()
      .then(() => request
        .post('/')
        .attach('config', path.join(__dirname, 'fixtures', 'config_fontelico.json'))
        .set('Accept', 'application/json')
        .expect(200)
      )
      .then(res => request
        .get(`/${res.text}/get`)
        .expect(200)
        .parse(binaryParser)
      )
      .then(res => {
        let fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'result_fontelico.zip'));

        return Promise.all([
          JSZip.loadAsync(res.body)
            .then(zip => zip.file(/fontello-[0-9a-f]+\/font\/fontello\.svg/)[0].async('string')),
          JSZip.loadAsync(fixture)
            .then(zip => zip.file(/fontello-[0-9a-f]+\/font\/fontello\.svg/)[0].async('string'))
        ]);
      })
      // copyright year can change, strip it
      .then(([ actual, expected ]) => assert.strictEqual(
        actual.replace(/<metadata>.+<\/metadata>/, ''),
        expected.replace(/<metadata>.+<\/metadata>/, ''))
      );
  });


  it('non-existent url', function () {
    return request.get('/00000000/get')
                  .expect(404);
  });
});
