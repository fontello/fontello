Fontello installation instruction
=================================

This project requires Ubuntu 12.04 LTS, but it can probably work on a
more recent version, Debian and other OS-es. However, it's not tested anywhere else
and support is not provided. If you wish, you can send patches that improve compatibility.


## node.js

You need node.js 6.+. Instructions below are for Ubuntu.

Install build dependencies of node & npm:

```bash
sudo apt-get install build-essential libssl-dev git curl
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.7/install.sh | bash
```

Reopen terminal. Install node (long), and set default version:

```bash
nvm install 6
nvm alias default 6
```


## Fontello

Install fontello sources & dependencies:

```bash
git clone git://github.com/fontello/fontello.git
cd fontello
npm install
```

If you plan to rebuild fonts:

```bash
git submodule init
git submodule update
```

If you deploy to production, you may probabply wish to override some defaults. Put those to
additional file in `./config` dir. Here is fontent fon fontello site config for example:

```yaml
^all:
  #fork: 1
  repl: ./repl.sock

  env_default: production

  database:
    mongo: localhost/fontello

  bind:
    default:
      listen: 0.0.0.0:80
      #forwarded: true
      mount: http://fontello.com

  options:

    inject_header: |
      <script>
        (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

        ga('create', 'UA-31060395-1', 'fontello.com');
        ga('send', 'pageview');

      </script>

    dear_friends:
      - 195.154.179.69
      - 62.210.136.151
```


## ttfautohint

This is optional. Fontello will work without ttfautohint, just don't enable
hinting options in font settings (it's off by default).

You need ttfautohint v1.1, searchable via PATH.

For MAC install, look info at http://www.freetype.org/ttfautohint/#download

For Ubuntu 12.04, run this script from fontello folder: `./support/ttfautohint-ubuntu-12.04.sh`


## Run Fontello server

From command line, in fontello folder:

    ./server.js

Now you can point your browser to the page http://localhost:3000


## Rebuilding embedded fonts

After you update font sources in `./support` folder, run

```bash
make rebuild
```
