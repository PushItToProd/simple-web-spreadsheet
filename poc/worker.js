self.onmessage = function(message) {
  sheet = message.data || {};
  errs = {A2: "error!"};
  vals = {A1: 1, B1: 2, C1: 3, A2: 0};

  // console.log("running worker");
  // TODO

  postMessage({vals, errs});
};
