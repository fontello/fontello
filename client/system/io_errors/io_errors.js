// automate serious errors notificating
//


'use strict';


N.wire.on('io.error', function (err) {
  switch (err.code) {
  case N.io.INVALID_CSRF_TOKEN:
    N.runtime.csrf = err.data.token;
    N.wire.emit('notify', t('invalid_csrf_token'));
    break;

  case N.io.APP_ERROR:
    N.wire.emit('notify', t('application_fuckup'));
    break;

  case N.io.ECOMMUNICATION:
    N.wire.emit('notify', t('communication_timeout'));
    break;

  default:
    if (err.message) {
      N.wire.emit('notify', t('system_error_with_message', {
        code:    err.code
      , message: err.message
      }));
    } else {
      N.wire.emit('notify', t('system_error', { code: err.code }));
    }
    break;
  }
});
