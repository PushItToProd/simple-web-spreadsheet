function forEachProperty(obj, callback) {
  Object.getOwnPropertyNames(obj).forEach(callback);
}