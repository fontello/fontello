// Start server cluster
//
// In cluster mode it forks N http workers + N queue workers.
//
// In single mode it emits `init:server.worker-http` and
// `init:server.worker-queue` events instead
//
'use strict';


const _            = require('lodash');
const cluster      = require('cluster');
const co           = require('co');
const execFile     = require('mz/child_process').execFile;
const exec         = require('mz/child_process').exec;
const os           = require('os');
const inherits     = require('util').inherits;
const EventEmitter = require('events').EventEmitter;
const StateMachine = require('javascript-state-machine');



////////////////////////////////////////////////////////////////////////////////

function WorkerPool(size, worker) {
  if (!(this instanceof WorkerPool)) return new WorkerPool(size, worker);

  EventEmitter.call(this);

  this.__workers = [];
  this.__wClass  = worker;
  this.__size    = 0;

  this.update = _.debounce(() => {
    process.nextTick(() => {
      this.resize();
      this.gc();
    });
  }, 100, { maxWait: 200 });

  this.resize(size);
}


WorkerPool.prototype = {
  log() {
    /*eslint-disable no-console*/
    console.log.apply(null, arguments);
  },

  resize(count) {
    // Use current value if no params
    if (!count && count !== 0) {
      count = this.__size;
    }

    let alive = this.get([ 'INIT', 'START', 'RUN' ]),
        delta = count - alive.length,
        prev_size = this.__size;

    this.__size = count;

    if (delta === 0) return;

    if (delta > 0) {
      while (delta--) {
        let w = this.__wClass(this);
        this.__workers.push(w);
        // Force immediate start for the first run
        if (prev_size === 0 && w.can('start')) w.start();
      }
      return;
    }

    alive.slice(0, -delta).forEach(w => { w.shutdown(); });
  },

  shutdown() {
    // prevent workers from being respawned
    this.__size = 0;

    this.__workers.forEach(w => {
      if (w.can('shutdown')) w.shutdown();
    });
  },

  terminate() {
    // prevent workers from being respawned
    this.__size = 0;

    this.__workers.forEach(w => {
      if (w.can('terminate')) w.terminate();
    });
  },

  reload() {
    this.__workers.forEach(w => {
      if (w.can('freeze')) w.freeze();
    });
  },

  get(state) {
    if (!Array.isArray(state)) {
      return this.__workers.filter(w => w.current === state);
    }
    return this.__workers.filter(w => state.indexOf(w.current) !== -1);
  },

  get_except(state) {
    if (!Array.isArray(state)) {
      return this.__workers.filter(w => w.current !== state);
    }
    return this.__workers.filter(w => state.indexOf(w.current) === -1);
  },

  gc() {
    // Shutdown pending workers when not needed
    let excess = Math.max((this.get('PEND').length + this.get('RUN').length - this.__size), 0);

    this.get('PEND').slice(0, excess).forEach(w => { w.shutdown(); });

    // Drop dead workers
    this.__workers = this.__workers.filter(w => w.current !== 'DEAD');
  }
};


Object.setPrototypeOf(WorkerPool.prototype, EventEmitter.prototype);


////////////////////////////////////////////////////////////////////////////////

function Worker(pool) {
  if (!(this instanceof Worker)) return new Worker(pool);
  this.__pool          = pool;
  this.__w             = null;
  this.__start_timeout = 0;
  this.__exit_code     = null;

  // informational only, displayed in REPL
  this.pid     = null;
  this.started = new Date();

  this.begin();
}

Worker.prototype = {
  create() {
    throw new Error('This method should be overriden');
  },

  onchangestate() {
    this.__pool.update();
  },

  onINIT() {
    setTimeout(() => {
      if (this.can('start')) this.start();
    }, 2000);
  },

  onSTART() {
    let w = this.__w = this.fork();
    let rcvd_startup_message = false;

    this.__pool.log.info(`Worker ${w.process.pid} spawned`);
    this.__pool.emit('spawn', w.process.pid);
    this.pid = w.process.pid;

    w.on('error', err => {
      this.__pool.log.error(err);
      this.die();
    });

    w.on('exit', (code, signal) => {
      this.__exit_code = signal || code;
      this.die();
    });

    w.on('message', msg => {
      if (msg === 'worker.running') {
        rcvd_startup_message = true;
        if (this.can('run')) this.run();
      }
    });

    setTimeout(() => {
      if (!rcvd_startup_message && this.can('terminate')) this.terminate();
    }, 30000);
  },

  onSTOP() {
    // Don't use child's .kill() because it disconnects
    // child immediately and breaks logger in worker
    process.kill(this.__w.process.pid, 'SIGTERM');
    setTimeout(() => {
      if (this.can('terminate')) this.terminate();
    }, 15000);
  },

  onKILL() {
    // Don't use child's .kill() because it disconnects
    // child immediately and breaks logger in worker
    if (this.__w) process.kill(this.__w.process.pid, 'SIGKILL');
    else this.die();
  },

  onRUN() {
    let w = this.__w;
    this.__pool.log.info(`Worker ${w.process.pid} is running`);
    this.__pool.emit('running', w.process.pid);
  },

  onDEAD() {
    let w = this.__w;

    // We can come here if process did not started.
    if (w) {
      this.__pool.log.info(`Worker ${w.process.pid} exited with status ${this.__exit_code}`);
      this.__pool.emit('exit', w.process.pid);
      w.removeAllListeners();
    }

    this.__w = null;
  }
};

