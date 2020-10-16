Fontello installation instruction <!-- omit in toc -->
=================================

This description is for development only. For quick deploy use docker, see
[deploy info](support/deploy/README.md).

Fonello runs on Ubuntu 18.04 LTS, but it can probably work on other OS-es.
However, it's not tested anywhere else and support is not provided. If you wish,
you can send patches to improve compatibility.


## Requirements

- node.js v12.x.
- ttfautohint v1.8.3.

ttfautohint is optional. Fontello will work without it, just don't enable
hinting option in font settings (it's off by default).


## Install

Install fontello sources & dependencies:

```sh
git clone git://github.com/fontello/fontello.git
cd fontello
npm install
```

If you plan to rebuild fonts:

```sh
git submodule init
git submodule update
```

## Run

Start server:

```sh
./server.js
```

Then you can point your browser to the page http://localhost:3000

## Rebuild embedded fonts

After you update font sources in `./support` folder, run

```bash
make rebuild
```
