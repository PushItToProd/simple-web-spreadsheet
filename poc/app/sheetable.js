import * as utils from './utils.js';
import TimedWorker from './TimedWorker.js';
import StorageManager from './StorageManager.js';
import SheetUI, { ForceOverwrite } from './SheetUI.js';

const WORKER_SCRIPT = "./worker/worker.js";

// Sheetable is the root class for the spreadsheet. It sets up the UI
// components, local storage interface, and worker, and handles interactions
// between them.
export class Sheetable {
  DEFAULTS = {
    numRows: 10,
    numCols: 10,
  }

  constructor(parentDiv, options = {},
              {
                sheetUI = SheetUI,
                storageManager = StorageManager,
                worker = TimedWorker,
              } = {}) {
    if (!(parentDiv instanceof HTMLDivElement)) {
      throw `Sheetable expects an HTMLDivElement but got ` +
        `${parentDiv} of type ${utils.getType(parentDiv)}`;
    }
    this.options = Object.assign({}, this.DEFAULTS, options);

    this.storageManager = storageManager;

    this.ui = new sheetUI({
      sheet: this,
      options: this.options,
      parentDiv,
      storageManager,
    });

    this.initialLoad();

    // XXX sorta feels like we could use a wrapper here
    this.worker = new worker(
      WORKER_SCRIPT,
      // We have to explicitly bind these methods to `this` or `this` will be
      // uninitialized in their scope when they're called.
      this.workerCallback.bind(this),
      this.workerTimeout.bind(this),
      this.recalc.bind(this),
    );
  }

  // initialLoad performs the first load when the sheet is still blank
  initialLoad() {
    let saveName = this.ui.sheetControls.selectedSave;
    if (saveName === null) {
      // no save exists
      this.load({});
      this.ui.sheetControls.doSave("Default", ForceOverwrite)
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
    this.ui.sheetTable.fillTable();
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
    console.debug("got callback from worker", message);
    let {vals} = message.data;
    for (let coord in vals) {
      let val = vals[coord];
      this.ui.sheetTable.updateCell(coord, val);
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