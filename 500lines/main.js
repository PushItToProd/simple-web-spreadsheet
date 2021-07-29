(function(window) {
  window.$scope = {
    Rows: [],
    Cols: [],
    sheet: [],
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
    }
    for (var div of document.getElementsByTagName("div")) {
      div.textContent = "";
    }
  }

  // get sheet data from local storage and create a worker
  function init() {
    ($scope.sheet = JSON.parse(localStorage.getItem(""))) || reset();
    $scope.worker = new Worker("worker.js");
  }

  function calc() {
    // populate input values and flag cells containing formulas
    Object.getOwnPropertyNames($scope.sheet).forEach(function (coord) {
      var input = document.querySelector("#" + coord);
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

    // create columns in $scope and as elements
    for (
      var col = "A";
      col <= "H";
      col = String.fromCharCode(col.charCodeAt() + 1)
    ) {
      var th = document.createElement("th");
      th.textContent = col;
      document.querySelector("tr").appendChild(th);
      $scope.Cols.push(col);
    }

    // create rows in $scope
    for (var row = 1; row <= 20; row++) {
      $scope.Rows.push(row);
    }

    // create row elements
    $scope.Rows.forEach(function (row) {
      // set row headers
      var th = document.createElement("th");
      th.innerHTML = row;
      var tr = document.createElement("tr");
      tr.appendChild(th);

      // create individual cells
      $scope.Cols.forEach(function (col) {
        var td = document.createElement("td");
        tr.appendChild(td);

        var input = document.createElement("input");
        input.setAttribute("id", col + row);
        if (!(col + row in $scope.sheet)) {
          $scope.sheet[col + row] = "";
        }

        for (var event of ["change", "input", "paste"]) {
          input.addEventListener(event, function () {
            $scope.sheet[col + row] = input.value;
            calc();
          });
        }

        input.addEventListener("keydown", function (event) {
          switch (event.which) {
            case 38:
            case 40:
            case 13:
              var direction = event.which === 38 ? -1 : +1;
              (
                document.querySelector("#" + col + (row + direction)) ||
                event.target
              ).focus();
          }
        });

        var div = document.createElement("div");
        div.setAttribute("id", "_" + col + row);
        td.appendChild(input);
        td.appendChild(div);
      });

      document.querySelector("table").appendChild(tr);
    });

    // Start calculation when worker is ready
    $scope.worker.onmessage = calc;
    $scope.worker.postMessage(null);
  }


})(window);