import * as HTML from './html.js';

export function downloadFile(fileName, type, content) {
  const file = new Blob([content], {type});
  const windowUrl = window.URL || window.webkitURL;
  const objectUrl = windowUrl.createObjectURL(file);
  const a = HTML.create("a");
  a.href = objectUrl;
  a.download = fileName;
  a.click();
  windowUrl.revokeObjectURL(file);
}
