"use strict";


// stdlib
var path = require("path");


////////////////////////////////////////////////////////////////////////////////


function Application(root, config) {
  var data = require(path.join(root, 'package'));

  this.root     = root;
  this.config   = config;

  this.name     = data.name;
  this.version  = data.version;
}


////////////////////////////////////////////////////////////////////////////////


module.exports = Application;
