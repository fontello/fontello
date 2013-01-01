'use strict';


/*global underscore*/


// stdlib
var fs   = require('fs');
var path = require('path');


// 3rd-party
var _ = underscore;


////////////////////////////////////////////////////////////////////////////////


// shorthand for defining data descriptors
function prop(obj, name, value, options) {
  var descriptor = _.extend({}, options, {value: value});
  Object.defineProperty(obj, name, descriptor);
}


////////////////////////////////////////////////////////////////////////////////


function Pathname(pathname, options) {
  prop(this, 'pathname',  String(pathname));
  prop(this, 'extname',   path.extname(this.pathname));
  prop(this, 'dirname',   path.dirname(this.pathname));

  _.extend(this, options);
}


Pathname.prototype.toString = function toString() {
  return this.pathname;
};


Pathname.prototype.read = function (callback) {
  fs.readFile(this.pathname, 'utf8', callback);
};


Pathname.prototype.readSync = function () {
  return fs.readFileSync(this.pathname, 'utf8');
};


Pathname.prototype.require = function () {
  return require(this.pathname);
};


////////////////////////////////////////////////////////////////////////////////


module.exports = Pathname;
