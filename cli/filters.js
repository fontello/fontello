// Show wire listeners
//
'use strict';


const _       = require('lodash');


////////////////////////////////////////////////////////////////////////////////


module.exports.parserParameters = {
  addHelp:      true,
  help:         'list registeres filters',
  description:  'List registered filters'
};


module.exports.commandLineArguments = [
  {
    args:     [ '-m', '--mask' ],
    options: {
      dest:   'mask',
      help:   'Show only channels, containing MASK in name',
      type:   'string',
      defaultValue: []
    }
  },

  {
    args:     [ '-s', '--short' ],
    options: {
      dest:   'short',
      help:   'Hide details, show channel names only',
      action: 'storeTrue'
    }
  }

];


module.exports.run = async function (N, args) {

  // Reduce log level
  N.logger.setLevel('info');

  await Promise.resolve()
    .then(() => N.wire.emit('init:models', N))
    .then(() => N.wire.emit('init:bundle', N))
    .then(() => N.wire.emit('init:services', N));

  /*eslint-disable no-console*/
  console.log('\n');

  _.forEach(N.wire.stat(), function (hook) {
    // try to filter by pattern, if set
    if (args.mask && (hook.name.indexOf(args.mask) === -1)) {
      return;
    }

    if (args.short) {
      // short formst
      console.log(`- ${hook.name}`);
    } else {
      // long format
      console.log(`\n${hook.name} -->\n`);
      _.forEach(hook.listeners, function (h) {
        let flags = [];

        if (h.ensure)   flags.push('permanent');
        if (h.parallel) flags.push('parallel');

        console.log(
          `  - [${h.priority}] ${h.name}     (cnt: ${h.ncalled})` +
          (flags.length ? '    !' + flags.join(', ') : '')
        );
      });
    }
  });

  console.log('\n');

  await N.wire.emit('exit.shutdown');
};
