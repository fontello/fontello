'use strict';


// starts download of the result font
//
function injectDownloadUrl(id) {
  var url = N.runtime.router.linkTo('fontello.font.download', { id: id });

  $('iframe#' + id).remove();

  $('<iframe></iframe>')
    .attr({ id: id, src: url })
    .css('display', 'none')
    .appendTo(window.document.body);
}


function startBuilder(config) {
  N.logger.debug('About to build font', config);

  N.wire.emit('notify', {
    type:        'info'
  , message:     t('help_us')
  , autohide:    10000 // 10 secs
  , deduplicate: true
  , closable:    true
  });
  
  N.wire.emit('build.started');

  N.io.rpc('fontello.font.generate', config, function (err, response) {
    if (err) {
      N.wire.emit('notify', t('errors.fatal', {
        error: err.message || (err.code ? 'ERR' + err.code : 'Unexpected error')
      }));

      N.wire.emit('build.finished');
      return;
    }

    injectDownloadUrl(response.data.id);
    N.wire.emit('build.finished');
  });
}


N.wire.on('build_font', function () {
  if (!N.app.fontsList.selectedCount()) {
    return;
  }

  startBuilder(N.app.getConfig());
});
