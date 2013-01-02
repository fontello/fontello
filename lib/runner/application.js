// Base structure of (sub-)application. Holds root, name and version of ana
// application. In future will also hold init() function that wil be called
// upon runner's applications init stage.


"use strict";


// stdlib
var path = require("path");
var prop = Object.defineProperty;


////////////////////////////////////////////////////////////////////////////////


function Application(options) {
  var data = require(path.join(options.root, 'package'));

  prop(this, 'root',    { value: options.root, enumerable: true });
  prop(this, 'name',    { value: data.name,    enumerable: true });
  prop(this, 'version', { value: data.version, enumerable: true });

  prop(this, 'init',    { value: options.init || function () {} });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = Application;
