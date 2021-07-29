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

function tr() {
  return document.createElement("tr");
}

function th(text = null) {
  let e = document.createElement("th");
  if (text !== null) {
    e.textContent = text;
  }
  return e
}

function td(text = null) {
  let e =  document.createElement("td");
  if (text !== null) {
    e.textContent = text;
  }
  return e;
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
  /*
  <table id="spreadsheet">
    <tr>
      <th>
        <button id="resetBtn" type="button" onclick="hello()">↻</button>
      </th>
    </tr>
  </table>
  */

  // build the list of column names and the row of column header elements,
  // appending each element to the header row
  const tableHeader = document.querySelector("tr");
  let colNames = [];
  for (let colNum = 0; colNum < numCols; colNum++) {
    let colName = columnName(colNum);
    colNames.push(colName);
    tableHeader.appendChild(th(colName));
  }
  console.log("Columns:", colNames);

  // generate each row
  for (let rowNum = 0; rowNum < numRows; rowNum++) {
    console.log("Adding row:", rowNum);
    let tableRow = tr();
    tableRow.appendChild(th(rowNum));

    colNames.forEach(col => {
      let cell = td();
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