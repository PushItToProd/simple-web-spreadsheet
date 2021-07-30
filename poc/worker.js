// self.importScripts("math.js");


self.onmessage = function(message) {
  sheet = message.data || {};
  vals = {};

  // for (let coord in sheet) {
  //   // TODO
  // }

  // postMessage({vals});
  postMessage({vals: sheet})
};
