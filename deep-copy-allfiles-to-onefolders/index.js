const fs = require("fs");
const path = require("path");

const filePath = path.resolve(
  "E://干旱//甘肃省评估与区划成果//山丘区中小河流洪水淹没范围图层集合（含元数据）//623000_甘南州_山丘区中小河流洪水淹没图_20221128" //todo
);

const folderName = "newFiles";

getFile(filePath, true);

function getFile(filePath, init) {
  fs.readdir(filePath, function (err, files) {
    if (err) {
      console.warn(err, "读取文件夹错误！");
    } else {
      if (init) {
        fs.rmdirSync(folderName, { recursive: true });
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
