export function id(id) {
  return document.getElementById(id);
}

export function get(selector) {
  return document.querySelector(selector);
}

export function find(selector) {
  return document.querySelectorAll(selector);
}

export function create(element) {
  return document.createElement(element);
}

export function focus(selector) {
  let e;
  if (e = get(selector)) {
    e.focus();
  }
}

export function button(text) {
  let e = create("button");
  e.textContent = text;
  return e;
}

export function tr() {
  return create("tr");
}

export function th(text = null) {
  let e = create("th");
  if (text !== null) {
    e.textContent = text;
  }
  return e
}

export function td(text = null) {
  let e =  create("td");
  if (text !== null) {
    e.textContent = text;
  }
  return e;
}

export function input(id) {
  let e = create("input");
  e.id = id;
  return e;
}

export function div(id) {
  let e = create("div");
  e.id = id;
  return e;
}