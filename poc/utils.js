export function getType(o) {
  // Object.prototype.toString.call returns a string like '[object ClassName]',
  // so we slice off the leading '[object ' and trailing ']' to get the plain
  // name
  return Object.prototype.toString.call(o).slice(8, -1);
}

export function isString(o) {
  return typeof o === 'string' || o instanceof String;
}

export function isNumeric(o) {
  // exclude booleans and objects here because the + operator will coerce
  // booleans and single value arrays to numbers
  if (typeof o === 'boolean' || typeof o === 'object') {
    return false;
  }
  return !Number.isNaN(+o);
}