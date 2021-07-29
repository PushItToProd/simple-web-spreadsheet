var sheet, errs, vals;
self.onmessage = function (message) {
  // reset state vars
  sheet = message.data || {};
  errs = {};
  vals = {};

  // define each sheet address as a property on self
  Object.getOwnPropertyNames(sheet).forEach(function (coord) {
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
        var x = +sheet[coord];
        if (sheet[coord] !== x.toString()) {
          x = sheet[coord];
        }

        // Evaluate formula cells that begin with =
        try {
          vals[coord] = "=" === x[0] ? eval.call(null, x.slice(1)) : x;
        } catch (e) {
          var match = /\$?[A-Za-z]+[1-9][0-9]*\b/.exec(e);
          if (match && !(match[0] in self)) {
            // The formula refers to a uninitialized cell; set it to 0 and retry
            self[match[0]] = 0;
            delete vals[coord];
            return self[coord];
          }
          // Otherwise, stringify the caught exception in the errs object
          errs[coord] = e.toString();
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
