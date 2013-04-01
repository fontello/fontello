// Base structure of (sub-)application. Holds root, name and version of ana
// application. In future will also hold init() function that wil be called
// upon runner's applications init stage.


"use strict";


// stdlib
var path = require("path");


////////////////////////////////////////////////////////////////////////////////


function Application(options) {
  var data = require(path.join(options.root, 'package'));

  this.root     = options.root;
  this.name     = data.name;
  this.version  = data.version;

  this.init     = options.init || function () {};
}


////////////////////////////////////////////////////////////////////////////////


module.exports = Application;
