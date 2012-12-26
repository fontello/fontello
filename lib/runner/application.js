"use strict";


// stdlib
var path = require("path");
var prop = Object.defineProperty;


////////////////////////////////////////////////////////////////////////////////


function Application(root) {
  var data = require(path.join(root, 'package'));

  prop(this, 'root',    { value: root,         enumerable: true });
  prop(this, 'name',    { value: data.name,    enumerable: true });
  prop(this, 'version', { value: data.version, enumerable: true });
}


////////////////////////////////////////////////////////////////////////////////


module.exports = Application;
