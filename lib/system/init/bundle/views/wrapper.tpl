NodecaLoader.execute(function (N) {
  if (!N.views) {
    N.views = {};
  }

  <% _.forEach(views, function (code, apiPath) { %>
    N.views[${JSON.stringify(apiPath)}] = (${code});
  <% }); %>
});
