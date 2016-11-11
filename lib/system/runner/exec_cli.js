// Final stage of runner's bootstrap. Searches for all CLI command scripts
// (`cli/*.js` files) in all applications and then executes requested command:
//
//    ./server.js server
//
// will excutes `cli/server.js` command (if any).
//
'use strict';


const path = require('path');
const glob = require('glob').sync;

const ArgumentParser = require('argparse').ArgumentParser;


////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {
  return Promise.resolve().then(() => {
    // main parser instance
    let argparser = new ArgumentParser({
      addHelp:  true,
      epilog:   'See \'%(prog)s <command> --help\' for ' +
                'more information on specific command.'
    });

    // sub-parser for commands
    let cmdArgparsers = argparser.addSubparsers({
      title:    'Known commands',
      metavar:  '<command>',
      dest:     'command'
    });

    // collect cli scripts

    let commands = {};

    N.apps.forEach(app => {
      let rootDir = path.join(app.root, 'cli');

      glob('**/*.js', {
        cwd: rootDir
      })
      .filter(name => !/^[._]|\\[._]|\/[_.]/.test(name))
      .forEach(name => {
        let cli = require(path.join(rootDir, name));
        let cmd = cli.commandName || path.parse(name).name;

        let subArgparser = cmdArgparsers.addParser(cmd, cli.parserParameters);
        let args = cli.commandLineArguments || [];

        args.forEach(item => subArgparser.addArgument(item.args, item.options));

        // store command
        commands[cmd] = cli;
      });
    });

    if (Object.keys(commands).length === 0) {
      throw new Error("Can't find available CLI commands. Please, check config files.");
    }

    // by default (no params) - run server
    if (N.args.length === 0 && commands.server) {
      N.args.unshift('server');
    }

    let args = argparser.parseArgs(N.args);

    // set process title
    process.title = 'nodeca-' + args.command;

    return commands[args.command].run(N, args);
  });
};
