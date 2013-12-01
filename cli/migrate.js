// Show / run migrations
//

'use strict';


var async = require('async');


////////////////////////////////////////////////////////////////////////////////


//exports.commandName       = 'migrate';
exports.parserParameters  = {
  addHelp:      true,
  help:         'run migrations',
  description:  'Without args show new migrations. With ' +
                ' `--all` run all migrations.'
};

module.exports.commandLineArguments = [
  {
    args: ['--all'],
    options: {
      help:   'run all migrations',
      action: 'storeTrue'
    }
  }
];

module.exports.run = function (N, args, callback) {

  N.wire.skip('init:models', 'migrations_check');

  N.wire.emit([
      'init:models'
    ], N,

    function (err) {
      if (err) {
        callback(err);
        return;
      }

      var Migration = N.models.Migration;

      // fetch used migrations from db
      Migration.getLastState(function (err, currentMigrations) {
        var outstandingMigrations;

        if (err) {
          callback(err);
          return;
        }

        outstandingMigrations = Migration.checkMigrations(N, currentMigrations);

        if (0 === outstandingMigrations.length) {
          console.log(args.all  ? 'Already up-to-date.'
                                : 'You have no outstanding migrations');
          process.exit(0);
        }

        function formatMigrationTitle(migration) {
          return migration.appName + ':' + migration.step;
        }

        if (!args.all) {
          console.log('You have ' + outstandingMigrations.length +
                      ' outstanding migration(s):\n');

          outstandingMigrations.forEach(function (migration) {
            console.log('  ' + formatMigrationTitle(migration));
          });

          console.log('\nRun `migrate` command with `--all` to apply them.');
          process.exit(0);
        }

        console.log('Applying ' + outstandingMigrations.length +
                    ' outstanding migration(s):\n');

        async.forEachSeries(outstandingMigrations, function (migration, next) {
          var up;

          process.stdout.write('  ' + formatMigrationTitle(migration) + ' ... ');

          try {
            up = require(migration.filename).up;
          } catch (err) {
            console.log('FAILED');
            next(err);
            return;
          }

          up(N, function (err) {
            if (err) {
              console.log('FAILED');
              next(err);
              return;
            }

            // All ok. Write step to db
            Migration.markPassed(migration.appName, migration.step, function (err) {
              console.log(err ? 'FAILED' : 'OK');
              next(err);
            });
          });
        }, function (err) {
          if (err) {
            callback(err);
            return;
          }

          process.exit(0);
        });
      });
    }
  );
};
