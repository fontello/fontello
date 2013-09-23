// SVG Path transformations library
//
// Usage:
//
//    SvgPath('...')
//      .translate(-150, -100)
//      .scale(0.5)
//      .translate(-150, -100)
//      .toFixed(1)
//      .toString()
//

'use strict';


var _ = require('lodash');


// Class constructor
//
function SvgPath(pathString) {
  if (!(this instanceof SvgPath)) { return new SvgPath(pathString); }

  // Array of path segments.
  // Each segment is array [command, param1, param2, ...]
  this._p = this.parsePath(pathString);
}


var pathCommand = /([achlmrqstvz])[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029,]*((-?\d*\.?\d*(?:e[\-+]?\d+)?[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*,?[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*)+)/ig;
var pathValues = /(-?\d*\.?\d*(?:e[\-+]?\d+)?)[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*,?[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*/ig;
// Object with keys == absolute commands names. Simplifies names check
var absoluteCommands = _.zipObject(_.map('ACHLMRQSTVZ'.split(''), function(val) { return [ val, true ]; }));


// Parser code is shamelessly borrowed from Raphael
// https://github.com/DmitryBaranovskiy/raphael/
//
SvgPath.prototype.parsePath = function(pathString) {

  if (!pathString) { return []; }

  var data = [];
  var paramCounts = { a: 7, c: 6, h: 1, l: 2, m: 2, r: 4, q: 4, s: 4, t: 2, v: 1, z: 0 };

  pathString.replace(pathCommand, function (a, b, c) {
    var params = [],
        name = b.toLowerCase();

    c.replace(pathValues, function (a, b) {
      if (b) { params.push(+b); }
    });

    if (name === "m" && params.length > 2) {
      data.push([b].concat(params.splice(0, 2)));
      name = "l";
      b = (b === "m") ? "l" : "L";
    }

    if (name === "r") {
      data.push([b].concat(params));
    } else {

      while (params.length >= paramCounts[name]) {
        data.push([b].concat(params.splice(0, paramCounts[name])));
        if (!paramCounts[name]) {
          break;
        }
      }
    }
  });

  // First command MUST be always M or m.
  // Make it always M, to avoid unnecesary checks in translate/abs
  if (data[0][0].toLowerCase() !== 'm') {
    throw "Path MUST start woth MoveTo command";
  } else {
    data[0][0] = 'M';
  }

  return data;
};


// Convert processed SVG Path back to string
//
SvgPath.prototype.toString = function() {
  return _.flatten(this._p).join(' ')
    // Optimizations
    .replace(/ ?([achlmqrstvxz]) ?/gi, '$1')
    .replace(/ \-/g, '-');
};


// Translate coords to (x [, y])
//
SvgPath.prototype.translate = function(x, y) {
  var p = this._p;

  y = y || 0;

  p.forEach(function(segment) {

    var cmd = segment[0];

    // Shift coords only for commands with absolute values
    if (!_.has(absoluteCommands, cmd)) { return; }

    var name   = cmd.toLowerCase();

    // H is the only command, with shifted coords parity
    if (name === 'h') {
      segment[1] += y;
      return;
    }

    // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
    // touch x,y only
    if (name === 'a') {
      segment[6] += x;
      segment[7] += y;
      return;
    }

    // All other commands have [cmd, x1, y1, x2, y2, x3, y3, ...] format
    segment.forEach(function(val, i) {
      if (!i) { return; } // skip command
      segment[i] = i % 2 ? val + x : val + y;
    });
  });

  return this;
};


// Scale coords to (sx [, sy])
// sy = sx if not defined
//
SvgPath.prototype.scale = function(sx, sy) {
  var p = this._p;

  sy = (!sy && (sy !== 0)) ? sx : sy;

  p.forEach(function(segment) {

    var name   = segment[0].toLowerCase();

    // H & h are the only command, with shifted coords parity
    if (name === 'h') {
      segment[1] *= sy;
      return;
    }

    // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
    // touch rx, ry, x,y only
    if (name === 'a') {
      segment[1] *= sx;
      segment[2] *= sy;
      segment[6] *= sx;
      segment[7] *= sy;
      return;
    }

    // All other commands have [cmd, x1, y1, x2, y2, x3, y3, ...] format
    segment.forEach(function(val, i) {
      if (!i) { return; } // skip command
      segment[i] *= i % 2 ? sx : sy;
    });
  });

  return this;
};


// Round coords with given decimal precition.
// 0 by default (to integers)
//
SvgPath.prototype.toFixed = function(d) {
  var p = this._p;

  d = d || 0;

  p.forEach(function(segment) {

    // Special processing for ARC:
    // [cmd, rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
    // don't touch flags and rotation
    if (segment[0].toLowerCase() === 'a') {
      segment[1] = segment[1].toFixed(d);
      segment[2] = segment[2].toFixed(d);
      segment[6] = segment[6].toFixed(d);
      segment[7] = segment[7].toFixed(d);
      return;
    }

    segment.forEach(function(val, i) {
      if (!i) { return; }
      segment[i] = +segment[i].toFixed(d);
    });

  });

  return this;
};


module.exports = SvgPath;