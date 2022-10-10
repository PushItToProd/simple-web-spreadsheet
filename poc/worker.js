self.importScripts("math.js");

function isString(o) {
  return typeof o === 'string' || o instanceof String;
}

function isFormula(val) {
  return isString(val) && val[0] === '=';
}

self.onmessage = function(message) {
  let sheetVals = message.data || {};

  let vals = evalSheet(sheetVals);

  // send the computed values back to the main thread
  postMessage({vals});
};

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

// getResult turns the raw evaluated value of a cell into a format that is able
// to be sent as a message over the pipe back to the main thread and is ready
// for rendering on the other end. This format includes the metadata necessary
// for rendering.
function getResult(scope, coord) {
  let value;
  //
  if (!scope.sheet[coord]) {
    return {type: 'empty'};
  }
  try {
    value = scope.get(coord);
  } catch (e) {
    console.error("eval failed at coordinate", coord, "with error", e);
    return scope.vals[coord] = {type: 'error', error: e.toString()};
  }

  let type = undefined;

  // TODO: math.Matrix
  // TODO: math.Complex

  if (typeof value === "string" || value instanceof String) {
    type = 'string';
  } else if (typeof value === "number" || typeof value === "bigint") {
    type = 'number';
  } else if (typeof value === "boolean") {
    type = 'boolean';
  } else if (typeof value === "function") {
    return {type: 'function', value: scope.sheet[coord]}
  } else if (Array.isArray(value)) {
    return {type: 'array', value}
  } else if (typeof value === "object") {
    return {type: 'object', value}
  }

  if (type === undefined) {
    console.error("value has unknown type", value);
    return {type: 'error', error: 'invalid type'};
  }

  return {type, value};
}

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

// FormulaScope is a Map-like object that uses math.evaluate() to compute the
// values of formula inputs for the spreadsheet. It is passed to math.evaluat()
// as the scope parameter to allow spreadsheet-style dyanmic computation.
function FormulaScope(sheet) {
  let vals = {};  // computation results
  let vars = {};  // dynamically assigned values
  // Math.js expects Map objects to implement the methods set(), get(), has(),
  // and keys().
  // https://github.com/josdejong/mathjs/blob/5754478f168b67e9774d4dfbb5c4f45ad34f97ca/src/utils/map.js#L90
  return {
    vals,
    sheet,
    vars,
    set(key, value) {
      if (key in sheet) {
        throw `Error: cannot assign to reserved key ${key}`
      }
      vars[key] = value;
    },
    keys() {
      return Object.keys(sheet).concat(Object.keys(vars));
    },
    has(key) {
      return key in sheet || key in vars;
    },
    get(key) {
      // return defined variables
      if (key in vars) {
        return vars[key];
      }
      // return already-computed values
      if (key in vals) {
        let val = vals[key];
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

      if (!(key in sheet)) {
        return undefined;
      }

      let sheetVal = sheet[key];

      if (sheetVal === undefined || sheetVal === '') {
        throw ReferenceError(`${key} is empty`)
      }

      // return non-formula values verbatim
      if (sheetVal[0] !== '=') {
        return vals[key] = value(sheetVal);
      }

      vals[key] = Pending;  // prevent recursion

      let formula = sheetVal.slice(1);

      try {
        vals[key] = math.evaluate(formula, this);
      } catch (e) {
        vals[key] = {error: e.toString()};
        throw e;
      }

      return vals[key];
    },
  }
}

// stringify (badly named) coerces the value to a string if it's not a boolean
// or number. I can't remember why I implemented this. I guess it could be a
// security thing or maybe it's just something I thought was a good idea.
// XXX consider removing this
function stringify(val) {
  switch (typeof val) {
    case "boolean":
    case "number":
      return val;
  }
  return val + "";
}

// value tries to coerce a string value to a number, otherwise returning the
// value as-is if it's not a number or if coercion fails.
function value(val) {
  if (!(typeof val === 'string' || val instanceof String)) {
    return val;
  }
  if (val === "") {
    return val;
  }
  let n = +val;
  if (Number.isNaN(n))
    return val;
  return n;
}