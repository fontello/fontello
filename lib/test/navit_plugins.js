// Navit extension
//

'use strict';

/*global window, TEST*/


var _ = require('lodash');


module.exports = function (navit) {

  // Authenticate user by login. You should reload page after use this or use before `.open`
  //
  // - login (String) - if empty - do logout, if exists - login, if not exists - create and login
  // - callback(user) (Function) - optional
  //
  navit.registerMethod('do.auth', function do_auth(login, fn) {
    var self = this;

    function createTokenLogin(user, done) {
      TEST.N.models.users.TokenLogin
          .findOne({ user_id: user._id })
          .lean(true)
          .exec(function (err, token) {

        if (err) {
          done(err);
          return;
        }

        if (token) {
          done(null, token);
          return;
        }

        token = new TEST.N.models.users.TokenLogin({ user_id: user._id });

        token.save(function (err) {
          if (err) {
            done(err);
            return;
          }

          done(null, token);
        });
      });
    }

    // If `login` not specified - do logout
    if (!login) {
      return this.cookie({
        name: 'sid',
        value: '',
        domain: '.localhost',
        expires: Date.now() - 1000
      });
    }

    var cookieObj = {
      name: 'sid',
      value: '',
      domain: '.localhost',
      path: '/',
      httponly: true,
      secure: false,
      expires: (new Date()).getTime() + (1000 * 60 * 60 * 24 * 365) // expires in 1 year
    };

    this.__queue__.push(function do_auth_step(callback) {
      var userLogin = _.isFunction(login) ? login() : login;

      /*eslint-disable max-nested-callbacks*/
      TEST.N.models.users.User
          .findOne({ nick: userLogin })
          .lean(true)
          .exec(function (err, user) {

        if (err) {
          callback(err);
          return;
        }

        if (!user) {
          user = new TEST.N.models.users.User({
            nick: userLogin
          });

          user.save(function (err) {
            if (err) {
              callback(err);
              return;
            }

            createTokenLogin(user, function (err, token) {
              if (err) {
                callback(err);
                return;
              }

              cookieObj.value = token.session_id;

              self.__engine__.addCookie(cookieObj, function (err) {
                if (err) {
                  callback(err);
                  return;
                }

                if (_.isFunction(fn)) {
                  fn(user);
                }

                callback();
              });
            });
          });
          return;
        }

        createTokenLogin(user, function (err, token) {
          if (err) {
            callback(err);
            return;
          }

          cookieObj.value = token.session_id;

          self.__engine__.addCookie(cookieObj, function (err) {
            if (err) {
              callback(err);
              return;
            }

            if (_.isFunction(fn)) {
              fn(user);
            }

            callback();
          });
        });
      });
    });

    return this;
  });


  // Wait for nodeca scripts load and check status
  //
  navit.batch.create('waitNodecaBooted', function () {
    this
      .wait(function () {
        try {
          return window.NodecaLoader.booted;
        } catch (__) {}
        return false;
      })
      .test.status(200);
  });

  navit.afterOpen = function () {
    this.batch('waitNodecaBooted');
  };
};
