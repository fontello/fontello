'use strict';


// ## NOTE ################################################################ //
//                                                                          //
// History.js works poorly with URLs containing hashes:                     //
//                                                                          //
//    https://github.com/browserstate/history.js/issues/111                 //
//    https://github.com/browserstate/history.js/issues/173                 //
//                                                                          //
// So upon clicks on `/foo#bar` we treat URL and push it to the state as    //
// `/foo` and saving `bar` in the state data, so we could scroll to desired //
// element upon statechange                                                 //
//                                                                          //
// ######################################################################## //


var _ = require('lodash');


var History = window.History; // History.js


// Takes a params hash (can be nested) and tries to parse each string-value as
// number or boolean. Returns a new hash with parsed values.
//
function castParamTypes(inputValue) {
  var parsedValue;

  if (_.isArray(inputValue)) {
    return _.map(inputValue, castParamTypes);

  } else if (_.isObject(inputValue)) {
    parsedValue = {};

    _.forEach(inputValue, function (value, key) {
      parsedValue[key] = castParamTypes(value);
    });

    return parsedValue;

  } else if ('true' === inputValue) {
    return true;

  } else if ('false' === inputValue) {
    return false;

  } else if (/^[0-9\.\-]+$/.test(inputValue)) {
    parsedValue = Number(inputValue);
    return String(parsedValue) === inputValue ? parsedValue : inputValue;

  } else {
    return inputValue;
  }
}


// Returns a normalized URL:
//
//  http://example.com/foo.html  => http://example.com/foo.html
//  /foo.html                    => http://example.com/foo.html
//  //example.com/foo.html       => http://example.com/foo.html
//
function normalizeURL(url) {
  var a = document.createElement('a');
  a.href = url;
  return a.href.toString();
}


// Default renderer for `navigate.to` event.
// Used to render content when user clicks a link.
//
function renderNewContent(data, callback) {
  var content = $(N.runtime.render(data.view, data.locals, {
    apiPath: data.apiPath
  })).hide();

  $('#content').fadeOut('fast', function () {
    var offset = data.anchor ? $(data.anchor).offset() : null;

    $(this).replaceWith(content);
    content.fadeIn('fast');

    // To scroll window:
    // - WebKit-based browsers and the quirks mode use `body` element.
    // - Other browsers use `html` element.
    $('html:not(:animated), body:not(:animated)').animate({
      scrollTop:  offset ? offset.top  : 0
    , scrollLeft: offset ? offset.left : 0
    }, 300);

    callback();
  });
}


// Used to render content when user presses Back/Forward buttons.
//
function renderFromHistory(data, callback) {
  var content = $(N.runtime.render(data.view, data.locals, {
    apiPath: data.apiPath
  })).hide();

  $('#content').fadeOut('fast', function () {
    $(this).replaceWith(content);
    content.fadeIn('fast');
    callback();
  });
}


// Reference to a function to be used on next fire of history 'statechange' event
// to perform content injection/replacement.
//
// NOTE: The event handler *always* resets this variable to `renderFromHistory`
// after each call.
var __renderCallback__ = renderFromHistory;


// Reference to a function to be used by history 'statechange' handler after
// content rendering is done.
//
// NOTE: The event handler *always* resets this variable to null after each call.
var __completeCallback__ = null;


// API path of current page. Updated via `navigate.done` event.
var __currentApiPath__ = null;


