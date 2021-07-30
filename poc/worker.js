self.onmessage = function(message) {
  sheet = message.data || {};
  errs = {};
  vals = {};

  // console.log("running worker");
  // TODO

  postMessage({vals, errs});
};
