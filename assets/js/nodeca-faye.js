/*global window, $, Faye, nodeca*/


//= require faye-browser


// temporarily stub rpc(), so it will become available only
// after running Faye.nodecaInit()
nodeca.runtime.rpc = $.noop;


Faye.nodecaInit = function () {
  'use strict';


  var RPC = {
    req_channel:  '/x/rpc-req/' + window.APP_SECRET,
    res_channel:  '/x/rpc-res/' + window.APP_SECRET,
    callbacks:    {},
    last_msg_id:  0
  };


  // initialize client
  nodeca.runtime.faye = new Faye.Client('/faye');


  // subscribe for RPC responses
  nodeca.runtime.faye.subscribe(RPC.res_channel, function (data) {
    var callback = RPC.callbacks[data.id];

    if (!callback) {
      // unknown response id
      return;
    }

    delete RPC.callbacks[data.id];
    callback(data.msg);
  });


  // provide nodeca.runtime.rpc method
  nodeca.runtime.rpc = function (name, params, callback) {
    var data      = {id: RPC.last_msg_id++},
        attempts  = 0,
        try_send;

    // prepare message
    data.msg = {
      version:  nodeca.runtime.version,
      method:   name,
      params:   params
    };

    // store callback for the response
    RPC.callbacks[data.id] = function (msg) {
      if (msg.version !== nodeca.runtime.version) {
        // TODO: implement software upgrade here
        nodeca.client.fontomas.util.notify('error', {layout: 'bottom'},
          '<strong>Application is outdated. Please ' +
          '<a href="/" style="text-decoration:underline">reload</a>' +
          ' page.</strong>');
        return;
      }

      (callback || $.noop)(msg.err, msg.result);
    };

    // send request
    nodeca.runtime.faye.publish(RPC.req_channel, data).errback(function (err) {
      delete RPC.callbacks[data.id];
      (callback || $.noop)(err);
    });
  };
};
