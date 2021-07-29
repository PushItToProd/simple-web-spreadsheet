export function get(selector) {
  return document.querySelector(selector);
}

export function find(selector) {
  return document.querySelectorAll(selector);
}

export function tr() {
  return document.createElement("tr");
}

export function th(text = null) {
  let e = document.createElement("th");
  if (text !== null) {
    e.textContent = text;
  }
  return e
}

export function td(text = null) {
  let e =  document.createElement("td");
  if (text !== null) {
    e.textContent = text;
  }
  return e;
}
