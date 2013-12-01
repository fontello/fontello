'use strict';


var Mongoose = require('mongoose');
var Schema   = Mongoose.Schema;


////////////////////////////////////////////////////////////////////////////////

module.exports = function (N, collectionName) {
  var ShortLink = new Schema(
    {
      ip      : String,
      sid     : String,
      ts      : Date,
      url     : String,
      config  : Schema.Types.Mixed
    },
    { strict: true }
  );

  // Indexes
  //////////////////////////////////////////////////////////////////////////////

  ShortLink.index({ sid: 1 });
  ShortLink.index({ ts: 1 });
  ShortLink.index({ ip: 1 });

  // Init
  //////////////////////////////////////////////////////////////////////////////

  N.wire.on('init:models', function emit_init_ShortLink(__, callback) {
    N.wire.emit('init:models.' + collectionName, ShortLink, callback);
  });

  N.wire.on('init:models.' + collectionName, function init_model_ShortLink(schema) {
    N.models[collectionName] = Mongoose.model(collectionName, schema);
  });

};
