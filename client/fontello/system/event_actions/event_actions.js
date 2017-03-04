/**
 *  Assigns handlers/listeners for `[data-action]` links.
 *
 *  Actions associated with a link will be invoked via Wire with the jQuery
 *  event object as an argument.
 **/


'use strict';


// Emits specified event
//
// data - event payload
//
function handleAction(apiPath, data) {
  if (N.wire.has(apiPath)) {
    N.wire.emit(apiPath, data)
      .catch(err => N.wire.emit('error', err));
  } else {
    N.logger.error('Unknown client Wire channel: %s', apiPath);
  }
}


N.wire.once('navigate.done', function () {

  $(document).on('dragenter dragleave dragover drop', '[data-on-dragdrop]', function (event) {
    var data = {
      event,
      $this: $(this)
    };
    var apiPath = data.$this.data('onDragdrop');

    // We should call `dataTransfer.files` getter before `event.preventDefault()`
    // otherwise after next tick `dataTransfer.files` will be empty in firefox
    if (data.event.originalEvent.dataTransfer && data.event.originalEvent.dataTransfer.files) {
      data.files = data.event.originalEvent.dataTransfer.files;
    }

    handleAction(apiPath, data);
    event.preventDefault();
  });

  $(document).on('click', '[data-on-click]', function (event) {
    var data = {
      event,
      $this: $(this)
    };
    var apiPath = data.$this.data('onClick');

    handleAction(apiPath, data);
    event.preventDefault();
  });

  $(document).on('submit', '[data-on-submit]', function (event) {
    var data = {
      event,
      $this: $(this),
      fields: {}
    };
    var apiPath = data.$this.data('onSubmit');

    // Fill fields
    $.each(data.$this.serializeArray(), function () {
      data.fields[this.name] = this.value;
    });

    handleAction(apiPath, data);
    event.preventDefault();
  });

  $(document).on('input', '[data-on-input]', function (event) {
    var data = {
      event,
      $this: $(this)
    };
    var apiPath = data.$this.data('onInput');

    handleAction(apiPath, data);
    event.preventDefault();
  });

  $(document).on('change', '[data-on-change]', function (event) {
    var data = {
      event,
      $this: $(this)
    };
    var apiPath = data.$this.data('onChange');

    handleAction(apiPath, data);
    event.preventDefault();
  });


  // Whenever a key is pressed, this function:
  //
  //  1. traverses DOM up to the root and executes respective wire functions
  //     defined in `data-keymap` attributes (stops at `data-keymap-reset`)
  //
  //  2. when the top-level is reached, it executes a wire function defined
  //     in #content[data-keymap] (this allows pages to define local
  //     shortcuts in their layout
  //
  //  3. after that, if nothing stops event propagation,
  //     `event.keypress.escape` event is emitted if the key is ESC
  //
  $(document).on('keydown', 'html, [data-keymap], [data-keymap-reset]', function (event) {
    // Prevent shortcuts from triggering inside text areas, unless keymap-reset
    // flag is specified, this function is similar to:
    // https://craig.is/killing/mice#api.stopCallback
    //
    if (event.target !== this) {
      var target = event.target;

      if (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          (target.contentEditable && target.contentEditable === 'true') ||
          $(target).hasClass('modal') ||
          $(target).parents('.modal').length) {

        if ($(target).data('keymap-reset') !== false) return;
      }
    }

    // #content(data-keymap) is delegated to html tag,
    // so exclude it from normal propagation chain to avoid double calls
    if ($(this).attr('id') === 'content') return;

    var code_to_text = {
      8: 'backspace',
      9: 'tab',
      13: 'enter',
      16: 'shift',
      17: 'ctrl',
      18: 'alt',
      20: 'capslock',
      27: 'escape',
      32: 'space',
      33: 'pageup',
      34: 'pagedown',
      35: 'end',
      36: 'home',
      37: 'left',
      38: 'up',
      39: 'right',
      40: 'down',
      45: 'insert',
      46: 'delete',
      91: 'meta',
      93: 'meta',
      224: 'meta'
    };

    var data = {
      // handlers can set it to "true" to allow default browser behavior
      allow_default:     false,

      // handlers can set it to "true" to allow other handlers to invoke
      allow_propagation: false,

      event,
      $this:             $(this)
    };

    var key;

    if (code_to_text[event.which]) {
      key = code_to_text[event.which];
    } else {
      key = String.fromCharCode(event.which).toLowerCase();
    }

    if (event.ctrlKey && key !== 'ctrl')   key = 'ctrl+' + key;
    if (event.altKey && key !== 'alt')     key = 'alt+' + key;
    if (event.shiftKey && key !== 'shift') key = 'shift+' + key;
    if (event.metaKey && key !== 'meta')   key = 'meta+' + key;

    var map;

    if (this.tagName === 'HTML') {
      // use #content keymap instead of html's own keymap,
      // this allows pages to specify shortcuts in their layout
      //
      map = $('#content').data('keymap');
    } else {
      map = data.$this.data('keymap');
    }

    if (map && Object.prototype.hasOwnProperty.call(map, key)) {
      var apiPath = map[key];

      handleAction(apiPath, data);
    } else {
      var reset = data.$this.data('keymap-reset');

      // allow both `<div data-keymap-reset>` and `<div data-keymap-reset=true>`
      data.allow_propagation = !(reset || reset === '');
      data.allow_default     = true;
    }

    // emit special event for pressing ESC key
    if (this.tagName === 'HTML' && data.allow_propagation && key === 'escape') {
      handleAction('event.keypress.escape', data);
    }

    if (!data.allow_default)     event.preventDefault();
    if (!data.allow_propagation) event.stopPropagation();
  });
});
