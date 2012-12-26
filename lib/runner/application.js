"use strict";


// stdlib
var path = require("path");
var prop = Object.defineProperty;


////////////////////////////////////////////////////////////////////////////////


function Application(root, config) {
  var data = require(path.join(root, 'package'));

  prop(this, 'root',    { value: root,         enumerable: true });
  prop(this, 'name',    { value: data.name,    enumerable: true });
  prop(this, 'version', { value: data.version, enumerable: true });

  this.init = (config || {}).init || function noopWithCallback() {
    // dummy function that executes last argument (usually callback in Node.JS)
    arguments[arguments.length - 1]();
  };
}


////////////////////////////////////////////////////////////////////////////////


module.exports = Application;
