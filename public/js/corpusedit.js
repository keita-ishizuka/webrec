/* eslint-env jquery, browser */
$(document).ready(() => {
  const fileInput = document.getElementById('csvfile');
  const fileReader = new FileReader();
  fileInput.onchange = () => {
    const file = fileInput.files[0];
    fileReader.readAsText(file);
  };
  fileReader.onload = () => {
    $('#manuscript').val(fileReader.result);
    console.log(fileReader.result);
  };
})
