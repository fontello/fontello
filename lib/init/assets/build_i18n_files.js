'use strict';


/*global nodeca, _*/


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var async     = require('nlib').Vendor.Async;
var fstools   = require('nlib').Vendor.FsTools;
var JASON     = require('nlib').Vendor.JASON;


////////////////////////////////////////////////////////////////////////////////


// buildI18nFiles(root, callback(err)) -> Void
// - root (String): Pathname where to save i18n.js files.
// - callback (Function): Executed once everything is done.
//
// Writes i18n.js file.
//
module.exports = function buildI18nFiles(root, callback) {
  var chunks = [];

  nodeca.config.locales.enabled.forEach(function (lang) {
    var data = nodeca.runtime.i18n.getCompiledData(lang);
    chunks.push(
      'nodeca.runtime.i18n.load(' +
      JSON.stringify(lang) + ',' +
      JASON.stringify(data) +
      ');'
    );
  });

  fs.writeFile(path.join(root, 'i18n.js'), chunks.join('\n'), callback);
};
