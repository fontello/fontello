'use strict';


const _ = require('lodash');


module.exports = function (N) {

  N.wire.before('server_chain:*', { prioity: -100 }, function notify_dear_friends(env) {
    let dear_friends = _.get(N, 'config.options.dear_friends');

    if (!Array.isArray(dear_friends)) return;

    if (dear_friends.indexOf(env.req.ip) >= 0) {
      throw {
        code: 403,
        message: 'Dear friend, we are getting too much of API requests from your ' +
                 'IP address. Please, contact us at ' +
                 'https://github.com/fontello/fontello/issues/480 to explain details ' +
                 'or consider to setup standalone fontello server. We will be happy to help!'
      };
    }
  });

};
