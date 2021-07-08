// Show wire listeners
//
'use strict';


////////////////////////////////////////////////////////////////////////////////


module.exports.parserParameters = {
  add_help:     true,
  help:         'list registeres filters',
  description:  'List registered filters'
};


module.exports.commandLineArguments = [
  {
    args:     [ '-m', '--mask' ],
    options: {
      dest:   'mask',
      help:   'Show only channels, containing MASK in name',
      type:   'str',
      default: []
    }
  },

  {
    args:     [ '-s', '--short' ],
    options: {
      dest:   'short',
      help:   'Hide details, show channel names only',
      action: 'store_true'
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

  for (let hook of N.wire.stat()) {
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
      /* eslint-disable max-depth */
      for (let h of hook.listeners) {
        let flags = [];

        if (h.ensure)   flags.push('permanent');
        if (h.parallel) flags.push('parallel');

        console.log(
          `  - [${h.priority}] ${h.name}     (cnt: ${h.ncalled})` +
          (flags.length ? '    !' + flags.join(', ') : '')
        );
      }
    }
  }

  console.log('\n');

  await N.wire.emit('exit.shutdown');
};
