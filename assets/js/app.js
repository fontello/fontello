/*global nodeca, _, $, Modernizr*/

//= require jquery/jquery
//= require jquery-ui/jquery-ui
//= require jquery.noty/src/js/jquery.noty
//= require bootstrap/bootstrap
//= require underscore
//= require backbone
//= require handlebars
//= require jquery.collapser
//= require nodeca
//= require fontomas/api

;(function () {
  "use strict";

  $(function () {
    nodeca.client.fontomas.init();
  });
}());
