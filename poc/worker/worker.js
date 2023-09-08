// worker.js runs in a web worker in the background to asynchronously perform
// the calculations defined by the formula.

// math.js is used to perform the calculations and acts as a sandbox for the
// formula commands.
self.importScripts("../vendor/math.js");

// Entry point for handling requests from the main window.
self.onmessage = function(message) {
  let sheetVals = message.data || {};

  let vals = evalSheet(sheetVals);

  postMessage({vals});
};

// evalSheet is the main entrypoint for the worker and handles computing the
// result for each cell in the sheet
function evalSheet(sheetVals) {
  console.debug("evaluating sheet:", sheetVals);
  let scope = FormulaScope(sheetVals);
  let results = [];

  for (let coord in sheetVals) {
    results[coord] = getResult(scope, coord);
  }
  console.debug("evaluated scope:", scope);
  return results;
}

// getResult takes a FormulaScope `scope` and a cell reference `coord`,
// evaluates the given cell's value, and returns the result. It then processes
// the return value into a serializable object annotated with the type of the
// value, which is used in the UI to determine how the value should be
// displayed.
function getResult(scope, coord) {
  let value;

  // If the given cell in the sheet is empty, return an empty value.
  if (!scope.sheet[coord]) {
    return {type: 'empty'};
  }

  // Get the value from the given coordinate. if there is a formula in the
  // requested cell, scope.get() will evaluate it, in which case there could be
  // an error.
  try {
    value = scope.get(coord);
  } catch (e) {
    console.warn("eval failed at coordinate", coord, "with error", e);
    // XXX can't quite remember why I overwrite scope.vals[coord] here.
    return scope.vals[coord] = {type: 'error', error: e.toString()};
  }

  // Determine the type of the object.
  // TODO: factor out this bit of logic to a separate function for cleanliness
  let type = undefined;
  if (typeof value === "string" || value instanceof String) {
    return {type: 'string', value};
  } else if (typeof value === "number" || typeof value === "bigint") {
    type = 'number';
    return {type: 'number', value};
  } else if (typeof value === "boolean") {
    return {type: 'boolean', value};
  } else if (typeof value === "function") {
    return {type: 'function', value: scope.sheet[coord]};
  } else if (Array.isArray(value)) {
    return {type: 'array', value};
  } else if (value instanceof math.Matrix) {
    return {type: 'array', value: value._data};
  } else if (value instanceof math.Complex) {
    return {type: 'complex', value: value};
  } else if (typeof value === "object") {
    return {type: 'object', value};
  } else {
    console.error("value has unknown type", value);
    return {type: 'error', error: 'invalid type'};
  }
}

// RecursionError is raised when a circular reference is found.
class RecursionError extends Error {
  constructor(message) {
    super(message);
    this.name = "RecursionError";
  }
}

// Pending is used to denote formula values that have been requested from
// FormulaScope but not yet evaluated with math.evaluate(). This allows
// recursion to be detected and prevented.
const Pending = Symbol("Pending");

// FormulaScope is a Map-like object that wraps the sheetVals object and
// evaluates expression values when cells containing formulas are requested.
//
// The trick here is that FormulaScope passes itself to math.evaluate() as the
// scope for expression evaluation. When math.evaluate() encounters a variable
// reference, it checks the provided scope for that variable, invoking
// FormulaScope again. If the value is defined and has already been evaluated,
// FormulaScope returns the cached result of the previous calculation, but if
// not, it performs the calculation on demand and returns the result. Thus,
// cells can reference one another in any arbitrary order and the calculation
// will succeed as long as there isn't a circular reference.
function FormulaScope(sheet) {
  // Initialize objects for storing all computation results and variable values.
  let vals = {};  // computation results
  let vars = {};  // dynamically assigned values

  // This object is passed to math.js as the scope for expression evaluation. It
  // has to implement the methods set(), get(), has(), and keys() for math.js to
  // recognize it as a Map object.
  // https://github.com/josdejong/mathjs/blob/5754478f168b67e9774d4dfbb5c4f45ad34f97ca/src/utils/map.js#L90
  return {
    // vals holds the evaluated value of each cell.
    vals,
    // sheet is the original contents of the sheet.
    sheet,
    // vars contains dynamically-assigned variable values.
    vars,

    // set handles assignment of variable values.
    set(key, value) {
      if (key in sheet) {
        throw `Error: cannot assign to reserved key ${key}`
      }
      vars[key] = value;
    },

    // keys returns all keys in the object.
    keys() {
      // We provide the list of named cells in the sheet and the list of all
      // variable names currently known.

      // XXX I think this might cause weird behavior if a variable is set in a
      // cell that comes after the current one.
      return Object.keys(sheet).concat(Object.keys(vars));
    },

    // has returns whether the given key is defined.
    has(key) {
      return key in sheet || key in vars;
    },

    // get returns the value of the given key. This is where the magic happens.
    get(key) {
      // Return defined variables as-is.
      if (key in vars) {
        return vars[key];
      }
      // Return already-computed values.
      if (key in vals) {
        let val = vals[key];

        // Cell values are set to Pending during evaluation, so if we find a
        // Pending value, that means we've found a circular reference.
        if (val === Pending) {
          let error = new RecursionError(key);
          vals[key] = error.toString();
          throw error;
        }

        // propagate errors across cells
        if (val?.error) {
          // TODO create a TransitiveError class to capture this
          throw val.error;
        }

        return vals[key];
      }

      // Ensure the key actually exists in the sheet.
      if (!(key in sheet)) {
        // XXX I feel like this should perhaps raise an error, especially since
        // we throw a ReferenceError immediately after this if the value is
        // present but undefined.
        return undefined;
      }

      // Get the verbatim text entered by the user in the sheet.
      let sheetVal = sheet[key];
      if (sheetVal === undefined || sheetVal === '') {
        throw ReferenceError(`${key} is empty`)
      }

      // If the value isn't a formula, return it, first trying to coerce it to
      // a numeric value if possible.
      if (sheetVal[0] !== '=') {
        return vals[key] = value(sheetVal);
      }

      // At this point, the cell contains a formula that hasn't yet been
      // evaluated. To detect recursion, we set the value to Pending during
      // evaluation, so if another cell tries to use this cell's value we can
      // catch it and throw an error.
      vals[key] = Pending;  // prevent recursion

      // Get the raw formula value.
      let formula = sheetVal.slice(1);

      try {
        // Evaluate the formula with this object as the scope.
        vals[key] = math.evaluate(formula, this);
      } catch (e) {
        // If evaluation fails, persist the error and then throw it.
        vals[key] = {error: e.toString()};
        throw e;
      }

      // Evaluation succeeded. Return what we got.
      return vals[key];
    },
  }
}

// value tries to coerce a string value to a number, otherwise returning the
// value as-is if it's not a number or if coercion fails.
function value(val) {
  // Only try to coerce non-empty strings.
  if (!(typeof val === 'string' || val instanceof String) || val === "") {
    return val;
  }
  let n = +val;
  if (Number.isNaN(n))
    return val;
  return n;
}