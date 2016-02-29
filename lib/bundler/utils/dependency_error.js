'use strict';


function DependencyError(path) {
  this.message = `Need to resolve '${path}' first.`;
  this.dependency = path;
}


module.exports = DependencyError;
