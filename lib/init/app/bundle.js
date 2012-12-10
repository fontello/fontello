// Final bundle generator


'use strict';


/*global N*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _       = require('underscore');
var async   = require('nlib').Vendor.Async;
var JASON   = require('nlib').Vendor.JASON;
var fstools = require('nlib').Vendor.FsTools;
var treeGet = require('nlib').Support.tree.get;
var Mincer  = require('mincer');
var nib     = require('nib');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (tmpdir, config, callback) {
  callback();
};
