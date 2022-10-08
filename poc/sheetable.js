import * as utils from './utils.js';
import * as $ from './html.js';

// helper for turning a numeric column index into a letter column name, so
// columnName(0) = 'A', columnName(1) = 'B', and so on
function columnName(i) {
  const A = 'A'.charCodeAt(0);
  return String.fromCharCode(A + i);  // TODO: handle i>= 26
}

// TimedWorker creates a web worker with a timeout to keep it from running
// forever.
class TimedWorker {
  WORKER_SCRIPT = "worker.js"
  TIMEOUT = 100;
  constructor(callback, timeoutCallback = _ => {}, initCallback = _ => {}) {
    this.initWorker(initCallback);

    this.callback = callback;
    this.timeoutCallback = timeoutCallback || (_ => {});
    this.timeout = this.TIMEOUT;
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
      console.info("TimedWorker responded - triggering callback")
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

  constructor(tableElement, options = {}, values = {}) {
    if (!(tableElement instanceof HTMLTableElement)) {
      throw `Sheetable expects an HTMLTableElement but got ` +
        `${tableElement} of type ${utils.getType(tableElement)}`;
    }

    this.tableElement = tableElement;
    this.options = Object.assign(this.getDefaults(), options);
    this.values = values;

    // startup - start the worker and fill the table
    this.fillTable();
    this.worker = new TimedWorker(
      // success callback
      (message) => {this.workerCallback(message)},
      // timeout callback
      (message) => {this.workerTimeout(message)},
      // post-init callback
      () => {
        this.worker.send(this.values);
      }
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
      if (typeof vals[coord] === 'string') {
        div.className = "text";
      }
      div.textContent = vals[coord];
    }
  }

  reset() {
    this.values = {};
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
    resetButton.onclick = function() {
      alert('TODO')
    }
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

  makeCell(col, row) {
    let cell = $.td();
    let cellId = `${col}${row}`

    let input = $.input(this.cellInputId(cellId));

    if (!(cellId in this.values)) {
      this.values[cellId] = undefined;
    }

    // save input data
    input.onchange = () => {
      this.values[cellId] = input.value;
      this.recalc();
    }

    input.onkeydown = (event) => {
      let id;
      console.log("input keydown - key:", event.key);
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
      console.log("input keydown - destination:", id);
      $.focus(id);
    }

    cell.append(input);
    let div = $.div(this.cellDivId(cellId));
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