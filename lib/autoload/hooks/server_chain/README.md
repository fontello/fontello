Generic wrapper for "dynamic" server methods. Was created to resolve 2 problems:

1. Easily separate binary files http requests on handlers definition
2. Allow light recursive/multiple calls for server methods, without needs to
   create session every time.
