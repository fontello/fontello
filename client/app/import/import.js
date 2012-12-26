'use strict';


/*global window, $, N, t*/


////////////////////////////////////////////////////////////////////////////////


// Handles change event of file input
//
function onFileChange(event) {
  var file, reader;

  try {
    file    = (event.target.files || [])[0];
    reader  = new window.FileReader();

    // we must "reset" value of input field, otherwise Chromium will
    // not fire change event if the same file will be chosen twice, e.g.
    // import file -> made changes -> import same file
    $(event.target).val('');

    if (!file) {
      // Unexpected behavior. Should not happen in real life.
      N.emit('notify', 'error', t('error.no_config_chosen'));
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

      N.emit('import.done', {
        type: type,
        name: file.name,
        data: data
      });
    };

    reader.readAsBinaryString(file);
  } catch (err) {
    N.emit('notify', 'error', t('error.invalid_browser'));
  }
}


////////////////////////////////////////////////////////////////////////////////


module.exports.init = function () {
  $(function () {
    var $el = $('<input type="file">');

    // !!! WARNING !!!
    // Chrome does not triggers events, when element has "display: none"
    $el.css({
      visibility: 'hidden',
      position:   'absolute',
      left:       '-10000px'
    });

    // inject $el into body
    $el.appendTo('body');

    // listen input changes
    $el.on('change', onFileChange);

    // listen start import requests
    N.on('import.start', function () {
      $el.click();
    });
  });
};
