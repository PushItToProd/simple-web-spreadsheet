import * as utils from './utils.js';
import * as $ from './html.js';

function columnName(i) {
  const A = 'A'.charCodeAt(0);
  return String.fromCharCode(A + i);  // TODO: handle i>= 26
}

// have to use a function because if we do
//    function (options = Defaults)
// where Defaults is an object, it'll retain a mutable reference to the object
// across invocations
function getDefaults() {
  return {
    numRows: 10,
    numCols: 10,
  }
}

export class Sheetable {
  constructor(tableElement, options = getDefaults(), inputs = {}) {
    if (!(tableElement instanceof HTMLTableElement)) {
      throw `Sheetable expects an HTMLTableElement but got ` +
        `${tableElement} of type ${utils.getType(tableElement)}`;
    }

    console.log("Initializing sheet on tableElement", tableElement);
    this.tableElement = tableElement;
    this.options = options;
    this.inputs = inputs;

    // generate the table elements
    console.log("calling fillTAble")
    this.fillTable();
  }

  recalculate() {
    console.warn("TODO: recalculate")
  }

  fillTable({numRows, numCols} = this.options) {
    console.log("fillTable")
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

    let input = $.input(cellId);
    input.id = cellId;

    // save input data
    input.onchange = input.oninput = input.onpaste = function() {
      this.inputs[cellId] = input.value;
      this.recalculate();
    }

    input.onkeydown = function(event) {
      let id;
      switch (event.key) {
        case "ArrowUp":
          id = `#${col}${row-1}`;
          break;
        case "ArrowDown":
        case "Enter":
          id = `#${col}${row+1}`;
          break;
        default:
          return;
      }
      $.focus(id);
    }

    cell.append(input);
    let div = $.div(`_${cellId}`);
    cell.append(div);

    return cell;
  }
}