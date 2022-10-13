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

// StorageManager handles loading and saving sheets saved in localStorage.
const StorageManager = {
  STORAGE_PREFIX: "sheetData_",
  LAST_SAVE_KEY: "sheetConfig_lastSave",

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
  delete(key) {
    key = this.STORAGE_PREFIX + key;
    localStorage.removeItem(key);
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

  get lastSave() {
    return localStorage.getItem(this.LAST_SAVE_KEY);
  },

  set lastSave(val) {
    localStorage.setItem(this.LAST_SAVE_KEY, val);
  },
}

// SheetControls is the UI component containing the top control strip elements
// for loading, saving, etc.
class SheetControls {
  constructor(storageManager, sheet) {
    this.storageManager = storageManager;
    this.sheet = sheet;

    let div = this.div = $.div("controls");
    div.innerHTML = `
      <button id="saveAsBtn">Save as</button>
      <button id="saveBtn">Save</button>
      <select id="loadSelect"></select>
      <button id="renameBtn">Rename</button>
      <button id="deleteBtn">Delete</button>
    `;
    this.saveAsBtn = div.querySelector("#saveAsBtn");
    this.saveAsBtn.onclick = this.saveAsBtn_click.bind(this);

    this.saveBtn = div.querySelector("#saveBtn");
    this.saveBtn.onclick = this.saveBtn_click.bind(this);

    this.loadSelector = div.querySelector("#loadSelect");
    this.loadSelector.onchange = this.loadSelector_change.bind(this);

    this.renameBtn = div.querySelector("#renameBtn");
    this.renameBtn.onclick = this.renameBtn_click.bind(this);

    this.deleteBtn = div.querySelector("#deleteBtn");
    this.deleteBtn.onclick = this.deleteBtn_click.bind(this);

    this.updateLoadSelector(this.storageManager.lastSave);
  }

  updateLoadSelector(selected = null) {
    let saveKeys = this.storageManager.getKeys();
    this.loadSelector.replaceChildren(
      ...saveKeys.map(saveKey => new Option(saveKey, saveKey))
    );
    if (selected !== null) {
      if (saveKeys.includes(selected)) {
        this.loadSelector.value = selected;
      } else {
        console.error("updateLoadSelector called with nonexistent save key:", selected);
      }
    }
  }

  saveAsBtn_click() {
    let name = prompt("Enter save name:");
    if (this.storageManager.getKeys().includes(name)) {
      throw {invalidMsg: "That name is already in use - not saving"};
    }
    try {
      this.doSave(name);
      this.storageManager.lastSave = name;
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

  loadSelector_change() {
    let name = this.loadSelector.value;
    try {
      this.doLoad(name);
      this.storageManager.lastSave = name;
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

  deleteBtn_click() {
    let name = this.selectedSave;
    let resp = confirm(`Are you sure you want to delete '${name}'?`);
    if (!resp) {
      return;
    }
    this.storageManager.delete(name);
    this.updateLoadSelector();
    this.loadSelector_change();
  }

  renameBtn_click() {
    let name = prompt("Enter new name:", this.selectedSave ?? "");
    try {
      this.doRename(name);
    } catch (e) {
      console.error("rename error", e);
      alert(`Error renaming: ${e.toString()}`);
    }
  }

  doRename(newName) {
    let currentName = this.selectedSave;
    this.doSave(newName);
    this.storageManager.delete(currentName);
    this.updateLoadSelector(newName);
    this.storageManager.lastSave = newName;
  }

  get selectedSave() {
    if (this.storageManager.savesExist) {
      return this.loadSelector.value;
    }
    return null;
  }
}

// SheetTable is the UI component containing all the spreadsheet inputs and
// outputs. Everything is displayed in a table where each <td> contains an
// <input> for the user to enter values when the cell is selected and a <div> to
// display the output when the cell is not selected.
class SheetTable {
  constructor(rows, cols, sheet) {
    this.rows = rows;
    this.cols = cols;
    this.sheet = sheet;
    this.table = $.create("table");
  }

  // reset wipes all the inputs and outputs of their values and CSS classes
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

  // fillTable generates the table headers, rows, and columns, the reset button,
  // and each cell's contents using makeCell
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

  // makeCell generates the <input> and <div> for each cell
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

    // XXX maybe factor input handlers out into class methods

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

  // cellInputId generates the id of the <input> for a given cell coordinate
  cellInputId(coord) {
    return `${this.table.id}_input_${coord}`
  }

  // cellDivId generates the id of the <div> for a given cell coordinate
  cellDivId(coord) {
    return `${this.table.id}_output_${coord}`
  }

  // updateCell renders an output value for the given cell coordinate
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

// Sheetable is the root class for the spreadsheet. It sets up the UI components
// and the
export class Sheetable {
  // have to use a function for getDefaults because if we do
  //    function (options = Defaults)
  // where Defaults is an object, it'll retain a mutable reference to the object
  // across invocations
  getDefaults() {
    return {
      numRows: 10,
      numCols: 10,
    }
  }

  constructor(parentDiv, options = {},
              storageManager = StorageManager,
              sheetControls = SheetControls,
              sheetTable = SheetTable,
              worker = TimedWorker) {
    if (!(parentDiv instanceof HTMLDivElement)) {
      throw `Sheetable expects an HTMLDivElement but got ` +
        `${parentDiv} of type ${utils.getType(parentDiv)}`;
    }
    this.parentDiv = parentDiv;
    this.options = Object.assign(this.getDefaults(), options);

    this.storageManager = storageManager;

    this.sheetControls = new sheetControls(storageManager, this);
    this.controls = this.sheetControls.div;

    this.sheetTable = new sheetTable(
      this.options.numRows, this.options.numCols, this
    );
    this.tableElement = this.sheetTable.table;

    parentDiv.replaceChildren(this.controls, this.tableElement);

    this.initialLoad();

    this.worker = new worker(
      // We have to explicitly bind these methods to `this` or `this` will be
      // uninitialized in their scope when they're called.
      this.workerCallback.bind(this),
      this.workerTimeout.bind(this),
      this.recalc.bind(this),
    );
  }

  initialLoad() {
    let saveName = this.sheetControls.selectedSave;
    if (saveName === null) {
      // no save exists
      this.load({});
      this.sheetControls.doSave("Default")
      return;
    }
    let values = this.storageManager.load(saveName);
    if (values === null) {
      this.load({});
      return;
    }

    this.load(values);
  }

  // load imports a full set of data and updates the table with the values
  load(values) {
    this.values = values ?? {};
    this.sheetTable.fillTable();
  }

  // trigger the worker to recalculate the values -- upon success,
  // workerCallback will be triggered
  recalc() {
    this.worker.send(this.values);
  }

  // workerTimeout is called when the worker times out
  workerTimeout() {
    console.error("worker timed out");
    // TODO display an error somewhere
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

  // reset is called when the user clicks the reset button
  reset(data = null) {
    this.values = data ?? {};
  }

  // update is called when the user enters a value into a cell
  update(cellId, value) {
    console.debug("updating %s with value %s", cellId, value);
    this.values[cellId] = value;
    this.recalc();
    // FIXME either don't save or use the current save name here
    this.storageManager.save(this.values, "AutoSave");
  }

}