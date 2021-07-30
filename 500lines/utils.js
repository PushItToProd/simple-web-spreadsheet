function forEachProperty(obj, callback) {
  Object.getOwnPropertyNames(obj).forEach(callback);
}

// convert to a num if possible
function tryCoerceNum(n) {
  // +n abuses JS type coercion to turn numeric strings into numbers
  var x = +n;

  // this abuses the fact that 123 === "123" to check if the coerced value is
  // an appropriate representation of the original input. if it's not, just
  // return the original value
  if (n !== x.toString()) {
    return n;
  }
  return x;
}

function isFormula(s) {
  return s[0] === "=";
}