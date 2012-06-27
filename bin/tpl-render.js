#!/usr/bin/env node


'use strict';


// stdlib
var fs = require('fs');


// 3rd-party
var _     = require('underscore');
var jade  = require('jade');


////////////////////////////////////////////////////////////////////////////////


var options = (function (cli) {
  cli.addArgument(['--locals'], {action: 'store', required: false});
  cli.addArgument(['--output'], {action: 'store', required: true});
  cli.addArgument(['--input'],  {action: 'store', required: true, dest: 'filename'});
  cli.addArgument(['--pretty'], {action: 'storeTrue', defaultValue: false});

  return cli.parseArgs();
}(new (require('argparse').ArgumentParser)));


////////////////////////////////////////////////////////////////////////////////


var jade_filters = require('jade/lib/filters');

jade_filters.stylus_nowrap = function(str, options){
  var ret;
  str = str.replace(/\\n/g, '\n');
  var stylus = require('stylus');
  stylus(str, options).render(function(err, css){
    if (err) throw err;
    ret = css.replace(/\n/g, '\\n');
  });
  return ret; 
}


////////////////////////////////////////////////////////////////////////////////

var locals  = options.locals ? require(options.locals) : {};
var source  = fs.readFileSync(options.filename, 'utf8');
var result  = jade.compile(source, options)(_.extend({
  _: _,
  unichr: function unichr(code) {
    /*jshint bitwise: false*/
    if (code > 0xffff) {
      code -= 0x10000;
      var surrogate1 = 0xd800 + (code >> 10),
          surrogate2 = 0xdc00 + (code & 0x3ff);
      return String.fromCharCode(surrogate1, surrogate2);
    } else {
      return String.fromCharCode(code);
    }
  }
}, locals));


////////////////////////////////////////////////////////////////////////////////


fs.writeFileSync(options.output, result);
