// Final stage of runner's bootstrap. Searches for all CLI command scripts
// (`cli/*.js` files) in all applications and then executes requested command:
//
//    ./nodeca.js server
//
// will excutes `cli/server.js` command (if any).


"use strict";


/*global underscore, N*/


// stdlib
var path = require("path");


// 3rd-party
var _       = underscore;
var async   = require("async");
var fstools = require("fs-tools");
var ArgumentParser = require("argparse").ArgumentParser;


////////////////////////////////////////////////////////////////////////////////


module.exports = function (callback) {
  var commands = {}, argparser, cmdArgparsers;

  // main parser instance
  argparser = new ArgumentParser({
    version:  N.runtime.version,
    addHelp:  true,
    epilog:   "See '%(prog)s <command> --help' for " +
              "more information on specific command."
  });

  // sub-parser for commands
  cmdArgparsers = argparser.addSubparsers({
    title:    "Known commands",
    metavar:  "<command>",
    dest:     "command"
  });

  // collect cli scripts
  async.forEach(N.runtime.apps, function (app, next) {
    var cliRoot = path.join(app.root, "cli");

    fstools.walk(cliRoot, /\/[^_]\w*\.js$/, function (file, stats, nextFile) {
      var cli, cmd, argparser;

      try {
        cli       = require(file);
        cmd       = cli.commandName || path.basename(file, ".js");
        argparser = cmdArgparsers.addParser(cmd, cli.parserParameters);
      } catch (err) {
        nextFile(err);
        return;
      }

      // append command arguments
      _.each(cli.commandLineArguments || [], function (item) {
        argparser.addArgument(item.args, item.options);
      });

      // store command
      commands[cmd] = cli;

      nextFile();
    }, next);
  }, function (err) {
    var args;

    if (err) {
      callback(err);
      return;
    }

    if (_.values(commands).length === 0) {
      callback("Can't find available CLI commands. Please, check config files.");
      return;
    }

    if (0 === N.runtime.args.length) {
      argparser.printHelp();
      callback();
      return;
    }

    args = argparser.parseArgs(N.runtime.args);
    return commands[args.command].run(args, callback);
  });
};
