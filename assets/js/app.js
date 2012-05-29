/*global nodeca, _, $, Modernizr*/

//= require json
//= require store
//= require jquery/jquery
//= require jquery-ui/jquery-ui
//= require jquery.noty/src/js/jquery.noty
//= require bootstrap/bootstrap
//= require underscore
//= require backbone
//= require handlebars
//= require jquery.collapser
//= require nodeca
//= require nodeca-io
//= require fontomas/api

$(function () {
  "use strict";
  nodeca.client.fontomas.init();
});
