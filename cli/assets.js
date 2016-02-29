// Start server
//

'use strict';


////////////////////////////////////////////////////////////////////////////////


module.exports.parserParameters = {
  addHelp:      true,
  help:         'compile assets',
  description:  'Compile assets'
};


module.exports.commandLineArguments = [];

module.exports.run = function (N/*, args*/) {
  return Promise.resolve()
    .then(() => N.wire.emit('init:models', N))
    .then(() => N.wire.emit('init:bundle', N))
    .then(() => N.wire.emit('exit.shutdown'));
};
