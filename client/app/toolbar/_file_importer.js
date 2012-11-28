'use strict';


/*global window, _, $, N*/


N.on('import_file', function (file) {
  if ('application/json' === file.type && _.isObject(file.data)) {
    N.emit('import_config', file.data);
  }
});


// Handles change event of file input
//
module.exports = function (data, event) {
  var
  file    = (event.target.files || [])[0],
  reader  = new window.FileReader();

  // we must "reset" value of input field, otherwise Chromium will
  // not fire change event if the same file will be chosen twice, e.g.
  // import file -> made changes -> import same file
  $(event.target).val('');

  if (!file) {
    // Unexpected behavior. Should not happen in real life.
    N.emit('notification', 'error', N.runtime.t('errors.no_config_chosen'));
    return;
  }

  reader.onload = function (event) {
    var
    data = event.target.result,
    type = file.type;

    // Chromium omits type on JSON files, so if type is JSON, or
    // it's not specified, we are parsing data and set json type
    // on success
    if (!type  || /\/json$/.test(type)) {
      try {
        data = JSON.parse(data);
        type = 'application/json';
      } catch (err) {
        // do nothing
      }
    }

    N.emit('import_file', {
      type: type,
      name: file.name,
      data: data
    });
  };

  reader.readAsBinaryString(file);
};
