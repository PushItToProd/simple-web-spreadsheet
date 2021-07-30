import * as math from 'mathjs';

function num(val) {
  let x = +val;
  if (x.toString() !== val) {
    return val;
  }
  return x;
}

function isFormula(val) {
  return val[0] === '=';
}

export function exec(data) {
  // return {A: 1, B: 2, C: 3};
  let vals = {}; let errs = {};

  let evaluator = {}
  for (let coord in data) {
    if (Object.getOwnPropertyDescriptor(evaluator, coord)) {
      continue;
    }
    Object.defineProperty(evaluator, coord, {
      get: function() {
        if (coord in vals) {
          return vals[coord];
        }

        vals[coord] = NaN;

        let rawVal = data[coord];

        // coerce numeric values to numbers
        let val = num(rawVal);

        // if it's not a formula, save it in vals and return
        if (!isFormula(val)) {
          return vals[coord] = val;
        }

        try {
          vals[coord] = math.evaluate(val.slice(1), evaluator);
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
      }
    })
  }

  for (let coord in data) {
    evaluator[coord];
  }

  return vals;
}