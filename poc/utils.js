export function getType(o) {
  // Object.prototype.toString.call returns a string like '[object ClassName]',
  // so we slice off the leading '[object ' and trailing ']' to get the plain
  // name
  return Object.prototype.toString.call(o).slice(8, -1);
}

export function isString(o) {
  return getType(o) === "String";
}
