const fs = require("fs");
const path = require("path");

const filePath = path.resolve(
  "D://zpc//data//gangcha-dom" //todo
);

getFile(filePath, true);

function getFile(filePath, init) {
  fs.readdir(filePath, function (err, files) {
    if (err) {
      console.warn(err, "读取文件夹错误！");
    } else {
      files.forEach(function (filename) {
        const filedir = path.join(filePath, filename);
        fs.stat(filedir, function (eror, stats) {
          if (eror) {
            console.warn("获取文件stats失败");
          } else {
            var isFile = stats.isFile(); //是文件
            var isDir = stats.isDirectory(); //是文件夹
            if (isFile) {
              if (stats.size <= 1.4 * 1024) {
                fs.unlink(filedir,()=>{})
              }
            }
            if (isDir) {
              getFile(filedir);
            }
          }
        });
      });
    }
  });
}
