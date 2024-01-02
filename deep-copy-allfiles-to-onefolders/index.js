const fs = require("fs");
const path = require("path");

const filePath = path.resolve(
  "E://test//folder"//todo
);

const folderName = "newFiles";

getFile(filePath, true);

function getFile(filePath, init) {
  fs.readdir(filePath, function (err, files) {
    if (err) {
      console.warn(err, "读取文件夹错误！");
    } else {
      if (init) {
        fs.rmdirSync(folderName);
        fs.mkdirSync(folderName);
      }

      files.forEach(function (filename) {
        const filedir = path.join(filePath, filename);
        fs.stat(filedir, function (eror, stats) {
          if (eror) {
            console.warn("获取文件stats失败");
          } else {
            var isFile = stats.isFile(); //是文件
            var isDir = stats.isDirectory(); //是文件夹
            if (isFile) {
              console.log(folderName + "/" + filename);
              fs.copyFile(filedir, folderName + "/" + filename, (err) => {
                if (err) throw err;
              });
            }
            if (isDir && filename !== folderName) {
              getFile(filedir);
            }
          }
        });
      });
    }
  });
}
