// Final stage of runner's bootstrap. Searches for all CLI command scripts
// (`cli/*.js` files) in all applications and then executes requested command:
//
//    ./nodeca.js server
//
// will excutes `cli/server.js` command (if any).


'use strict';


// stdlib
var path = require('path');


// 3rd-party
var _       = require('lodash');
var fstools = require('fs-tools');
var ArgumentParser = require('argparse').ArgumentParser;


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N, callback) {
  var commands = {}, argparser, cmdArgparsers;

  // main parser instance
  argparser = new ArgumentParser({
    version:  N.runtime.version,
    addHelp:  true,
    epilog:   'See \'%(prog)s <command> --help\' for ' +
              'more information on specific command.'
  });

  // sub-parser for commands
  cmdArgparsers = argparser.addSubparsers({
    title:    'Known commands',
    metavar:  '<command>',
    dest:     'command'
  });

  // collect cli scripts

  var err;

  _.forEach(N.runtime.apps, function (app) {
    var cliRoot = path.join(app.root, 'cli');

    fstools.walkSync(cliRoot, /\.js$/, function (file) {
      var cli, cmd, argparser;

      // skip:
      // - filename starts with underscore, e.g.: /foo/bar/_baz.js
      // - dirname of file starts with underscore, e.g. /foo/_bar/baz.js
      if (file.match(/(^|\/|\\)_/)) {
        return;
      }

      try {
        cli       = require(file);
        cmd       = cli.commandName || path.basename(file, '.js');
        argparser = cmdArgparsers.addParser(cmd, cli.parserParameters);
      } catch (e) {
        err = e;
        return;
      }

      // append command arguments
      _.each(cli.commandLineArguments || [], function (item) {
        argparser.addArgument(item.args, item.options);
      });

      // store command
      commands[cmd] = cli;

    });
  });

  if (err) {
    callback(err);
    return;
  }

  if (_.values(commands).length === 0) {
    callback('Can\'t find available CLI commands. Please, check config files.');
    return;
  }

  // by default (no params) - run server
  if (0 === N.runtime.args.length && commands.server) {
    N.runtime.args.unshift('server');
  }
  /*if (0 === N.runtime.args.length) {
    argparser.printHelp();
    callback();
    return;
  }*/

  var args = argparser.parseArgs(N.runtime.args);
  return commands[args.command].run(N, args, callback);
};
