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

export function Sheetable(element, options = getDefaults(), data = {}) {
  if (!(element instanceof HTMLTableElement)) {
    throw `Sheetable expects an HTMLTableElement but got ` +
      `${element} of type ${utils.getType(element)}`;
  }

  console.log("Initializing sheet on element", element);

  let $sheet = {
    data: data,
    recalculate() {
      console.warning("TODO: recalculate")
    }
  };

  // generate the table elements
  fillTable(element, options, $sheet);
}

function fillTable(table, {numRows, numCols}, $sheet) {
  let tableHeader = $.tr();
  let resetButton = $.button("↻");
  resetButton.onclick = function() {
    alert('TODO')
  }
  tableHeader.append(resetButton);
  table.append(tableHeader);

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
      tableRow.append(makeCell(colName, rowNum, $sheet));
    })

    table.append(tableRow);
  }
}

function makeCell(col, row, $sheet) {
  let cell = $.td();
  let cellId = `${col}${row}`

  let input = $.input(cellId);
  input.id = cellId;

  // save input data
  input.onchange = input.oninput = input.onpaste = function() {
    $sheet.data[cellId] = input.value;
    $sheet.recalculate();
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