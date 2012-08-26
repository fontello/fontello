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

    if (options.filter) {
      this.update = function () {
        var orig = this.getValue(), clean = options.filter(orig);
        if (orig !== clean) {
          this.setValue(clean);
        }
      }
    }

    if (options.throttle && _) {
      this._update = this.update;
      this.update = _.throttle(function () {
        self._update();
      }, options.throttle);
    }
  }


  InplaceEditor.prototype.activate = function () {
    var self = this;

    if (!!this.activated) {
      return;
    }

    this.value      = this.getValue();
    this.activated  = true;

    this.$el.on('paste.inplaceEditor, keypress.inplaceEditor, keyup.inplaceEditor', function (event) {
      // ENTER
      if (13 === event.keyCode) {
        self.update()
        self.deactivate();
        return;
      }

      // ESC
      if (27 === event.keyCode) {
        // **NOTICE** Firefox does not fires this event by some reasone
        self.setValue(self.value);
        self.deactivate();
      }

      self.update();
    });

    this.$el.attr('contenteditable', true).focus();
  };


  InplaceEditor.prototype.deactivate = function () {
    var value = this.getValue();

    if (!this.activated) {
      return;
    }

    this.activated = false;

    this.$el.off('.inplaceEditor');
    this.$el.attr('contenteditable', false);

    if (this.value !== value) {
      if (!value && !this.options.allowEmpty) {
        this.setValue(this.value);
      } else {
        this.$el.trigger('change', [this.getValue()]);
      }
    }

    this.$el.blur();
  };


  InplaceEditor.prototype.setValue = function setValue(val) {
    this.$el['html' === this.options.type ? 'html' : 'text'](val);
  };


  InplaceEditor.prototype.getValue = function getValue() {
    return this.$el['html' === this.options.type ? 'html' : 'text']();
  };


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
