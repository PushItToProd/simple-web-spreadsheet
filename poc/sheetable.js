import * as utils from './utils.js';
import * as $ from './html.js';

// helper for turning a numeric column index into a letter column name, so
// columnName(0) = 'A', columnName(1) = 'B', and so on
function columnName(i) {
  const A = 'A'.charCodeAt(0);
  return String.fromCharCode(A + i);  // TODO: handle i>= 26
}

// doNothing is a void function that just returns null, so we can use it as a
// default callback instead of passing null and checking it each time.
const doNothing = () => null;

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

const StorageManager = {
  STORAGE_PREFIX: "sheetData_",
  load(key="") {
    key = this.STORAGE_PREFIX + key;
    let json = localStorage.getItem(key);
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
  save(data, key="") {
    key = this.STORAGE_PREFIX + key;
    let json;
    console.debug("Saving data to local storage", data);
    try {
      json = JSON.stringify(data);
    } catch (e) {
      console.error("error stringifying JSON for local storage", e);
      throw e;
    }
    localStorage.setItem(key, json);
  },
  getKeys() {
    let nKeys = localStorage.length;
    let keys = [];
    for (let i = 0; i < nKeys; i++) {
      let key = localStorage.key(i);
      if (key.startsWith(this.STORAGE_PREFIX)) {
        key = key.slice(this.STORAGE_PREFIX.length);
        keys.push(key);
      }
    }
    return keys;
  },
  get savesExist() {
    return this.getKeys().length > 0
  },
}

class SheetControls {
  constructor(storageManager, sheet) {
    this.storageManager = storageManager;
    this.sheet = sheet;

    let div = this.div = $.div("controls");
    div.innerHTML = `
      <button id="saveAsBtn">Save as</button>
      <button id="saveBtn">Save</button>
      <select id="loadSelect"></select>
      <button id="loadBtn">Load</button>
    `;
    this.saveAsBtn = div.querySelector("#saveAsBtn");
    this.saveAsBtn.onclick = this.saveAsBtn_click.bind(this);

    this.saveBtn = div.querySelector("#saveBtn");
    this.saveBtn.onclick = this.saveBtn_click.bind(this);

    this.loadSelector = div.querySelector("#loadSelect");

    this.loadBtn = div.querySelector("#loadBtn");
    this.loadBtn.onclick = this.loadBtn_click.bind(this);
  }

  updateLoadSelector(selected = null) {
    this.loadSelector.replaceChildren(
      ...this.storageManager.getKeys().map(saveKey => new Option(saveKey, saveKey))
    );
    if (selected !== null) {
      this.loadSelector.value = selected;
    }
  }

  saveAsBtn_click() {
    let name = prompt("Enter save name:");
    if (this.storageManager.getKeys().includes(name)) {
      throw {invalidMsg: "That name is already in use - not saving"};
    }
    try {
      this.doSave(name);
    } catch (e) {
      console.error("save error", e);
      if (e?.invalidMsg) {
        alert(e.invalidMsg);
      } else {
        alert(`Unknown error while saving: ${e.toString()}`);
      }
    }
  }

  saveBtn_click() {
    let name = this.selectedSave;
    try {
      this.doSave(name);
    } catch (e) {
      console.error("save error", e);
      if (e?.invalidMsg) {
        alert(e.invalidMsg);
      } else {
        alert(`Unknown error while saving: ${e.toString()}`);
      }
    }
  }

  doSave(name) {
    console.log("Saving ${name}")
    if (name === null || name === undefined) {
      throw "name is null";
    }
    if (name.trim() === "" || !name) {
      throw {invalidMsg: "Invalid name. You must enter a non-blank save name."};
    }
    this.storageManager.save(this.sheet.values, name);
    this.updateLoadSelector(name);
  }

  loadBtn_click() {
    let name = this.loadSelector.value;
    try {
      this.doLoad(name);
    } catch (e) {
      console.error("load error", e);
      alert(`Error loading save: ${e.toString()}`);
    }
  }

  doLoad(name) {
    let values = this.storageManager.load(name);
    if (values === null) {
      throw `Unable to load stored key ${key}`
    }
    this.sheet.load(values);
    this.sheet.recalc();
  }

  get selectedSave() {
    if (this.storageManager.savesExist) {
      return this.loadSelector.value;
    }
    return null;
  }
}

class SheetTable {
  constructor(rows, cols, sheet) {
    this.rows = rows;
    this.cols = cols;
    this.sheet = sheet;
    this.table = $.create("table");
  }

  reset() {
    let element;
    for (element of this.table.getElementsByTagName("input")) {
      element.value = "";
      element.setAttribute("class", "");
    }
    for (element of this.table.getElementsByTagName("div")) {
      element.textContent = "";
      element.setAttribute("class", "");
    }
    for (element of this.table.getElementsByTagName("td")) {
      element.setAttribute("class", "");
    }
  }

  fillTable() {
    let tableHeader = $.tr();
    let resetButton = $.button("↻");
    resetButton.onclick = () => {
      this.sheet.reset();
      this.reset();
    }
    tableHeader.append(resetButton);
    this.table.replaceChildren(tableHeader);

    // generate column headers
    let colNames = [];
    for (let colNum = 0; colNum < this.cols; colNum++) {
      let colName = columnName(colNum);
      colNames.push(colName);

      let colHeader = $.th(colName);
      tableHeader.append(colHeader);
    }

    // generate each row
    for (let rowNum = 1; rowNum <= this.rows; rowNum++) {
      let tableRow = $.tr();
      tableRow.appendChild($.th(rowNum));

      colNames.forEach(colName => {
        tableRow.append(this.makeCell(colName, rowNum));
      })

      this.table.append(tableRow);
    }
  }

  makeCell(col, row) {
    let cell = $.td();
    let cellId = `${col}${row}`

    let input = $.input(this.cellInputId(cellId));

    let val;
    if (cellId in this.sheet.values) {
      val = this.sheet.values[cellId];
    } else {
      val = this.sheet.values[cellId] = undefined;
    }
    if (val !== undefined) {
      input.value = val;
    }

    // save input data and recalculate
    input.onchange = () => {
      this.sheet.update(cellId, input.value);
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
    return `${this.table.id}_input_${coord}`
  }

  cellDivId(coord) {
    return `${this.table.id}_output_${coord}`
  }

  updateCell(coord, val) {
    let divId = this.cellDivId(coord);
    let div = $.id(divId);
    if (div === null) {
      console.error("no <div> for", coord, "with id", divId);
      return;
    }
    let td = div.parentElement;

    div.innerText = "";
    td.className = "";

    if (val === undefined) {
      return;
    }

    // if there's an error for the cell, display it and move on
    if (val?.error) {
      td.className = "error";
      div.textContent = val.error;
      return;
    }

    div.innerText = val.value;

    if ('type' in val) {
      switch (val.type) {
        case 'empty':
          div.innerText = "";
          td.className = "empty";
          break;
        case 'number':
          break;
        case 'string':
          td.className = "text";
          div.innerText = val.value;
          break;
        case 'boolean':
          td.className = "boolean";
          div.innerText = val.value ? "TRUE" : "FALSE";
          break;
        case 'function':
          td.className = "function";
          div.innerText = val.value;
          break;
        case 'error':
          td.className = "error";
          div.textContent = val.error;
          break;
        case 'object':
        case 'array':
          td.className = "function";
          div.innerText = JSON.stringify(val.value);
          break;
        default:
          td.className = "error";
          div.textContent = `Unknown type ${val.type}: ${val.value}`;
      }
    }
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

  constructor(divElement, options = {}, values = null,
              storageManager = StorageManager,
              sheetControls = SheetControls,
              worker = TimedWorker) {
    if (!(divElement instanceof HTMLDivElement)) {
      throw `Sheetable expects an HTMLDivElement but got ` +
        `${divElement} of type ${utils.getType(divElement)}`;
    }
    this.divElement = divElement;
    this.options = Object.assign(this.getDefaults(), options);

    this.storageManager = storageManager;

    this.sheetControls = new sheetControls(storageManager, this);
    this.controls = this.sheetControls.div;

    this.sheetControls.updateLoadSelector();

    this.sheetTable = new SheetTable(
      this.options.numRows, this.options.numCols, this
    );
    this.tableElement = this.sheetTable.table;

    divElement.replaceChildren(this.controls, this.tableElement);

    this.initialLoad(values);

    this.worker = new worker(
      // We have to explicitly bind these methods to `this` or `this` will be
      // unitialized in their scope when they're called.
      this.workerCallback.bind(this),
      this.workerTimeout.bind(this),
      this.recalc.bind(this),
    );
  }

  initialLoad(values) {
    if (values !== null) {
      this.load(values);
      return;
    }

    let saveName = this.sheetControls.selectedSave;
    if (saveName === null) {
      // no save exists
      this.load({});
      this.sheetControls.doSave("Default")
      return;
    }
    values = this.storageManager.load(saveName);
    if (values === null) {
      this.load({});
      return;
    }

    this.load(values);
  }

  load(values) {
    this.values = values ?? {};
    this.sheetTable.fillTable();
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
      let val = vals[coord];
      this.sheetTable.updateCell(coord, val);
    }
  }

  reset(data = null) {
    this.values = data ?? {};
    this.storageManager.save(this.values, this.sheetControls.selectedSave);
  }

  update(cellId, value) {
    console.debug("updating %s with value %s", cellId, value);
    this.values[cellId] = value;
    this.recalc();
    this.storageManager.save(this.values);
  }

}