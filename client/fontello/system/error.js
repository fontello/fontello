// Handle errors:
//
// - skip if error is 'CANCELED'
// - show `RPCError`
// - log in other case
//
'use strict';


N.wire.on('error', function handle_error(err) {
  if (err === 'CANCELED') {
    return;
  }

  if (err instanceof N.io.RPCError) {
    N.wire.emit('io.error', err);
    return;
  }

  N.logger.error(err);
});