// Performs RPC navigation to the specified page. Allowed options:
//
//    options.href
//    options.apiPath
//    options.params
//    options.render       - optional function; default is `renderNewContent`
//    options.replaceState - `true` to use `History.replaceState` instead of
//                           `History.pushState`
//
// `href` and `apiPath` parameters are calculated from each other.
// So they are mutually exclusive.
//
N.wire.on('navigate.to', function navigate_to(options, callback) {
  var match, href, anchor, apiPath, params, errorReport;

  if ('string' === typeof options) {
    options = { href: options };
  }

  if (options.href) {
    match = N.runtime.router.match(options.href);

    // It's an external link or 404 error if route is not matched. So perform
    // regular page requesting via HTTP.
    if (!match) {
      window.location = normalizeURL(options.href);
      callback();
      return;
    }

    match.params = castParamTypes(match.params);

    apiPath = match.meta;
    params  = match.params || {};
    href    = options.href.split('#')[0];
    anchor  = options.href.split('#')[1] || '';

  } else if (options.apiPath) {
    apiPath = options.apiPath;
    params  = options.params || {};
    href    = N.runtime.router.linkTo(apiPath, params);
    anchor  = options.anchor || '';

    if (!href) {
      errorReport = 'Invalid parameters passed to `navigate.to` event: ' +
                    JSON.stringify(options);

      window.alert(errorReport);
      callback(new Error(errorReport));
      return;
    }

  } else {
    errorReport = 'Not enough parameters for `navigate.to` event. ' +
                  'Need `href` or `apiPath` at least: ' +
                  JSON.stringify(options);

    window.alert(errorReport);
    callback(new Error(errorReport));
    return;
  }

  // History.JS does not plays well with full URLs but without protocols:
  //
  //  http://example.com/foo.html  -- OK
  //  /foo.html                    -- OK
  //  //example.com/foo.html       -- becomes /example.com/foo.html
  //
  // So we normalize URL to be full one (with protocol, host, etc.)
  href = normalizeURL(href);

  // Add anchor hash-prefix if not exists.
  if (anchor && '#' !== anchor.charAt(0)) {
    anchor = '#' + anchor;
  }

  // Stop here if base URL (all except anchor) haven't changed.
  if (href === (location.protocol + '//' + location.host + location.pathname)) {
    if (anchor !== location.hash) {
      location.hash = anchor;
    }

    callback();
    return;
  }

  // Fallback for old browsers.
  if (!History.enabled) {
    window.location = href + anchor;
    callback();
    return;
  }

  // History is enabled - try RPC navigation.
  N.io.rpc(apiPath, params, function (err, response) {
    if (err && N.io.REDIRECT === err.code) {
      // Note, that we try to keep anchor, if exists.
      // That's important for moved threads and last pages redirects.
      N.wire.emit('navigate.to', {
        href:    err.head.Location
      , anchor:  anchor || window.location.hash
      , render:  options.render
      , history: options.history
      }, callback);
      return;
    }

    if (err && N.io.ECONNECTION === err.code) {
      // No need to do anything.
      // User already notified that he needs to try again later.
      callback(err);
      return;
    }

    if (err) {
      // Can't deal via RPC - try HTTP. This might be:
      //
      // - Either a generic error, e.g. authorization / bad params / fuckup
      //   so we redirect user to show him an error page.
      //
      // - Version mismatch, so we call action by HTTP to update client.
      window.location = href + anchor;
      callback();
      return;
    }

    if (response.layout !== N.runtime.layout) {
      // Layout was changed - perform normal page loading.
      //
      // TODO: Prevent double page requesting. The server should not perform
      // database queries on RPC when the client is not intending to use the
      // response data. Like in this situation.
      window.location = href + anchor;
      callback();
      return;
    }

    N.loader.loadAssets((response.view || apiPath).split('.')[0], function () {
      var state = {
        apiPath: apiPath
      , anchor:  anchor
      , view:    response.view   || apiPath
      , layout:  response.layout || null
      , locals:  response.data   || {}
      };

      // Set one-use callbacks for history 'statechange' handler.
      // The handler will reset these to defaults (`renderFromHistory` and null).
      __renderCallback__   = options.render || renderNewContent;
      __completeCallback__ = callback;

      if (options.replaceState) {
        History.replaceState(state, response.data.head.title, href);
      } else {
        History.pushState(state, response.data.head.title, href);
      }
    });
  });
});

//
// Bind History's statechange handler. It fires when:
//
// - User presses `Back` or `Forward` button in his browser.
// - User clicks a link.
// - User clicks "More threads/posts/etc" button.
//

if (History.enabled) {
  History.Adapter.bind(window, 'statechange', function () {
    var state      = History.getState()
      , exitData   = { apiPath: __currentApiPath__, url: state.url }
      , exitEvents = ['navigate.exit:' + __currentApiPath__, 'navigate.exit']
      , doneData   = { apiPath: state.data.apiPath, url: state.url }
      , doneEvents = ['navigate.done', 'navigate.done:' + state.data.apiPath]
      , render     = __renderCallback__
      , complete   = __completeCallback__;

    // Reset callbacks to defaults. It's needed to ensure using right renderer
    // on regular history state changes - when user clicks back/forward buttons
    // in his browser.
    __renderCallback__   = renderFromHistory;
    __completeCallback__ = null;

    // We have no state data when it's an initial state, so we schedule
    // retrieval of data by it's URL and triggering this event once
    // again (via History.replaceState).
    if (!state.data || History.isEmptyObject(state.data)) {
      N.wire.emit('navigate.to', {
        href:    state.url
      , history: History.replaceState
      });
      return;
    }

    N.wire.emit(exitEvents, exitData, function (err) {
      if (err) {
        N.logger.error('%s', err);
      }

      // Clear old raw response data. It's collected by view templates.
      N.runtime.page_data = {};

      render(state.data, function () {
        N.wire.emit(doneEvents, doneData, function (err) {
          if (err) {
            N.logger.error('%s', err);
          }

          if (complete) {
            complete();
          }
        });
      });
    });
  });
}

//
// __currentApiPath__ updater.
//

N.wire.on('navigate.done', { priority: -999 }, function (data) {
  __currentApiPath__ = data.apiPath;
});

//
// Bind global a.click handler.
//
// NOTE: This handler must have *the lowest* priority. So:
//
// - It must be binded to `document`, since root DOM node has the lowest
//   priotity on event bubbling.
//
// - External libraries like Bootstrap must be placed *before* Nodeca client
//   code to ensure right order of handlers.
//

N.wire.once('navigate.done', { priority: 999 }, function () {
  $(document).on('click', 'a', function (event) {
    var $this = $(this);

    if ($this.attr('target') || event.isDefaultPrevented()) {
      // skip links that have `target` attribute specified
      // and clicks that were already handled
      return;
    }

    // Continue as normal for cmd clicks etc
    if (2 === event.which || event.metaKey) {
      return;
    }

    N.wire.emit('navigate.to', $this.attr('href'), function (err) {
      if (err) {
        N.logger.error('%s', err);
      }
    });

    event.preventDefault();
  });
});
