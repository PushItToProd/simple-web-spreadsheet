self.importScripts("math.js");

self.onmessage = function(message) {
  let sheet = message.data || {};
  let vals = {};
  let scope = FormulaScope(vals, sheet);

  for (let coord in sheet) {
    let sheetVal = sheet[coord];

    if (sheetVal[0] !== '=') {
      vals[coord] = value(sheetVal);
      continue;
    }

    let formula = sheetVal.slice(1);

    try {
      vals[coord] = math.evaluate(formula, scope);
    } catch (e) {
      console.error("eval failed at coordinate", coord, "with error", e);
      vals[coord] = {error: e.toString()};
    }
  }

  postMessage({vals});
};

// quasi-contructor for a magic array object that recursively computes cell
// values. this gets passed to math.evaluate() so mathjs will use this to get
// all variable values
function FormulaScope(vals, sheet) {
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

        // don't compute undefined keys
        if (!(key in sheet)) {
          // throw ReferenceError(`${key} is not defined`);
          return undefined;
        }

        // return non-formula values verbatim
        if (sheet[key][0] !== '=') {
          return vals[key] = value(sheet[key]);
        }

        vals[key] = NaN;

        let formula = sheet[key].slice(1);

        try {
          vals[key] = math.evaluate(formula, receiver);
          errs[key] = undefined;
        } catch (e) {
          vals[key] = NaN;
          errs[key] = e.toString();
        }

        // FIXME maybe don't do this, actually
        return stringify(vals[key]);
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

// value tries to coerce a value to a number, otherwise returning the value
// as-is if coercion fails.
function value(n) {
  let x = +n;  // XXX this will coerce booleans to 1 and 0
  if (n !== x.toString())   // FIXME use Number.isNaN here instead
    return n;
  return x;
}