// Base structure of (sub-)application. Holds root, name and version of ana
// application. In future will also hold init() function that wil be called
// upon runner's applications init stage.


'use strict';


const path = require('path');


////////////////////////////////////////////////////////////////////////////////


function Application(options) {
  let pkg = require(path.join(options.root, 'package.json'));

  this.root     = options.root;
  this.name     = pkg.name;
  this.version  = pkg.version;

  this.init     = options.init || function () {};
}


////////////////////////////////////////////////////////////////////////////////


module.exports = Application;
