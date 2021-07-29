(function(window) {
  window.$scope = {
    sheet: {},
    worker: null,
  };
  window.onload = function() {
    Spreadsheet(window.$scope);
  }
  window.spreadsheetReset = function() {
    reset();
    calc();
  }

  // clear values and reset sheet data
  function reset() {
    $scope.sheet = { A1: 1874, B1: "+", C1: 2046, D1: "⇒", E1: "=A1+C1" };
    for (var input of document.getElementsByTagName("input")) {
      input.value = "";
      input.setAttribute("class", "");
    }
    for (var div of document.getElementsByTagName("div")) {
      div.textContent = "";
      div.setAttribute("class", "");
    }
  }

  // get sheet data from local storage and create a worker
  function init() {
    $scope.worker = new Worker("worker.js");
    let saveData = JSON.parse(localStorage.getItem(""));
    if (saveData) {
      $scope.sheet = saveData;
      return;
    }
    reset();
  }

  function calc() {
    // populate input values and flag cells containing formulas
    Object.getOwnPropertyNames($scope.sheet).forEach(function (coord) {
      var input = document.querySelector("#" + coord);
      if (input === null) {
        console.warn("null input for", coord);
        return;
      }
      // set the corresponding input value, cast to a string
      input.value = "" + $scope.sheet[coord];
      // set the parent element class if it has a formula
      input.parentElement.setAttribute(
        "class",
        /^=/.exec(input.value[0]) ? "formula" : ""
      );
    });

    // serialize sheet data for insert into local storage
    var json = JSON.stringify($scope.sheet);

    // If the worker has not returned in 99 milliseconds, terminate it
    var promise = setTimeout(function () {
      $scope.worker.terminate();
      init();
      calc();
    }, 99);

    // When the worker returns, apply its effect on the scope
    $scope.worker.onmessage = function (message) {
      var errs = message.data[0],
        vals = message.data[1];
      clearTimeout(promise);
      localStorage.setItem("", json);
      // iterate over each div
      Object.getOwnPropertyNames(vals).forEach(function (coord) {
        var div = document.querySelector("#_" + coord);
        if (div === null) {
          console.warn("null div for", coord);
          return;
        }
        div.setAttribute(
          "class",
          errs[coord] ? "error" : vals[coord][0] ? "text" : ""
        );
        div.textContent = errs[coord] || vals[coord];
      });
    };

    // Post the current sheet content for the worker to process
    $scope.worker.postMessage($scope.sheet);
  }

  function Spreadsheet($scope) {
    init();

    let colNames = [];
    // create columns in $scope and as elements
    for (
      var col = "A";
      col <= "H";
      col = String.fromCharCode(col.charCodeAt() + 1)
    ) {
      var th = document.createElement("th");
      th.id = `col${col}`;
      th.textContent = col;
      document.querySelector("tr").appendChild(th);
      colNames.push(col);
    }

    // create rows in $scope
    for (let row = 1; row <= 20; row++) {
      // set row headers
      var th = document.createElement("th");
      th.innerHTML = row;
      var tr = document.createElement("tr");
      tr.id = `row${row}`;
      tr.appendChild(th);

      // create individual cells
      colNames.forEach(function (col) {
        var td = document.createElement("td");
        tr.appendChild(td);

        var input = document.createElement("input");
        input.setAttribute("id", col + row);
        // initialize sheet data
        if (!(col + row in $scope.sheet)) {
          $scope.sheet[col + row] = "";
        }

        input.onchange = input.oninput = input.onpaste = function() {
          if (row == 21) {
            debugger;
          }
          $scope.sheet[col + row] = input.value;
          calc();
        }

        input.addEventListener("keydown", function (event) {
          switch (event.which) {
            case 38:  // ArrowUp
            case 40:  // ArrowDown
            case 13:  // Enter
              var direction = event.which === 38 ? -1 : +1;
              (
                document.querySelector("#" + col + (row + direction)) ||
                event.target
              ).focus();
          }
        });

        var div = document.createElement("div");
        div.setAttribute("id", "_" + col + row);
        div.onclick = function() {
          input.focus();
        }
        td.appendChild(input);
        td.appendChild(div);
      });

      document.querySelector("table").appendChild(tr);
    }

    // Start calculation when worker is ready
    $scope.worker.onmessage = calc;
    $scope.worker.postMessage(null);
  }


})(window);