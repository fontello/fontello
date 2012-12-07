'use strict';


/*global N*/


// stdlib
var fs   = require('fs');
var path = require('path');


// 3rd-party
var fstools = require('nlib').Vendor.FsTools;
var Mincer  = require('mincer');


// internal
var styles      = require('./processors/styles');
var eachPackage = require('../each_package');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (next) {
  eachPackage(N.runtime.apps, function (name, root, config, nextPackage) {
    var outdir;

    config = config.styles;

    if (!config) {
      nextPackage();
      return;
    }

    try {
      // create temporary dir for styles
      // TODO: should be created outside - one for all packages
      outdir = fstools.tmpdir();
      fs.mkdirSync(outdir);
    } catch (err) {
      nextPackage(err);
      return;
    }

    // resolve root
    config.root = path.join(root, config.root);

    styles.compile(config, function (err, css) {
      if (err) {
        nextPackage(err);
        return;
      }

      fs.writeFile(outdir + '/styles.css', css, 'utf8', function (err) {
        var index = '//= require styles';

        if (err) {
          nextPackage(err);
          return;
        }

        if (config.main) {
          index = fs.readFileSync(path.join(config.root, config.main), 'utf8');
        }

        fs.writeFile(outdir + '/index.css', index, 'utf8', function (err) {
          if (err) {
            nextPackage(err);
            return;
          }

          var env = new Mincer.Environment(outdir);

          env.appendPath('.');
          env.appendPath(config.root);

          env.findAsset('index.css').compile(function (err, data) {
            if (err) {
              nextPackage(err);
              return;
            }

            //console.log(data.toString());
            nextPackage();
          });
        });
      });
    });
  }, next);
};
