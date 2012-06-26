#!/usr/bin/env node


'use strict';


// stdlib
var fs = require('fs');


// 3rd-party
var _     = require('underscore');
var jade  = require('jade');


////////////////////////////////////////////////////////////////////////////////


var cli = new (require('argparse').ArgumentParser)({addHelp: true});


cli.addArgument(['--locals'], {nargs: 1, required: false});
cli.addArgument(['--input'],  {nargs: 1, required: true});
cli.addArgument(['--output'], {nargs: 1, required: true});
cli.addArgument(['--pretty'], {action: 'storeTrue', defaultValue: false});


////////////////////////////////////////////////////////////////////////////////


var options = cli.parseArgs();
var locals  = options.locals ? require(String(options.locals)) : {};
var source  = fs.readFileSync(String(options.input), 'utf8');
var fn      = jade.compile(String(source), {
  filename: options.input, client: false, pretty: options.pretty
});
var result  = fn(_.extend({_:_}, locals));


////////////////////////////////////////////////////////////////////////////////


fs.writeFileSync(String(options.output), result);
