'use strict';


/*global nodeca*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var views     = require('nlib').Views;
var async     = require('nlib').Vendor.Async;
var _         = require('nlib').Vendor.Underscore;


////////////////////////////////////////////////////////////////////////////////


// compileViews(root, callback(err)) -> Void
// - root (String): Pathname containing views directories.
// - callback (Function): Executed once everything is done.
//
// Compiles all views, inject them into `nodeca.runtime.views` for the
// server and writes browserified versions into `views.js`.
//
module.exports = function compileViews(root, callback) {
  views.collect(path.join(nodeca.runtime.apps[0].root, 'views'), function (err, tree) {
    if (err) {
      callback(err);
      return;
    }

    // set server-side views tree
    nodeca.runtime.views = views.buildServerTree(tree);

    // write client-side views tree
    views.writeClientTree(
      path.join(root, 'views.js'),
      tree,
      'this.nodeca.views',
      callback
    );
  });
};
