// automate serious errors notificating
//


'use strict';


N.wire.on('io.error', function (err) {
  if (N.io.INVALID_CSRF_TOKEN === err.code) {
    N.runtime.csrf = err.data.token;
    N.wire.emit('notify', t('invalid_csrf_token'));

  } else if (N.io.APP_ERROR === err.code) {
    N.wire.emit('notify', t('application_fuckup'));

  } else if (N.io.ECOMMUNICATION === err.code) {
    N.wire.emit('notify', t('communication_timeout'));
  }
});
