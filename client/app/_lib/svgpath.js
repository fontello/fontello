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

  return data;
};


// Convert processed SVG Path back to string
//
SvgPath.prototype.toString = function() {
  return _.flatten(this._p).join(' ')
    // Optimizations
    .replace(/ ?([achlmqrstvxz]) ?/gi, '')
    .replace(/ \-/g, '-');
};


// Translate coords to (x [, y])
//
SvgPath.prototype.translate = function(x, y) {
  var p = this._p;

  y = y || 0;

  p.forEach(function(segment, idx) {

    var cmd = segment[0];

    // Shift coords only for commands with absolute values
    if (!/[ACHLMRQSTVZ]/.test(cmd)) { return; }

    var name   = cmd.toLowerCase();

    // H is the only command, with shifted coords parity
    if (name === 'h') {
      p[idx][1] += y;
      return;
    }

    // ARC params are: [rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
    // touch x,y only
    if (name === 'a') {
      p[idx][6] += x;
      p[idx][7] += y;
      return;
    }

    var params = segment.slice(1);

    // All other commands have [x1, y1, x2, y2, x3, y3, ...] format
    params.forEach(function(val, i) {
      params[i] = i % 2 ? val + x : val + y;
    });

    p[idx] = [name].concat(params);
  });

  return this;
};


// Scale coords to (sx [, sy])
// sy = sx if not defined
//
SvgPath.prototype.scale = function(sx, sy) {
  var p = this._p;

  sy = (!sy && (sy !== 0)) ? sx : sy;

  p.forEach(function(segment, idx) {

    var cmd    = segment[0];
    var name   = cmd.toLowerCase();

    // H & h are the only command, with shifted coords parity
    if (name === 'h') {
      p[idx][1] *= sy;
      return;
    }

    // ARC params are: [rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
    // touch rx, ry, x,y only
    if (name === 'a') {
      p[idx][1] *= sx;
      p[idx][2] *= sy;
      p[idx][6] *= sx;
      p[idx][7] *= sy;
      return;
    }

    var params = segment.slice(1);

    // All other commands have [x1, y1, x2, y2, x3, y3, ...] format
    params.forEach(function(val, i) {
      params[i] = i % 2 ? val * sx : val * sy;
    });

    p[idx] = [cmd].concat(params);
  });

  return this;
};



// Round coords with given decimal precition.
// 0 by default (to integers)
//
SvgPath.prototype.toFixed = function(d) {
  var p = this._p;

  d = d || 0;

  p.forEach(function(segment, idx) {

    // Special processing for ARC:
    // [rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
    // don't touch flags and rotation
    if (segment[0].toLowerCase() === 'a') {
      p[idx][1] = p[idx][1].toFixed(d);
      p[idx][2] = p[idx][2].toFixed(d);
      p[idx][6] = p[idx][6].toFixed(d);
      p[idx][7] = p[idx][7].toFixed(d);
      return;
    }

    segment.forEach(function(val, i) {
      if (i === 0) { return; }
      p[idx][i] = p[idx][i].toFixed(d);
    });

  });

  return this;
};



module.exports = SvgPath;