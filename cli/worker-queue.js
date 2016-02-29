// Start worker (queue part)
//

'use strict';


////////////////////////////////////////////////////////////////////////////////


module.exports.parserParameters = {
  addHelp: true,
  help: 'start worker (queue)',
  description: 'Start worker (queue)'
};


module.exports.commandLineArguments = [];


////////////////////////////////////////////////////////////////////////////////

module.exports.run = function (N/*, args*/) {
  return Promise.resolve()
    .then(() => N.wire.emit('init:models', N))
    .then(() => N.wire.emit('init:bundle', N))
    .then(() => N.wire.emit('init:server.worker-queue', N));
};
