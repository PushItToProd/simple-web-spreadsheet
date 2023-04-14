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

export function uploadFile() {
  return new Promise((resolve) => {
    let input = HTML.create("input");
    input.type = 'file';
    input.onchange = e => {
      let file = e.target.files[0];
      let reader = new FileReader();
      reader.onload = e => {
        resolve(e.target.result);
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  });
}