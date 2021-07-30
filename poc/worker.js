self.onmessage = function(message) {
  sheet = message.data || {};
  errs = {};
  vals = {A1: 1, B1: 2, C1: 3};

  // console.log("running worker");
  // TODO

  postMessage({vals, errs});
};
