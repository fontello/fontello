'use strict';


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

  it('with custom icon', function (done) {
    request
      .post('/')
      .attach('config', path.join(__dirname, 'fixtures', 'config_custom.json'))
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        if (err) {
          done(err);
          return;
        }

        request
          .get(`/${res.text}/get`)
          .expect(200)
          .parse(binaryParser)
          .end((err, res) => {
            if (err) {
              done(err);
              return;
            }

            let downloaded = new JSZip(res.body);
            let original = new JSZip(fs.readFileSync(path.join(__dirname, 'fixtures', 'result_custom.zip')));

            assert.strictEqual(
              downloaded.file(/fontello-[0-9a-f]+\/font\/fontello\.svg/)[0].asText(),
              original.file(/fontello-[0-9a-f]+\/font\/fontello\.svg/)[0].asText()
            );
            done();
          });
      });
  });


  it('with fontelico icon', function (done) {
    request
      .post('/')
      .attach('config', path.join(__dirname, 'fixtures', 'config_fontelico.json'))
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        if (err) {
          done(err);
          return;
        }

        request
          .get(`/${res.text}/get`)
          .expect(200)
          .parse(binaryParser)
          .end((err, res) => {
            if (err) {
              done(err);
              return;
            }

            let downloaded = new JSZip(res.body);
            let original = new JSZip(fs.readFileSync(path.join(__dirname, 'fixtures', 'result_fontelico.zip')));

            assert.strictEqual(
              downloaded.file(/fontello-[0-9a-f]+\/font\/fontello\.svg/)[0].asText(),
              original.file(/fontello-[0-9a-f]+\/font\/fontello\.svg/)[0].asText()
            );
            done();
          });
      });
  });
});
