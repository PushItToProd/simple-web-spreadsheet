// doNothing is a void function that just returns null, so we can use it as a
// default callback instead of passing null and checking it each time.
const doNothing = () => null;

// TimedWorker creates a web worker with a timeout to keep it from running
// forever.
export default class TimedWorker {
  WORKER_SCRIPT = "./worker/worker.js"
  TIMEOUT = 100;
  constructor(callback, timeoutCallback = doNothing, initCallback = doNothing,
              timeout = this.TIMEOUT) {
    this.initWorker(initCallback);

    this.callback = callback;
    this.timeoutCallback = timeoutCallback || doNothing;
    this.timeout = timeout;
  }

  // initWorker creates the worker, sets its callback, and sends the first
  // message.
  initWorker(callback) {
    // don't initialize if the worker is still there
    if (this.worker) return;
    this.worker = new Worker(this.WORKER_SCRIPT);
    this.worker.onmessage = callback;
    this.worker.postMessage(null);
  }

  // killWorker terminates the worker and reinitializes it.
  killWorker() {
    this.worker.terminate();
    this.worker = null;
    this.initWorker();
  }

  // send sends a message to the worker, optionally with a custom callback to
  // use instead of the default.
  send(message, callback = null) {
    // use default callback if none was provided
    if (callback === null) {
      callback = this.callback;
    }

    // callback for killing the worker on timeout
    let timeoutCallback = () => {
      console.warn("TimedWorker timed out - killing it")

      // Invoking the debugger here ensures we don't prematurely kill the worker
      // when trying to observe errors in DevTools. Otherwise the worker will be
      // killed even while it's paused on the exception and this will fail.
      debugger;
      this.killWorker();
      this.timeoutCallback(message);
    }

    let timer;  // variable holding the timeout handle

    // response callback
    this.worker.onmessage = (message) => {
      clearTimeout(timer);
      callback(message);
    }

    // set up timeout
    if (this.timeout && this.timeout > 0) {
      timer = setTimeout(timeoutCallback, this.timeout);
    }

    // send the message
    this.worker.postMessage(message);
  }
}