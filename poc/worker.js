self.importScripts("math.js");


function value(n) {
  let x = +n;
  if (n !== x.toString())
    return n;
  return x;
}

self.onmessage = function(message) {
  sheet = message.data || {};
  vals = {};

  for (let coord in sheet) {
    let sheetVal = sheet[coord];

    if (sheetVal[0] !== '=') {
      vals[coord] = value(sheetVal);
      continue;
    }

    let formula = sheetVal.slice(1);

    try {
      vals[coord] = math.evaluate(formula);
    } catch (e) {
      console.error("eval failed at coordinate", coord, "with error", e);
      vals[coord] = {error: e.toString()};
    }
  }

  postMessage({vals});
};
