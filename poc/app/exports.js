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
    input.onchange = changeEvent => {
      let {files} = changeEvent.target;
      if (files.length > 1) {
        throw "can't upload more than one file at a time";
      }
      let file = files[0];
      let reader = new FileReader();
      reader.onload = readEvent => {
        resolve({
          content: readEvent.target.result,
          fileName: file.name,
        });
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  });
}