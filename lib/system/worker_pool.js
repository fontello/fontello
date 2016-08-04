// WorkerPool class
//

'use strict';


const _            = require('lodash');
const cluster      = require('cluster');
const EventEmitter = require('events').EventEmitter;
const StateMachine = require('javascript-state-machine');


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

  fork() {
    cluster.setupMaster({ args: [ this.__pool.__class ] });
    return cluster.fork();
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

    this.__pool.emit('worker:spawn', w.process.pid);
    this.pid = w.process.pid;

    w.on('error', err => {
      this.__pool.emit('worker:error', err);
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
    this.__pool.emit('worker:online', w.process.pid);
  },

  onDEAD() {
    let w = this.__w;

    // We can come here if process did not started.
    if (w) {
      this.__pool.emit('worker:exit', w.process.pid, this.__exit_code);
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

function WorkerPool(class_name, size) {
  if (!(this instanceof WorkerPool)) return new WorkerPool(class_name, size);

  EventEmitter.call(this);

  this.__workers = [];
  this.__size    = 0;
  this.__class   = class_name;

  this.update = _.debounce(() => {
    process.nextTick(() => {
      this.resize();
      this.gc();
    });
  }, 100, { maxWait: 200 });

  this.resize(size);

  //
  // Emit `online` event when all workers start,
  // and `error` if they can't
  //
  let on_exit, on_online;

  on_online = () => {
    if (this.get('RUN').length >= this.__size) {
      this.removeListener('worker:online', on_online);
      this.removeListener('worker:exit', on_exit);

      this.emit('online');
    }
  };

  on_exit = () => {
    this.removeListener('worker:online', on_online);
    this.removeListener('worker:exit', on_exit);

    // only emit this error if we're not in shutdown mode
    if (this.__size) {
      this.emit('error', `Unable to start worker pool ${this.__class}`);
    }
  };

  this.on('worker:online', on_online);
  this.on('worker:exit', on_exit);

  on_online(); // account for zero sized pool
}


WorkerPool.prototype = {
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
        let w = new Worker(this);
        this.__workers.push(w);
        // Force immediate start for the first run
        if (prev_size === 0 && w.can('start')) w.start();
      }
      return;
    }

    alive.slice(0, -delta).forEach(w => { w.shutdown(); });
  },

  shutdown() {
    const on_exit = () => {
      if (this.get_except('DEAD').length === 0) {
        this.removeListener('exit', on_exit);
        this.emit('exit');
      }
    };

    this.on('worker:exit', on_exit);

    // account for zero-sized pool
    on_exit();

    // prevent workers from being respawned
    this.__size = 0;

    this.__workers.forEach(w => {
      if (w.can('shutdown')) w.shutdown();
    });
  },

  terminate() {
    const on_exit = () => {
      if (this.get_except('DEAD').length === 0) {
        this.removeListener('exit', on_exit);
        this.emit('exit');
      }
    };

    this.on('worker:exit', on_exit);

    // account for zero-sized pool
    on_exit();

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

  list() {
    return this.get_except([]);
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


module.exports = WorkerPool;
