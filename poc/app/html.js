export function getId(id) {
  return document.getElementById(id);
}

export function get(selector) {
  return document.querySelector(selector);
}

export function find(selector) {
  return document.querySelectorAll(selector);
}

export function create(element, id=null) {
  let e = document.createElement(element);
  if (typeof id === 'string' || id instanceof String) {
    e.id = id;
  }
  return e;
}

export function focus(selector) {
  let e;
  if (e = get(selector)) {
    e.focus();
  }
}

export function createButton(text) {
  let e = create("button");
  e.textContent = text;
  return e;
}

export function createTr() {
  return create("tr");
}

export function createTh(text = null) {
  let e = create("th");
  if (text !== null) {
    e.textContent = text;
  }
  return e
}

export function createTd(text = null) {
  let e =  create("td");
  if (text !== null) {
    e.textContent = text;
  }
  return e;
}

export function createInput(id) {
  let e = create("input");
  e.id = id;
  return e;
}

export function createDiv(id) {
  let e = create("div");
  e.id = id;
  return e;
}