'use strict';


/*global nodeca, _*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var apiTree   = require('nlib').ApiTree;
var async     = require('nlib').Vendor.Async;
var fstools   = require('nlib').Vendor.FsTools;


////////////////////////////////////////////////////////////////////////////////


// internal
// browserify(callback(err, str)) -> Void
// - callback (Function): Executed once all namespaces were browserified
//
// Makes browserified client/shared/server trees.
//
function browserify(callback) {
  var parts       = [];

  // browserify server tree
  parts.push(apiTree.browserifyServerTree(nodeca.server, 'this.nodeca.server', {
    method: 'nodeca.io.apiTree'
  }));

  // browserify client and shared trees
  async.forEach(['client', 'shared'], function (part, next) {
    var pathname = path.join(nodeca.runtime.apps[0].root, part);

    apiTree.browserifySources(pathname, 'this.nodeca.' + part, function (err, str) {
      if (err) {
        next(err);
        return;
      }

      parts.push(str);
      next();
    });
  }, function (err) {
    callback(err, parts.join('\n\n'));
  });
}


////////////////////////////////////////////////////////////////////////////////


// buildApiTree(root, callback(err)) -> Void
// - root (String): Pathname where to save browserified api.js.
// - callback (Function): Executed once everything is done.
//
// Browserifies server/shared/client trees into api.js file.
//
module.exports = function buildApiTree(root, callback) {
  browserify(function (err, str) {
    if (err) {
      callback(err);
      return;
    }

    fs.writeFile(path.join(root, 'api.js'), str, callback);
  });
};
