// Show / apply seeds
//

"use strict";


// stdlib
var path  = require('path');
var fs    = require('fs');


// 3rd-party
var async   = require("async");
var fstools = require("fs-tools");


////////////////////////////////////////////////////////////////////////////////


var SEEDS_DIR = 'db/seeds';


////////////////////////////////////////////////////////////////////////////////


function seed_run(N, app_name, seed_path, callback) {
  console.log('Applying seed...\n');

  require(seed_path)(N, function (err) {
    var prefix = '  ' + app_name + ':' + path.basename(seed_path) + ' -- ';

    if (err) {
      console.log(prefix + 'failed');
      callback(err);
      return;
    }

    console.log(prefix + 'success');
    process.exit(0);
  });
}

module.exports.parserParameters = {
  addHelp: true,
  description: 'That will run `.<app_name>/db/seeds/<seed_name>.js` if exists. ' +
    'Or, all seeds from `./db/seeds/seed-name/` folder. If <seed-name>' +
    'missed, then script will show all available seeds for given app. ' +
    'If `-a` missed, then all seed for all apps will be shown.',
  epilog : 'Note: Loading seeds is limited to development/test enviroment. ' +
    'If you really need to run seed  on production/stageing, use ' +
    'option -f.',
  help: 'show or run existing seeds'
};

module.exports.commandLineArguments = [
  {
    args: ['-f'],
    options: {
      help: 'force run without env checking',
      action: 'storeTrue'
    }
  },
  {
    args: ['-a', '--app'],
    options: {
      help: 'application name',
      type: 'string'
    }
  },
  {
    args: ['-n'],
    options: {
      metavar: 'SEED_NUMBER',
      dest: 'number',
      help: 'run seed by number',
      type: 'int'
    }
  },
  {
    args: ['seed'],
    options: {
      metavar: 'SEED_NAME',
      help: 'seed name',
      nargs: '?',
      defaultValue: null
    }
  },
];

module.exports.run = function (N, args, callback) {
  var app_name = args.app;
  var seed_name = args.seed;
  var seed_pos =  args.number ? args.number - 1 : -1;

  function get_app_path(app_name) {
    for (var i = 0; i < N.runtime.apps.length; i++) {
      if (app_name === N.runtime.apps[i].name) {
        return N.runtime.apps[i].root;
      }
    }
    return null;
  }

  N.wire.emit([
      'init:models'
    ], N,

    function (err) {
      if (err) {
        callback(err);
        return;
      }

      // execute seed by name
      if (!!app_name && !!seed_name) {
        var env = N.runtime.env;
        if ('development' !== env && 'testing' !== env && !args.force) {
          console.log('Error: Can\'t run seed from ' + env + ' enviroment. Please, use -f to force.');
          process.exit(1);
        }

        var seed_path = path.join(get_app_path(app_name), SEEDS_DIR, seed_name);
        if (!fs.existsSync(seed_path)) {
          console.log('Error: Application "' + app_name + '"does not have "' + seed_name);
          process.exit(1);
        }

        seed_run(N, app_name, seed_path, callback);
      }
      else {
        var apps;
        if (app_name) {
          apps = [{name: app_name, root: get_app_path(app_name)}];
        }
        else {
          apps = N.runtime.apps;
        }

        // collect seeds
        var seed_list = [];
        async.forEachSeries(apps, function (app, next_app) {
          var seed_dir = path.join(app.root, SEEDS_DIR);
          fstools.walk(seed_dir, /\.js$/, function (file, stats, next_file) {
            // skip files when
            // - filename starts with _, e.g.: /foo/bar/_baz.js
            // - dirname in path starts _, e.g. /foo/_bar/baz.js
            if (file.match(/(^|\/|\\)_/)) {
              next_file();
              return;
            }

            seed_list.push({
              name: app.name,
              seed_path: file
            });
            next_file();
          }, next_app);
        }, function (err) {
          if (err) {
            callback(err);
            return;
          }

          if (!!args.number && seed_list[seed_pos]) {
            // execute seed by number
            seed_run(N, seed_list[seed_pos].name, seed_list[seed_pos].seed_path, callback);
          } else {
            // display seed list
            if (!!args.number) {
              console.log(args.number + ' seed not found\n');
            }

            console.log('Available seeds:\n');

            for (var i = 0; i < seed_list.length; i++) {
              console.log('  ' + (i + 1) + '. ' + seed_list[i].name + ': ' + path.basename(seed_list[i].seed_path));
            }

            console.log('\nSeeds are shown in `<APP>: <SEED_NAME>` form.');
            console.log('See `seed --help` for details');
            process.exit(0);
          }
        });
      }
    }
  );
};
