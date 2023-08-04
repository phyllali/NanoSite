function getContent(file) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", file, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(xhr.responseText);
        } else {
          reject(xhr.statusText);
        }
      }
    };
    xhr.send();
  });
}

try {
  getContent("/wwwroot/index.json")
  .then(function (content) {
    const jsonObject = JSON.parse(content.toString());

    for (const key in jsonObject) {
      if (jsonObject.hasOwnProperty(key)) {
        const obj = jsonObject[key];
        console.log(`Object: ${key}`);
        console.log(JSON.stringify(obj, null, 2));
      }
    }
    console.log(content);
  })
  .catch(function (error) {
    console.error("Error fetching content:", error);
  });
} catch (error) {
  console.error('Error parsing JSON:', error);
}
