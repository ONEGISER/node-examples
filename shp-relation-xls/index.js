const fs = require("fs");
const path = require("path");
const shapefile = require("shapefile");
const xlsx = require("node-xlsx");
const { convert } = require("geojson2shp");
const geojson2shape = require("geojson2shape");
const ogr2ogr = require("ogr2ogr").default;
const { GeoJson2Shp } = require("@gis-js/geojson2shp");
const JSZip = require("jszip");

const filePath = path.resolve("oldFiles");
// --------------------------------------------
/**
 * 参数
 */
const encoding = "utf-8"; //shp的编码
const shpRelationId = "code"; //shp的关联id
const xlsTableHeaderIndex = 1; //excel字段起始列
const xlsRelationId = "BM"; //excel的关联id
const deleteFields = ["code", "市", "县"]; //结果里需要删除的阶段
// --------------------------------------------

getFile(filePath, true);
const folderName = "newFiles";
function getFile(filePath, init) {
  const names = {};
  fs.readdir(filePath, function (err, files) {
    if (err) {
      console.warn(err, "读取文件夹错误！");
    } else {
      if (init) {
        fs.rmdirSync(folderName, { recursive: true });
        fs.mkdirSync(folderName);
      }

      files.forEach((filename, index) => {
        const filedir = path.join(filePath, filename);
        fs.stat(filedir, function (eror, stats) {
          if (eror) {
            console.warn("获取文件stats失败");
          } else {
            const isFile = stats.isFile();
            if (isFile) {
              const arr = filename.split(".");
              if (arr[0]) {
                if (!names[arr[0]]) names[arr[0]] = [];
                names[arr[0]].push(filename);
              }
              if (index === files.length - 1) {
                console.log(names);
                //最后解析到了文件
                handlerFiles(names, filePath);
              }
              // fs.copyFile(filedir, folderName + "/" + filename, (err) => {
              //   if (err) throw err;
              // });
            }
          }
        });
      });
    }
  });
}

function handlerFiles(names, filePath) {
  for (let i in names) {
    const value = names[i];
    const shp = `${i}.shp`;
    const dbf = `${i}.dbf`;
    const xls = `${i}.xls`;

    if (value.indexOf(shp) > -1 && value.indexOf(`${i}.xls`) > -1) {
      shapefile
        .open(filePath + "/" + shp)
        .then((source) => {
          const features = [];
          source.read().then(function log(result) {
            if (result.done) {
              console.log("shp done");
              shapefile
                .openDbf(filePath + "/" + dbf, { encoding })
                .then((source) => {
                  const properties = [];
                  source.read().then(async function log(result) {
                    if (result.done) {
                      console.log("dbf done");

                      const sheets = xlsx.parse(filePath + "/" + xls);
                      const sheet = sheets[0];
                      if (sheet?.data) {
                        let headerFields = [];
                        let relationIndex;
                        const result = {};
                        sheet.data.forEach((temp, index) => {
                          if (index === xlsTableHeaderIndex) {
                            headerFields = temp;
                            relationIndex = temp.indexOf(xlsRelationId);
                          } else if (index < xlsTableHeaderIndex) {
                          } else {
                            const obj = {};
                            headerFields.forEach((field, index) => {
                              obj[field] = temp[index];
                            });
                            result[temp[relationIndex]] = obj;
                          }
                        });

                        features.forEach((data, i) => {
                          if (
                            properties[i][shpRelationId] ===
                            data.properties[shpRelationId]
                          ) {
                            const bmValue = data.properties[shpRelationId];
                            deleteFields.forEach((field) => {
                              delete properties[i][field];
                            });
                            data.properties = {
                              ...properties[i],
                              ...result[bmValue],
                            };
                          } else {
                            console.log("属性错乱！");
                          }
                        });

                        const jsonObj = {
                          type: "FeatureCollection",
                          crs: {
                            type: "name",
                            properties: {
                              name: "urn:ogc:def:crs:OGC:1.3:CRS84",
                            },
                          },
                          features: features,
                        };
                        fs.writeFile(
                          `${folderName}/${i}.json`,
                          JSON.stringify(jsonObj),
                          (err) => {
                            if (err) {
                              console.error(err);
                            } else {
                              console.log("success");
                            }
                          }
                        );
                        // var g2s = new GeoJson2Shp(jsonObj);
                        // var zip = new JSZip(),
                        //   layers = zip.folder(filePath + "/" + i);
                        // var cpg = "UTF-8";

                        // var projection =
                        //   'GEOGCS["GCS_China_Geodetic_Coordinate_System_2000",DATUM["D_China_2000",SPHEROID["CGCS2000",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';
                        // g2s.writePolygon(
                        //   function (err, files) {
                        //     var fileName = i;
                        //     layers.file(fileName + ".shp", files.shp.buffer, {
                        //       binary: true,
                        //     });
                        //     layers.file(fileName + ".shx", files.shx.buffer, {
                        //       binary: true,
                        //     });
                        //     layers.file(fileName + ".dbf", files.dbf.buffer, {
                        //       binary: true,
                        //     });
                        //     layers.file(fileName + ".prj", projection);
                        //     layers.file(fileName + ".cpg", cpg);
                        //   }.bind(this)
                        // );
                        // zip
                        //   .generateAsync({ type: "nodebuffer" })
                        //   .then(function (content) {
                        //     fs.writeFile(
                        //       filePath + "/" + i,
                        //       content,
                        //       function (err) {
                        //         if (!err) {
                        //         } else {
                        //           console.log(zip + "压缩失败");
                        //         }
                        //       }
                        //     );
                        //   });
                      }

                      return;
                    }
                    properties.push(result.value);
                    return source.read().then(log);
                  });
                })
                .catch((error) => console.error(error.stack));
              return;
            }
            features.push(result.value);
            return source.read().then(log);
          });
        })
        .catch((error) => console.error(error.stack));
    }
  }
}
