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

        if (key in vals) {
          // return already-computed values
          return vals[key];
        }

        if (!(key in sheet)) {
          // don't compute undefined keys
          // throw ReferenceError(`${key} is not defined`);
          return undefined;
        }

        vals[key] = NaN;

        if (sheet[key][0] !== '=') {
          // not a formula -> just return it
          return vals[key] = value(sheet[key]);
        }

        let formula = sheet[key].slice(1);

        try {
          vals[key] = math.evaluate(formula, receiver);
          errs[key] = undefined;
        } catch (e) {
          vals[key] = NaN;
          errs[key] = e.toString();
        }

        return stringify(vals[key]);
      }
    }
  )
}

function stringify(val) {
  switch (typeof val) {
    case "boolean":
    case "number":
      return val;
  }
  return val + "";
}

function value(n) {
  let x = +n;
  if (n !== x.toString())
    return n;
  return x;
}