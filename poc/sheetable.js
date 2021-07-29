import * as utils from './utils.js';

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

function columnName(i) {
  const A = 'A'.charCodeAt(0);
  return String.fromCharCode(A + i);  // TODO: handle i>= 26
}

export function Sheetable(element, options = getDefaults()) {
  if (!(element instanceof HTMLTableElement)) {
    throw `Sheetable expects an HTMLTableElement but got ` +
      `${element} of type ${utils.getType(element)}`;
  }
  console.log("Initializing sheet on element", element);


  // generate the table elements
  buildTable(element, options);
}

function buildTable(table, {numRows, numCols}) {
  /*
  <table id="spreadsheet">
    <tr>
      <th>
        <button id="resetBtn" type="button" onclick="hello()">↻</button>
      </th>
    </tr>
  </table>
  */

  const headerRow = document.querySelector("tr");

  // first build the list of column names and the row of column header elements
  let cols = [];
  for (let col = 0; col < numCols; col++) {
    let colName = columnName(col);
    cols.push(colName);

    let colHeader = document.createElement("th");
    colHeader.textContent = colName;
    headerRow.appendChild(colHeader);
  }

  let rows = [];
  for (let i = 0; i < numRows; i++) {
    rows.push(i);
  }
}