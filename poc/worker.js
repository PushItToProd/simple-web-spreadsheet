self.importScripts("math.js");

self.onmessage = function(message) {
  let sheet = message.data || {};
  let vals = {};
  let scope = FormulaScope(vals, sheet);

  for (let coord in sheet) {
    let sheetVal = sheet[coord];

    if (!(typeof sheetVal === 'string' || sheetVal instanceof String) || sheetVal[0] !== '=') {
      vals[coord] = value(sheetVal);
      continue;
    }

    let formula = sheetVal.slice(1);

    try {
      vals[coord] = math.evaluate(formula, scope);
    } catch (e) {
      console.error("eval failed at coordinate", coord, "with error", e);
      console.debug("current sheet:", sheet);
      console.debug("current vals:", vals);
      vals[coord] = {error: e.toString()};
    }
  }

  postMessage({vals});
};

// quasi-contructor for a magic array object that recursively computes cell
// values. this gets passed to math.evaluate() so mathjs will use this to get
// all variable values
function FormulaScope(vals, sheet) {
  // math.js has some magic checks based on special attributes. We want to throw
  // ReferenceError for undefined variables, but if we do that for these,
  // math.js will fail, so we return undefined for these instead.
  const ignoredKeys = {set: true, get: true, keys: true, has: true, errs: true};

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

        if (ignoredKeys[key]) {
          return undefined;
        }

        // don't compute undefined keys
        if (!(key in sheet)) {
          throw ReferenceError(`${key} is not defined`);
        }

        if (sheet[key] === undefined || sheet[key] === '') {
          throw ReferenceError(`${key} is empty`)
        }

        // return non-formula values verbatim
        if (sheet[key][0] !== '=') {
          return vals[key] = value(sheet[key]);
        }

        vals[key] = NaN;  // prevent recursion

        let formula = sheet[key].slice(1);

        try {
          vals[key] = math.evaluate(formula, receiver);
        } catch (e) {
          vals[key] = NaN;
          throw e;
        }

        // FIXME maybe don't do this, actually
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