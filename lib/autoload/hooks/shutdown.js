// Shut down system when receiving 'shutdown' or 'terminate' events
//

'use strict';


module.exports = function (N) {
  N.wire.after([ 'exit.shutdown', 'exit.terminate' ], { priority: 999, ensure: true }, function process_exit(code) {
    // Delay logger shutdown until next tick, so fatal errors during shutdown
    // could still be logged
    //
    process.nextTick(() => {
      if (N.logger && N.logger.shutdown) {
        N.logger.shutdown(() => {
          process.exit(code || 0);
        });
        return;
      }

      process.exit(code || 0);
    });
  });
};
