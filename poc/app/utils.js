export function getType(o) {
  return o.constructor.name;
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

// isObject checks if an object is a pure object, not a class or anything
export function isObject(o) {
  return o?.constructor === Object;
}

export function objectIsEmpty(o) {
  return isObject(o) && Object.keys(o).length === 0;
}

export function isBoolean(o) {
  return typeof o === 'boolean';
}

export function isPrimitive(val) {
  return val === null || (typeof val !== 'object' && typeof val !== 'array' && typeof val !== 'function');
}

export function stringifyObject(val) {
    let text = '';
    // prepend constructor name
    if (val.constructor?.name && !Array.isArray(val) && !utils.isObject(val)) {
      text = text.concat(val.constructor.name).concat(' ');
    }
    let json = JSON.stringify(val);
    if (json !== '{}') {
      return text.concat(json);
    }
    return text.concat(String(val));
}