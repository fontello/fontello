/*global describe, it*/


'use strict';


// pollute globals
global.underscore = require('underscore');


// stdlib
var assert = require('assert');


// internal
var Hooker = require('../lib/support/hooker');


describe('Hooker', function () {
  it('respect paths tree registered hooks', function () {
    var result, hooker = new Hooker();

    hooker.before('',             function a(next) { result += 'a'; next(); });
    hooker.before('foo',          function b(next) { result += 'b'; next(); });
    hooker.before('foo.bar',      function c(next) { result += 'c'; next(); });
    hooker.before('foo.bar.baz',  function d(next) { result += 'd'; next(); });

    result = '';
    hooker.run('foo.bar.baz', null, function () {
      assert.ok(/^[abcd]{4}$/.test(result), 'contains only a,b,c,d');
    });

    result = '';
    hooker.run('foo.bar.moo', null, function () {
      assert.ok(/^[abc]{3}$/.test(result), 'contains only a,b,c');
    });

    result = '';
    hooker.run('penny', null, function () {
      assert.equal('a', result);
    });
  });

  it('priorities are taken over the path tree', function () {
    var result = '', hooker = new Hooker();

    hooker.before('',             8, function a(next) { result += 'a'; next(); });
    hooker.before('foo',          4, function b(next) { result += 'b'; next(); });
    hooker.before('foo.bar',      2, function c(next) { result += 'c'; next(); });
    hooker.before('foo.bar.baz',  1, function d(next) { result += 'd'; next(); });

    hooker.run('foo.bar.baz', null, function () {
      assert.equal('dcba', result);
    });
  });

  it('should execute registered `ensure` callbacks in any case', function () {
    var result = '', hooker = new Hooker();

    hooker.ensure('', function ensure(next) {
      result = 'text';
      next();
    });

    hooker.run('foo', function (next) { next(); }, function () {
      assert.equal('text', result);
    });

    hooker.run('foo', function (next) { next(new Error('Tada!')); }, function () {
      assert.equal('text', result);
    });
  });
});
