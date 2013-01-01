'use strict';


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var ejs           = require('ejs');
var findRequires  = require('find-requires');


// internal
var Pathname = require('../utils/pathname');


////////////////////////////////////////////////////////////////////////////////


var TEMPLATE = fs.readFileSync(__dirname + '/template/requisite.js.ejs', 'utf8');


////////////////////////////////////////////////////////////////////////////////


function Requisite() {
  this.requires = {};
  this.idx      = 1;
}


Requisite.prototype.process = function (source, pathname) {
  var
  base  = path.dirname(pathname.toString()),
  files = findRequires(source, { raw: true }),
  o, p;

  while (files.length) {
    o = files.shift();

    if (!o.value) {
      return new Error("Cannot handle non-string required path: " + o.raw);
    }

    try {
      p = String(o.value)
        // replace ^ with application root
        .replace(/^\^\/*/, (pathname.appRoot || '^') + '/')
        // replace @ with package root
        .replace(/^@\/*/, (pathname.pkgRoot || '@') + '/');

      // try to resolve path relatively to pathname
      p = new Pathname(require.resolve(path.resolve(base, p)), {
        appRoot: pathname.appRoot,
        pkgRoot: pathname.pkgRoot
      });
    } catch (err) {
      throw new Error(err.message +
                      ' (require: ' + o.value + ') (in: ' + pathname + ')');
    }

    if (undefined === this.requires[p]) {
      this.requires[p] = {
        idx:      this.idx++,
        apiPath:  pathname.apiPath,
        source:   null
      };

      // prevent from "cyclic" loops
      this.requires[p].source = this.process(p.readSync(), p);
    }

    source = source.replace(o.value, this.requires[p].idx);
  }

  return source;
};


Requisite.prototype.bundle = function () {
  return ejs.render(TEMPLATE, this);
};


////////////////////////////////////////////////////////////////////////////////


module.exports = Requisite;
