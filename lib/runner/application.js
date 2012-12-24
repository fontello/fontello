"use strict";


// stdlib
var path = require("path");


// 3rd-party
var _    = require("underscore");


////////////////////////////////////////////////////////////////////////////////


// dummy function that executes last argument (usually callback in Node.JS)
function noopWithCallback() {
  arguments[arguments.length - 1]();
}


// helper to define properties
function prop(obj, key, val, options) {
  Object.defineProperty(obj, key, _.extend(options, { value: val }));
}


////////////////////////////////////////////////////////////////////////////////


function Application(root, config) {
  var data = require(path.join(root, 'package'));

  prop(this, 'root',    root,         { enumerable: true });

  prop(this, 'name',    data.name,    { enumerable: true });
  prop(this, 'version', data.version, { enumerable: true });

  this.init     = (config || {}).init || noopWithCallback;
}


////////////////////////////////////////////////////////////////////////////////


module.exports = Application;
