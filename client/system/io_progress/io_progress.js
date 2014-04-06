/**
 *  Assigns rpc before/after request handlers showing/hiding "loading" notice.
 **/


'use strict';


var timeout;
var $notice;


function hide() {
  clearTimeout(timeout);

  if ($notice) {
    // $notice might not be yet initialized when request
    // succeded BEFORE the notification show()
    $notice.hide();
  }
}


function show(message) {
  clearTimeout(timeout);

  if (!$notice) {
    $notice = $(N.runtime.render(module.apiPath));
    $notice.appendTo('body').find('.close').click(hide);
  }

  $notice.find('.message').html(message);
  $notice.show();
}


N.wire.on('io.complete', hide);

N.wire.on('io.request', function () {
  clearTimeout(timeout);

  // schedule showing new message in next 500 ms
  timeout = setTimeout(function () {
    show(t('loading'));
  }, 500);
});

N.wire.on('io.error', function (err) {
  if (N.io.EWRONGVER === err.code) {
    show(t('version_mismatch'));
  }
});
