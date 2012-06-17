"use strict";


/*global nodeca*/


// stdlib
var net   = require('net');
var repl  = require('repl');
var path  = require('path');


// nodeca
var NLib = require('nlib');


// 3rd-party
var FsTools = NLib.Vendor.FsTools;


////////////////////////////////////////////////////////////////////////////////


module.exports = function (next) {
  var socket_file = path.resolve(nodeca.runtime.apps[0].root, 'tmp/repl.sock');

  FsTools.mkdir(path.dirname(socket_file), function (err) {
    if (err) {
      next(err);
      return;
    }

    net.createServer(function (socket) {
      repl.start('fontello> ', socket);
    }).listen(socket_file);

    next();
  });
};
