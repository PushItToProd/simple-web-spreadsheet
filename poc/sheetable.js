import * as utils from './utils.js';

export function Sheetable(element) {
  if (!(element instanceof HTMLTableElement)) {
    throw `Sheetable expects an HTMLTableElement but got ` +
      `${element} of type ${utils.getType(element)}`;
  }
  console.log("Initializing sheet on element", element);
  console.error("TODO");
}