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

export function Sheetable(element, options = getDefaults()) {
  if (!(element instanceof HTMLTableElement)) {
    throw `Sheetable expects an HTMLTableElement but got ` +
      `${element} of type ${utils.getType(element)}`;
  }
  console.log("Initializing sheet on element", element);


  // generate the table elements
  fillTable(element, options);
}

function fillTable(table, {numRows, numCols}) {
  // build the list of column names and the row of column header elements,
  // appending each element to the header row
  const tableHeader = document.querySelector("tr");
  let colNames = [];
  for (let colNum = 0; colNum < numCols; colNum++) {
    let colName = columnName(colNum);
    colNames.push(colName);

    let colHeader = $.th(colName);
    tableHeader.append(colHeader);
  }

  // generate each row
  for (let rowNum = 0; rowNum < numRows; rowNum++) {
    let tableRow = $.tr();
    tableRow.appendChild($.th(rowNum));

    colNames.forEach(col => {
      let cell = $.td();
      tableRow.append(cell);

      //let input = document.createElement("input");
      let div = document.createElement("div");
      div.setAttribute("id", "_" + col + rowNum);
      div.innerHTML = "" + col + rowNum;
      cell.append(div);
    })
    table.append(tableRow);
  }
}