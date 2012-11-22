'use strict';


/*global window, _, $, ko, N*/


module.exports = function (file) {
  var reader = new window.FileReader();

  N.logger.debug('Import config requested', file);

  // file.type is empty on Chromium, so we allow upload anything
  // and will get real error only if JSON.parse fails

  if (!file) {
    // Unexpected behavior. Should not happen in real life.
    N.emit('notification', 'error', N.runtime.t('errors.no_config_chosen'));
    return;
  }

  reader.onload = function (event) {
    var config;

    try {
      config = JSON.parse(event.target.result);
    } catch (err) {
      N.emit('notification', 'error', N.runtime.t('errors.read_config', {
        error: (err.message || err.toString())
      }));
      return;
    }

    N.logger.debug('Config successfully parsed', config);
    N.emit('import_config', config);
  };

  reader.readAsBinaryString(file);
};
