// automate serious errors notificating
//


'use strict';


N.wire.on('io.error', function io_err_init(err) {
  switch (err.code) {
    case N.io.INVALID_CSRF_TOKEN:
      N.runtime.token_csrf = err.data.token;
      N.wire.emit('notify', t('invalid_csrf_token'));
      break;

    case N.io.APP_ERROR:
      N.wire.emit('notify', err.message || t('application_fuckup'));
      break;

    case N.io.ECOMMUNICATION:
      N.wire.emit('notify', {
        message:     t('communication_timeout'),
        deduplicate: true
      });
      break;

    case N.io.EWRONGVER:
      N.wire.emit('io.version_mismatch', err.hash);
      break;

    default:
      if (err.message) {
        N.wire.emit('notify', err.message);
      } else {
        N.wire.emit('notify', t('system_error', { code: err.code }));
      }
      break;
  }
});
