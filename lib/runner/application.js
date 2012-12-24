"use strict";


// stdlib
var path = require("path");


////////////////////////////////////////////////////////////////////////////////


// dummy function that executes last argument (usually callback in Node.JS)
function noopWithCallback() {
  arguments[arguments.length - 1]();
}


////////////////////////////////////////////////////////////////////////////////


function Application(root, config) {
  var data = require(path.join(root, 'package'));

  this.root     = root;

  this.name     = data.name;
  this.version  = data.version;

  this.init     = (config || {}).init || noopWithCallback;
}


////////////////////////////////////////////////////////////////////////////////


module.exports = Application;
