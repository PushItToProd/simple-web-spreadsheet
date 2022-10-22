import * as HTML from './html.js';

// helper for turning a numeric column index into a letter column name, so
// columnName(0) = 'A', columnName(1) = 'B', and so on
function columnName(i) {
  const A = 'A'.charCodeAt(0);
  return String.fromCharCode(A + i);  // TODO: handle i>= 26
}

// SheetControls is the UI component containing the top control strip elements
// for loading, saving, etc.
export class SheetControls {
  #loadSelector;
  constructor(storageManager, sheet) {
    this.storageManager = storageManager;
    this.sheet = sheet;

    let div = this.div = HTML.createDiv("controls");
    div.innerHTML = `
      <button id="createNewBtn">Create New</button>
      <button id="saveAsBtn">Save as</button>
      <button id="saveBtn">Save</button>
      <select id="loadSelect"></select>
      <button id="renameBtn">Rename</button>
      <button id="deleteBtn">Delete</button>
    `;
    let createNewBtn = div.querySelector("#createNewBtn");
    createNewBtn.onclick = this.#createNewBtn_click.bind(this);

    let saveAsBtn = div.querySelector("#saveAsBtn");
    saveAsBtn.onclick = this.#saveAsBtn_click.bind(this);

    let saveBtn = div.querySelector("#saveBtn");
    saveBtn.onclick = this.#saveBtn_click.bind(this);

    this.#loadSelector = div.querySelector("#loadSelect");
    this.#loadSelector.onchange = this.#loadSelector_change.bind(this);

    let renameBtn = div.querySelector("#renameBtn");
    renameBtn.onclick = this.#renameBtn_click.bind(this);

    let deleteBtn = div.querySelector("#deleteBtn");
    deleteBtn.onclick = this.#deleteBtn_click.bind(this);

    this.updateLoadSelector(this.storageManager.lastSave);
  }

  // rootElement returns the HTML element to be embedded in the UI container.
  rootElement() {
    return this.div;
  }

  // updateLoadSelector updates the <select> dropdown with the names of saved
  // sheets from StorageManager. If `selected` is not null, it changes the
  // currently selected value to the given sheet name.
  updateLoadSelector(selected = null) {
    let saveKeys = this.storageManager.getKeys();
    this.#loadSelector.replaceChildren(
      ...saveKeys.map(saveKey => new Option(saveKey, saveKey))
    );
    if (selected !== null) {
      if (saveKeys.includes(selected)) {
        this.#loadSelector.value = selected;
      } else {
        console.error("updateLoadSelector called with nonexistent save key:", selected);
      }
    }
  }

  #createNewBtn_click() {
    this.sheet.load({});
    this.sheet.recalc();
    this.doSave("Untitled");
  }

  #saveAsBtn_click() {
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

  #saveBtn_click() {
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
    console.log(`Saving ${name}`)
    if (name === null || name === undefined) {
      throw "name is null";
    }
    if (name.trim() === "" || !name) {
      throw {invalidMsg: "The sheet name must not be blank"};
    }
    this.storageManager.save(this.sheet.values, name);
    this.updateLoadSelector(name);
  }

  #loadSelector_change() {
    let name = this.#loadSelector.value;
    try {
      this.#doLoad(name);
      this.storageManager.lastSave = name;
    } catch (e) {
      console.error("load error", e);
      alert(`Error loading save: ${e.toString()}`);
    }
  }

  #doLoad(name) {
    let values = this.storageManager.load(name);
    if (values === null) {
      throw `Unable to load stored key ${key}`
    }
    this.sheet.load(values);
    this.sheet.recalc();
  }

  #deleteBtn_click() {
    let name = this.selectedSave;
    let resp = confirm(`Are you sure you want to delete '${name}'?`);
    if (!resp) {
      return;
    }
    this.storageManager.delete(name);
    this.updateLoadSelector();
    this.#loadSelector_change();
  }

  #renameBtn_click() {
    let name = prompt("Enter new name:", this.selectedSave ?? "");
    try {
      this.#doRename(name);
    } catch (e) {
      console.error("rename error", e);
      alert(`Error renaming: ${e.toString()}`);
    }
  }

  #doRename(newName) {
    let currentName = this.selectedSave;
    this.doSave(newName);
    this.storageManager.delete(currentName);
    this.updateLoadSelector(newName);
    this.storageManager.lastSave = newName;
  }

  get selectedSave() {
    if (this.storageManager.savesExist) {
      return this.#loadSelector.value;
    }
    return null;
  }
}

// SheetTable is the UI component containing all the spreadsheet inputs and
// outputs. Everything is displayed in a table where each <td> contains an
// <input> for the user to enter values when the cell is selected and a <div> to
// display the output when the cell is not selected.
export class SheetTable {
  constructor(rows, cols, sheet) {
    this.rows = rows;
    this.cols = cols;
    this.sheet = sheet;
    this.table = HTML.create("table");
  }

  // rootElement returns the HTML element to be embedded in the UI container.
  rootElement() {
    return this.table;
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
  // and each cell's contents using #makeCell
  fillTable() {
    let tableHeader = HTML.createTr();
    let resetButton = HTML.createButton("↻");
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

      let colHeader = HTML.createTh(colName);
      tableHeader.append(colHeader);
    }

    // generate each row
    for (let rowNum = 1; rowNum <= this.rows; rowNum++) {
      let tableRow = HTML.createTr();
      tableRow.appendChild(HTML.createTh(rowNum));

      colNames.forEach(colName => {
        tableRow.append(this.#makeCell(colName, rowNum));
      })

      this.table.append(tableRow);
    }
  }

  // #makeCell generates the <input> and <div> for each cell
  #makeCell(col, row) {
    let cell = HTML.createTd();
    let cellId = `${col}${row}`

    let input = HTML.createInput(this.#cellInputId(cellId));

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
          id = this.#cellInputId(`${col}${row-1}`);
          break;
        case "ArrowDown":
        case "Enter":
          id = this.#cellInputId(`${col}${row+1}`);
          break;
        default:
          return;
      }
      id = `#${id}`;
      HTML.focus(id);
    }

    cell.append(input);
    let div = HTML.createDiv(this.#cellDivId(cellId));
    div.addEventListener('click', event => {
      input.focus();
    });
    cell.append(div);

    return cell;
  }

  // #cellInputId generates the id of the <input> for a given cell coordinate
  #cellInputId(coord) {
    return `${this.table.id}_input_${coord}`
  }

  // #cellDivId generates the id of the <div> for a given cell coordinate
  #cellDivId(coord) {
    return `${this.table.id}_output_${coord}`
  }

  // updateCell renders an output value for the given cell coordinate
  updateCell(coord, val) {
    let divId = this.#cellDivId(coord);
    let div = HTML.getId(divId);
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

// SheetUI is the root of the app UI.
export default class SheetUI {
  constructor(
              {
                sheet,
                options,
                parentDiv,
                storageManager = StorageManager,
                sheetControls = SheetControls,
                sheetTable = SheetTable
              } = {}) {
    this.parentDiv = parentDiv;
    this.sheetControls = new sheetControls(storageManager, sheet);

    this.sheetTable = new sheetTable(
      options.numRows,
      options.numCols,
      sheet
    );

    parentDiv.replaceChildren(
      this.sheetControls.rootElement(),
      this.sheetTable.rootElement(),
    );
  }
}

