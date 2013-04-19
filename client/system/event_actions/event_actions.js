/**
 *  Assigns handlers/listeners for `[data-action]` links.
 *
 *  Actions associated with a link will be invoked via Wire with the jQuery
 *  event object as an argument.
 **/


'use strict';


function handleAction(apiPath, event) {
  N.loader.loadAssets(apiPath.split('.')[0], function () {
    if (N.wire.has(apiPath)) {
      N.wire.emit(apiPath, event);
    } else {
      N.logger.error('Unknown client Wire channel: %s', apiPath);
    }
  });

  event.preventDefault();
}


N.wire.once('navigate.done', function () {
  $(document).on('click.nodeca.data-api', '[data-on-click]', function (event) {
    var apiPath = $(this).data('onClick');
    handleAction(apiPath, event);
  });

  $(document).on('submit.nodeca.data-api', '[data-on-submit]', function (event) {
    var apiPath = $(this).data('onSubmit');
    handleAction(apiPath, event);
  });

  $(document).on('input.nodeca.data-api', '[data-on-input]', function (event) {
    var apiPath = $(this).data('onInput');
    handleAction(apiPath, event);
  });

  $(document).on('change.nodeca.data-api', '[data-on-change]', function (event) {
    var apiPath = $(this).data('onChange');
    handleAction(apiPath, event);
  });
});
