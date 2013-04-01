'use strict';


$(function () {
  $('body').on('click.N.data-api', '[data-on-click]', function () {
    N.wire.emit($(this).data('on-click'), this);
  });
});