StateMachine.create({
  events: [
    { name: 'begin',     from: 'none',   to: 'INIT'  },
    { name: 'start',     from: 'INIT',   to: 'START' },
    { name: 'run',       from: 'START',  to: 'RUN'   },

    { name: 'freeze',    from: 'INIT',   to: 'KILL'  },
    { name: 'freeze',    from: 'START',  to: 'KILL'  },
    { name: 'freeze',    from: 'RUN',    to: 'PEND'  },

    { name: 'shutdown',  from: 'INIT',   to: 'KILL'  },
    { name: 'shutdown',  from: 'START',  to: 'KILL'  },
    { name: 'shutdown',  from: 'RUN',    to: 'STOP'  },
    { name: 'shutdown',  from: 'PEND',   to: 'STOP'  },

    { name: 'terminate', from: 'INIT',   to: 'KILL'  },
    { name: 'terminate', from: 'START',  to: 'KILL'  },
    { name: 'terminate', from: 'RUN',    to: 'KILL'  },
    { name: 'terminate', from: 'PEND',   to: 'KILL'  },
    { name: 'terminate', from: 'STOP',   to: 'KILL'  },

    { name: 'die',       from: '*',      to: 'DEAD'  }
  ]
}, Worker.prototype);


////////////////////////////////////////////////////////////////////////////////

function WorkerQueue(pool) {
  if (!(this instanceof WorkerQueue)) return new WorkerQueue(pool);
  this.class = 'queue';
  Worker.call(this, pool);
}

inherits(WorkerQueue, Worker);

WorkerQueue.prototype.fork = function () {
  cluster.setupMaster({ args: [ 'worker-queue' ] });

  let worker = cluster.fork(),
      log = this.__pool.log;

  worker.on('online', co.wrap(function* () {
    try {
      // Set scheduling policy to SCHED_IDLE (`-i` flag);
      // `0` is only possible value for priority ('cause this policy doesn't allow to set it)
      yield execFile('chrt', [ '-i', '-p', '0', worker.process.pid ]);
    } catch (__) {
      // If `chrt` not exists, try fallback to `renice`.
      try {
        yield execFile('renice', [ '-n', '19', '-p', worker.process.pid ]);
        log.warn('Cannot set scheduling policy for queue using `chrt`, falling back to `renice`');
      } catch (___) {
        log.error('Cannot lower priority for queue ' +
          '(both `renice` and `chrt` have failed), continuing with default priority');
      }
    }
  }));

  return worker;
};

////////////////////////////////////////////////////////////////////////////////

function WorkerHttp(pool) {
  if (!(this instanceof WorkerHttp)) return new WorkerHttp(pool);
  this.class = 'http';
  Worker.call(this, pool);
}

inherits(WorkerHttp, Worker);

WorkerHttp.prototype.fork = function () {
  cluster.setupMaster({ args: [ 'worker-http' ] });
  return cluster.fork();
};

////////////////////////////////////////////////////////////////////////////////


module.exports = function (N) {

  N.wire.on('init:server', function* cluster_init(N) {
    let fork = N.config.fork;

    if (fork === 'auto' || fork === true || _.isUndefined(fork)) {
      fork = os.cpus().length;
    } else {
      fork = +fork || 0;
    }

    if (cluster.isMaster && (fork >= 1)) {
      WorkerPool.prototype.log = N.logger;

      /*eslint-disable new-cap*/
      let pools = [
        WorkerPool(fork, WorkerQueue),
        WorkerPool(fork, WorkerHttp)
      ];

      let shutting_down = false;


      N.wire.on('exit.shutdown', { ensure: true }, function* shutdown_workers() {
        shutting_down = true;

        yield pools.map(pool => new Promise(resolve => {
          function on_exit() {
            if (pool.get_except('DEAD').length === 0) {
              pool.removeListener('exit', on_exit);
              resolve();
            }
          }

          pool.on('exit', on_exit);
          pool.shutdown();
          on_exit();
        }));
      });


      N.wire.after('exit', { ensure: true }, function* terminate_workers() {
        shutting_down = true;

        yield pools.map(pool => new Promise(resolve => {
          function on_exit() {
            if (pool.get_except('DEAD').length === 0) {
              pool.removeListener('exit', on_exit);
              resolve();
            }
          }

          pool.on('exit', on_exit);
          pool.terminate();
          on_exit();
        }));
      });


      // Try to rebuild assets if needed
      N.wire.on('reload', function* rebuild_assets() {
        yield exec([ process.mainModule.filename, 'assets' ].join(' '), {
          cwd: process.cwd(),
          env: process.env,
          timeout: 120 * 1000
        });
      });

      N.wire.on('reload', function reload_workers() {
        pools.forEach(pool => pool.reload());
      });

      N.wire.on('init:repl', function repl_add_workers(repl) {
        Object.defineProperty(repl.context, 'workers', {
          get() {
            return pools.reduce((acc, pool) =>
              acc.concat(pool.get_except([]).map(worker => ({
                pid:     worker.pid,
                uptime:  Math.round((Date.now() - worker.started) / 1000), // in seconds
                state:   worker.current,
                'class': worker.class
              })))
            , []);
          }
        });
      });


      yield pools.map(pool => new Promise((resolve, reject) => {
        let on_exit, on_running;

        on_running = function () {
          if (pool.get('RUN').length >= fork) {
            pool.removeListener('running', on_running);
            pool.removeListener('exit', on_exit);
            resolve();
          }
        };

        on_exit = function () {
          pool.removeListener('running', on_running);
          pool.removeListener('exit', on_exit);

          if (!shutting_down) {
            reject('Cannot start workers');
          } else {
            // don't throw if user pressed ctrl+c when workers start
            resolve();
          }
        };

        pool.on('running', on_running);
        pool.on('exit', on_exit);
      }));

      if (!shutting_down) {
        N.logger.info('All workers started successfully');
      }
      return;
    }

    // If we are here - need worker deals
    yield N.wire.emit('init:server.worker-http', N);
    yield N.wire.emit('init:server.worker-queue', N);
  });
};
