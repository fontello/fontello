'use strict';


// 3rd-party
var Mincer  = require('mincer');


////////////////////////////////////////////////////////////////////////////////


var server;


function call_mincer_server(req, res) {
  var assets;

  if (!server) {
    assets = nodeca.runtime.assets,
    server = Mincer.createServer(assets.environment, assets.manifest);
  }

  return server(req, res);
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (params, callback) {
  if (!this.origin.http) {
    callback("HTTP requests only");
    return;
  }

  this.origin.http.req.url = params.path;
  call_mincer_server(this.origin.http.req, this.origin.http.res);
};
