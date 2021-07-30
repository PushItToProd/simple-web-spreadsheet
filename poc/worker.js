self.onmessage = function(message) {
  sheet = message.data || {};
  vals = {A1: 1, B1: 2, C1: 3, A2: {error: "error!"}};

  // console.log("running worker");
  // TODO

  postMessage({vals});
};
