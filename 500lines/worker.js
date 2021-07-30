var sheet, errs, vals;

self.importScripts("./utils.js");

self.onmessage = function (message) {
  // reset state vars
  sheet = message.data || {};
  errs = {};
  vals = {};

  // define each sheet address as a property on self
  forEachProperty(sheet, function (coord) {
    // Worker is reused across computations, so only define each variable once
    if ((Object.getOwnPropertyDescriptor(self, coord) || {}).get) {
      return;
    }

    // Define self['A1'], which is the same thing as the global variable A1
    Object.defineProperty(self, coord, {
      get: function () {
        if (coord in vals) {
          return vals[coord];
        }
        vals[coord] = NaN;

        // Turn numeric strings into numbers, so =A1+C1 works when both are numbers
        var sheetVal = tryCoerceNum(sheet[coord]);

        // Return non-formulas directly without evaluating
        if (!isFormula(sheetVal)) {
          return vals[coord] = sheetVal;
        }

        // Evaluate formula cells
        try {
          vals[coord] = eval(sheetVal.slice(1));
        } catch (e) {
          console.log("Evaluating", coord, "failed with", e);
          // Handle reference errors
          if (e instanceof ReferenceError) {
            // get the var name from the exception
            let refName = e.message.split(" ", 1)[0];
            console.log("Got reference error for var", refName);
            errs[coord] = `Bad Ref: ${refName}`;
          } else {
            // Otherwise, stringify the caught exception in the errs object
            errs[coord] = e.toString();
          }
          return NaN;
        }

        // Turn vals[coord] into a string if it's not a number or boolean
        switch (typeof vals[coord]) {
          case "function":
          case "object":
            vals[coord] += "";
        }
        return vals[coord];
      },
    });
  });

  // For each coordinate in the sheet, call the property getter defined above
  for (var coord in sheet) {
    self[coord];
  }
  postMessage([errs, vals]);
};
