import * as utils from './utils.js';
import * as $ from './html.js';

// helper for turning a numeric column index into a letter column name, so
// columnName(0) = 'A', columnName(1) = 'B', and so on
function columnName(i) {
  const A = 'A'.charCodeAt(0);
  return String.fromCharCode(A + i);  // TODO: handle i>= 26
}

const doNothing = _ => null;

// TimedWorker creates a web worker with a timeout to keep it from running
// forever.
class TimedWorker {
  WORKER_SCRIPT = "worker.js"
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

const StorageManager = {
  STORAGE_KEY: "sheetData",
  load() {
    let json = localStorage.getItem(this.STORAGE_KEY);
    if (json == null) {
      return null;
    }
    try {
      return JSON.parse(json);
    } catch (e) {
      console.error("error parsing JSON from local storage", e);
      return null;
    }
  },
  save(data) {
    let json;
    console.debug("Saving data to local storage", data);
    try {
      json = JSON.stringify(data);
    } catch (e) {
      console.error("error stringifying JSON for local storage", e);
      throw e;
    }
    localStorage.setItem(this.STORAGE_KEY, json);
  }
}

// Sheetable takes a table HTML element and builds a spreadsheet inside it.
export class Sheetable {
  // have to use a function because if we do
  //    function (options = Defaults)
  // where Defaults is an object, it'll retain a mutable reference to the object
  // across invocations
  getDefaults() {
    return {
      numRows: 10,
      numCols: 10,
    }
  }

  constructor(tableElement, options = {}, values = null,
              storageManager = StorageManager) {
    if (!(tableElement instanceof HTMLTableElement)) {
      throw `Sheetable expects an HTMLTableElement but got ` +
        `${tableElement} of type ${utils.getType(tableElement)}`;
    }

    this.tableElement = tableElement;
    this.options = Object.assign(this.getDefaults(), options);
    this.storageManager = storageManager;
    if (values !== null) {
      this.values = values;
    } else {
      this.values = this.storageManager.load();
      if (this.values == null) {
        this.values = {};
      }
    }

    // startup - start the worker and fill the table
    this.fillTable();
    this.worker = new TimedWorker(
      // We have to explicitly bind these methods to `this` or `this` will be
      // unitialized in their scope when they're called.
      this.workerCallback.bind(this),
      this.workerTimeout.bind(this),
      this.recalc.bind(this),
    );
  }

  // trigger the worker to recalculate the values -- upon success,
  // workerCallback will be triggered
  recalc() {
    this.worker.send(this.values);
  }

  workerTimeout() {
    console.error("worker timed out");
  }

  // when the worker responds, take the results and populate the <div>s in the
  // table
  workerCallback(message) {
    let {vals} = message.data;
    for (let coord in vals) {
      // find the div for the cell
      let divId = this.cellDivId(coord);
      let div = $.id(divId);
      if (div === null) {
        console.warn("no <div> for", coord, "with id", divId);
        continue;
      }

      let val = vals[coord];

      // if there's an error for the cell, display it and move on
      if (val?.error) {
        div.className = "error";
        div.textContent = val.error;
        continue;
      }

      div.className = "";
      if (utils.isString(val)) {
        div.className = "text";
      }
      div.textContent = this.formatText(val);
    }
  }

  formatText(val) {
    if (val === undefined || val === '') {
      return '';
    }
    if (utils.isString(val) || utils.isNumeric(val)) {
      return val;
    }
    if ('_data' in val) {
      return this.formatText(val._data);
    }
    let text = '';
    // prepend constructor name
    if (val.constructor?.name && !Array.isArray(val) && !utils.isObject(val)) {
      text = text.concat(val.constructor.name).concat(' ');
    }
    let json = `${JSON.stringify(val)}`;
    if (json !== '{}') {
      return text.concat(json);
    }
    return text.concat(String(val));
  }

  reset(data = null) {
    this.values = data ?? {};
    this.storageManager.save(this.values);
    let element;
    for (element of this.tableElement.getElementsByTagName("input")) {
      element.value = "";
      element.setAttribute("class", "");
    }
    for (element of this.tableElement.getElementsByTagName("div")) {
      element.textContent = "";
      element.setAttribute("class", "");
    }
  }

  fillTable({numRows, numCols} = this.options) {
    let tableHeader = $.tr();
    let resetButton = $.button("↻");
    resetButton.onclick = this.reset.bind(this);
    tableHeader.append(resetButton);
    this.tableElement.append(tableHeader);

    // generate column headers
    let colNames = [];
    for (let colNum = 0; colNum < numCols; colNum++) {
      let colName = columnName(colNum);
      colNames.push(colName);

      let colHeader = $.th(colName);
      tableHeader.append(colHeader);
    }

    // generate each row
    for (let rowNum = 1; rowNum <= numRows; rowNum++) {
      let tableRow = $.tr();
      tableRow.appendChild($.th(rowNum));

      colNames.forEach(colName => {
        tableRow.append(this.makeCell(colName, rowNum));
      })

      this.tableElement.append(tableRow);
    }
  }

  update(cellId, value) {
    console.debug("updating %s with value %s", cellId, value);
    this.values[cellId] = value;
    this.recalc();
    this.storageManager.save(this.values);
  }

  makeCell(col, row) {
    let cell = $.td();
    let cellId = `${col}${row}`

    let input = $.input(this.cellInputId(cellId));

    if (!(cellId in this.values)) {
      this.values[cellId] = undefined;
    }

    // save input data and recalculate
    input.onchange = () => {
      this.update(cellId, input.value);
    }

    input.onkeydown = (event) => {
      let id;
      switch (event.key) {
        case "ArrowUp":
          id = this.cellInputId(`${col}${row-1}`);
          break;
        case "ArrowDown":
        case "Enter":
          id = this.cellInputId(`${col}${row+1}`);
          break;
        default:
          return;
      }
      id = `#${id}`;
      $.focus(id);
    }

    cell.append(input);
    let div = $.div(this.cellDivId(cellId));
    div.addEventListener('click', event => {
      input.focus();
    });
    cell.append(div);

    return cell;
  }

  cellInputId(coord) {
    return `${this.tableElement.id}_input_${coord}`
  }

  cellDivId(coord) {
    return `${this.tableElement.id}_output_${coord}`
  }
}