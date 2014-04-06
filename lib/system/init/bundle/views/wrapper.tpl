NodecaLoader.execute(function (N) {
  N.views = N.views || {};
  var jade = N.__jade_runtime;

  <% _.forEach(views, function (code, apiPath) { %>
    N.views[${JSON.stringify(apiPath)}] = (${code});
  <% }); %>
});
