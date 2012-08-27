;(function ($) {
  'use strict';


  function InplaceEditor(el, options) {
    var self = this;

    this.$el      = $(el);
    this.options  = options;

    this.$el.on('click', function () {
      self.activate();
    });

    this.$el.on('blur', function () {
      self.deactivate();
    });

    if (options.validateChar) {
      this.isValidChar = function (char) {
        return options.validateChar.call(this, char);
      };
    }

    if (options.filterValue) {
      this.update = function (value) {
        var clean = options.filterValue.call(this, value);

        if (value !== clean) {
          this.setValue(clean);
        }
      }
    }
  }


  InplaceEditor.prototype.activate = function () {
    var self = this;

    if (!!this.activated) {
      return;
    }

    this.initialValue = this.getValue();
    this.lastChar     = null;
    this.activated    = true;

    //
    // Handle paste event
    //

    this.$el.on('paste.inplaceEditor', function (event) {
      if (self.options.noPaste) {
        event.stopImmediatePropagation();
        return false;
      }

      setTimeout(function () {
        self.update(self.getValue());
      }, 0);
    });

    //
    // Listen for any keystrokes (used for chars filtration)
    //

    this.$el.on('keypress.inplaceEditor', function (event) {
      var char = String.fromCharCode(event.charCode);

      // ENTER
      if (13 === event.keyCode) {
        self.deactivate();
        return;
      }

      // Validate incoming character
      if (event.which !== 0 && event.charCode !== 0) {
        if (false === self.isValidChar(char)) {
          // char fails validation
          event.stopImmediatePropagation();
          return false;
        }

        self.update(self.getValue());
        self.lastChar = char;
      }
    });

    //
    // Listen for ESCape
    //

    this.$el.on('keyup.inplaceEditor', function (event) {
      // ESC
      if (27 === event.keyCode) {
        event.stopImmediatePropagation();
        self.setValue(self.initialValue);
        self.deactivate();
        return false;
      }
    });

    //
    // Focus on enabled input
    //

    this.$el.attr('contenteditable', true).focus();
  };


  InplaceEditor.prototype.deactivate = function () {
    var value;

    if (!this.activated) {
      return;
    }

    this.activated = false;

    this.$el.off('.inplaceEditor');
    this.$el.attr('contenteditable', false);

    // run filters on exit
    this.update(this.getValue());

    // get new value ONLY after update()
    value = this.getValue();

    if (!value) {
      // we do not allow empty values -
      // and reset them to the initial state
      this.setValue(this.initialValue);
    } else if (this.initialValue !== value) {
      // notify about value change only in case
      // of actual changes
      this.$el.trigger('change', [value]);
    }

    this.$el.blur();
  };


  InplaceEditor.prototype.setValue = function setValue(val) {
    this.$el.text($('<div>' + val + '</div>').text());
  };


  InplaceEditor.prototype.getValue = function getValue() {
    return this.$el.text();
  };


  // By default isValidChar does nothing
  InplaceEditor.prototype.isValidChar = $.noop;


  // By default update does nothing
  InplaceEditor.prototype.update = $.noop;


  $.fn.inplaceEditor = function (options) {
    return this.each(function () {
      var $this   = $(this),
          data    = $this.data('inplaceEditor');

      if (!data) {
        return $this.data('inplaceEditor', new InplaceEditor(this, options));
      }
    });
  };
}(jQuery));
