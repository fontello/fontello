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
// NOTE: History.JS does not plays well with full URLs but without protocols.
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
    href   = normalizeURL(options.href).split('#')[0];
    anchor = normalizeURL(options.href).slice(href.length) || '';

    match = _.find(N.runtime.router.matchAll(href), function (match) {
      return _.has(match.meta.methods, 'get');
    });

    // It's an external link or 404 error if route is not matched. So perform
    // regular page requesting via HTTP.
    if (!match) {
      window.location = href + anchor;
      callback();
      return;
    }

    apiPath = match.meta.methods.get;
    params = castParamTypes(match.params || {});

  } else if (options.apiPath) {
    apiPath = options.apiPath;
    params  = options.params || {};
    href    = normalizeURL(N.runtime.router.linkTo(apiPath, params));
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

  // Add anchor hash-prefix if not exists.
  if (anchor && '#' !== anchor.charAt(0)) {
    anchor = '#' + anchor;
  }

  // Stop here if base URL (all except anchor) haven't changed.
  if (href === (location.protocol + '//' + location.host + location.pathname)) {

    // Update anchor if it's changed.
    if (location.hash !== anchor) {
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
      var redirectUrl = document.createElement('a');

      // Tricky way to parse URL.
      redirectUrl.href = err.head.Location;

      // Note, that we try to keep anchor, if exists.
      // That's important for moved threads and last pages redirects.
      redirectUrl.hash = anchor || window.location.hash;

      // If protocol is changed, we must completely reload the page to keep
      // Same-origin policy for RPC.
      // - port check not required, because port depends on protocol.
      // - domain check not required, because RPC is available on all domains
      //   (it uses relative path)
      if (redirectUrl.protocol !== location.protocol) {
        window.location = redirectUrl.href;
        callback();
      } else {
        N.wire.emit('navigate.to', {
          href:    redirectUrl.href
        , render:  options.render
        , history: options.history
        }, callback);
      }
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

    /*
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
    */

    N.loader.loadAssets((response.view || apiPath).split('.')[0], function () {
      var state = {
        apiPath: apiPath
      , anchor:  anchor
      , view:    response.view   || apiPath
    //, layout:  response.layout || null
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
    var state = History.getState();

    // We have no state data for the initial page (received via HTTP responder).
    // So request that data via RPC and place into History.
    if (_.isEmpty(state.data)) {
      var match = _.find(N.runtime.router.matchAll(state.url), function (match) {
        return _.has(match.meta.methods, 'get');
      });

      // Can't match initial URL by some reason - just reload the page.
      // This is internal error. Must not happen on normal Nodeca workflow.
      if (!match) {
        window.location = state.url;
        return;
      }

      // Retrieve data.
      N.io.rpc(match.meta.methods.get, castParamTypes(match.params || {}), function (err, response) {
        var a, data, url;

        // Simple way to parse URL in browser.
        a = document.createElement('a');
        a.href = state.url;

        // Result state data.
        data = {
          apiPath: match.meta.methods.get
        , anchor:  a.hash
        , view:    response.view   || match.meta.methods.get
      //, layout:  response.layout || null
        , locals:  response.data   || {}
        };

        // State URL without anchor. (due to a problem in History.js; see above)
        url = a.protocol + '//' + a.host + a.pathname;

        // We terminate here, but History.replaceState will trigger 'statechange'
        // again, and we will continue with next part of code.
        History.replaceState(data, state.title, url);
      });
      return;
    }

    var render   = __renderCallback__
      , complete = __completeCallback__;

    // Restore callbacks to defaults. It's needed to ensure using right renderer
    // on regular history state changes - when user clicks back/forward buttons
    // in his browser.
    __renderCallback__   = renderFromHistory;
    __completeCallback__ = null;

    var exitEventData = { apiPath: __currentApiPath__, url: state.url }
      , doneEventData = { apiPath: state.data.apiPath, url: state.url };

    // Invoke exit handlers.
    N.wire.emit(['navigate.exit:' + __currentApiPath__, 'navigate.exit'], exitEventData, function (err) {
      if (err) {
        N.logger.error('%s', err); // Log error, but not stop.
      }

      // Clear old raw response data. It's collected by view templates.
      N.runtime.page_data = {};

      render(state.data, function () {
        // Invoke done-handlers.
        N.wire.emit(['navigate.done', 'navigate.done:' + state.data.apiPath], doneEventData, function (err) {
          if (err) {
            N.logger.error('%s', err); // Log error, but not stop.
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

N.wire.on('navigate.done', { priority: -999 }, function apipath_set(data) {
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

N.wire.once('navigate.done', { priority: 999 }, function navigate_click_handler() {
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

    if ('#' === $this.attr('href')) {
      // Prevent clicks on special "button"-links.
      event.preventDefault();
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
