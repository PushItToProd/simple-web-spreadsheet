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
  let vals = {};
  let scope = FormulaScope(vals, sheetVals);

  for (let coord in sheetVals) {
    let sheetVal = sheetVals[coord];

    if (!isFormula(sheetVal)) {
      vals[coord] = value(sheetVal);
      continue;
    }

    let formula = sheetVal.slice(1);

    try {
      // FIXME don't use math.evaluate here and in FormulaScope
      vals[coord] = math.evaluate(formula, scope);
    } catch (e) {
      console.error("eval failed at coordinate", coord, "with error", e);
      console.debug("current sheet:", sheetVals);
      console.debug("current vals:", vals);
      vals[coord] = {error: e.toString()};
    }
  }
  return vals;
}

// quasi-contructor for a magic array object that recursively computes cell
// values. this gets passed to math.evaluate() so mathjs will use this to get
// all variable values
function FormulaScope(vals, sheet) {
  // XXX math.js can accept a Map for a scope object. perhaps this would be
  // better implemented that way.
  // https://github.com/josdejong/mathjs/blob/5754478f168b67e9774d4dfbb5c4f45ad34f97ca/src/utils/map.js#L90
  return new Proxy(
    {
      vals: vals,
      sheet: sheet
    },
    {
      has(obj, key) {
        return key in obj.sheet
      },
      get(obj, key, receiver) {
        let vals = obj.vals;
        let sheet = obj.sheet;

        // return already-computed values
        if (key in vals) {
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

        vals[key] = NaN;  // prevent recursion

        let formula = sheetVal.slice(1);

        try {
          // FIXME don't use math.evaluate here and in evalSheet
          vals[key] = math.evaluate(formula, receiver);
        } catch (e) {
          vals[key] = NaN;
          console.error("eval failed at coordinate", coord, "with error", e);
          console.debug("current sheet:", sheetVals);
          console.debug("current vals:", vals);
          throw e;
        }

        return vals[key];
      }
    }
  )
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