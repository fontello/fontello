//
// !!! Do not sync until TWBS upgrade to 4.0 !!!
//



/*
 * Show bulb notification on wire 'notify' events
 *
 * Parameters:
 *
 *   options (String) - show text in `error` style
 *
 *   options (Object)
 *
 *   - message         - text to display (can be html)
 *   - autohide        - timeout (ms), 0 for infinite
 *   - closeable       - show close element, if set
 *   - deduplicate     - skip the same messages, if set
 *   - type            - message style 'error' (default), 'info'
 */

'use strict';


var DEFAULT_TYPE = 'error';


var DEFAULT_OPTIONS = {
  info: {
    closable: false,
    autohide: 5000,
    css:      'info'
  },
  warning: {
    closable: false,
    autohide: 5000,
    css:      'warning'
  },
  error: {
    closable: false,
    autohide: 10000,
    css:      'danger'
  }
};

// track notices for deduplication
// key - message text
var tracker = {};

function Notification(options) {
  if (!options) {
    options = {};
  } else if (typeof options === 'string') {
    options = { message: options };
  }

  if (options.deduplicate) {
    this.track_id = options.message.toString();
    var previous = tracker[this.track_id];
    if (previous) {
      // restart timeout
      clearTimeout(previous.timeout);
      previous.timeout = setTimeout($.proxy(previous.hide, previous), previous.options.autohide);
      return;
    }
  }

  var type = options.type || DEFAULT_TYPE;

  options = $.extend({}, DEFAULT_OPTIONS[type], options);

  this.options = options;
  this.isShown  = false;
  this.$element = $('<div class="alert alert-' + (DEFAULT_OPTIONS[type] || {}).css + ' fade" />');

  // get container, where to insert notice
  if (options.container) {
    this.$container  = $(options.container);
  } else {
    // Lasily create default container if not exists
    this.$container = $('.notifications');
    if (this.$container.length === 0) {
      this.$container = $('<div class="notifications" />').appendTo('body');
    }
  }

  // add close button
  if (options.closable) {
    $('<button type="button" class="close">&times;</button>')
      .click($.proxy(this.hide, this))
      .appendTo(this.$element);
  }

  // add message and inject element into the target container
  this.$element.append(options.message || '');

  // show notification
  this.show();

  if (options.autohide) {
    this.timeout = setTimeout($.proxy(this.hide, this), options.autohide);
  }
}


Notification.prototype = {
  constructor: Notification,

  show() {
    if (this.isShown) return;

    if (this.track_id) {
      tracker[this.track_id] = this;
    }

    this.isShown = true;
    this.$element
      .appendTo(this.$container)
      .addClass('in')
      .focus();
  },

  hide() {
    var self = this, timeout;

    if (!this.isShown) {
      return;
    }

    if (this.track_id) {
      delete tracker[this.track_id];
    }

    this.isShown = false;
    this.$element.removeClass('in');

    timeout = setTimeout(function () {
      self.$element.off($.support.transition.end);
      self.$element.detach();
    }, 500);

    this.$element.one($.support.transition.end, function () {
      clearTimeout(timeout);
      self.$element.detach();
    });
  }
};


N.wire.on('notify', function notification(options) {
  /*eslint-disable no-new*/
  new Notification(options);
});
