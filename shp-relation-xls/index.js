const fs = require("fs");
const path = require("path");
const shapefile = require("shapefile");
const xlsx = require("node-xlsx");
const { GeoJson2Shp } = require("@gis-js/geojson2shp");
const JSZip = require("jszip");
const compressing = require("compressing");

// --------------------------------------------
/**
 * 参数
 */
const encodings = { "2023涉河建筑物": "utf-8", "2022年涉河建筑物": "GBK" }; //shp的编码
const shpRelationId = "code"; //shp的关联id
const xlsTableHeaderIndex = 1; //excel字段起始列
const xlsRelationId = "BM"; //excel的关联id
const deleteFields = []; //原始数据需要删除的字段
const addFields = ["XMMC"]; //添加的字段，"*"代表xls的所有字段
const toStringFields = ["code", "经度", "纬度", "年份"]; //转成字符串的字段
const replaceFields = {
  市: "S",
  县: "X",
  位置: "WZ",
  河流: "RV_NAME",
  名称: "XMMC",
  类型: "LXMC",
}; //替换字段对应关系
const sortFields = [
  "XMMC",
  "市",
  "县",
  "显隐",
  "名称",
  "类型",
  "经度",
  "纬度",
  "位置",
  "河流",
  "备注",
  // "code",
  // "年份",
]; //排序字段
// --------------------------------------------
const filePath = path.resolve("oldFiles");
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
              console.log(`${i} shp done`);
              shapefile
                .openDbf(filePath + "/" + dbf, {
                  encoding: encodings[i] ? encodings[i] : "utf-8",
                })
                .then((source) => {
                  const properties = [];
                  source.read().then(async function log(result) {
                    if (result.done) {
                      console.log(`${i} dbf done`);
                      const sheets = xlsx.parse(filePath + "/" + xls);
                      console.log(`${i} xls done`);
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
                        console.log(`${i} xls done`);

                        features.forEach((data, i) => {
                          if (
                            properties[i][shpRelationId] ===
                            data.properties[shpRelationId]
                          ) {
                            const bmValue = data.properties[shpRelationId];
                            deleteFields.forEach((field) => {
                              delete properties[i][field];
                            });
                            for (let item in properties[i]) {
                              if (replaceFields[item]) {
                                //替换数据
                                properties[i][item] =
                                  result[bmValue][replaceFields[item]];
                              }
                            }
                            data.properties = properties[i];

                            //追加字段
                            if (addFields.indexOf("*") > -1) {
                              //所有字段
                              data.properties = {
                                ...data.properties,
                                ...result[bmValue],
                              };
                            } else {
                              addFields.forEach((field) => {
                                data.properties[field] = result[bmValue][field];
                              });
                            }

                            //转换字段类型
                            toStringFields.forEach((field) => {
                              if (data.properties[field] !== undefined)
                                data.properties[field] =
                                  data.properties[field]?.toString();
                            });

                            //排序字段
                            const sortResult = {};
                            sortFields.forEach((field) => {
                              sortResult[field] = data.properties[field];
                            });
                            data.properties = {
                              ...sortResult,
                              ...data.properties,
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
                              name: "urn:ogc:def:crs:EPSG::4490",
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
                              console.log(`${i} generate geojson success`);
                            }
                          }
                        );
                        const g2s = new GeoJson2Shp(jsonObj);
                        const zip = new JSZip();
                        const layers = zip.folder("");
                        const cpg = "UTF-8";

                        const projection =
                          'GEOGCS["GCS_China_Geodetic_Coordinate_System_2000",DATUM["D_China_2000",SPHEROID["CGCS2000",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';
                        g2s.writePoint(
                          function (err, files) {
                            const fileName = i + "_point";
                            layers.file(fileName + ".shp", files.shp.buffer, {
                              binary: true,
                            });
                            layers.file(fileName + ".shx", files.shx.buffer, {
                              binary: true,
                            });
                            layers.file(fileName + ".dbf", files.dbf.buffer, {
                              binary: true,
                            });
                            layers.file(fileName + ".prj", projection);
                            layers.file(fileName + ".cpg", cpg);
                          }.bind(this)
                        );

                        g2s.writeMultiPoint(
                          function (err, files) {
                            const fileName = i + "_multipoint";
                            layers.file(fileName + ".shp", files.shp.buffer, {
                              binary: true,
                            });
                            layers.file(fileName + ".shx", files.shx.buffer, {
                              binary: true,
                            });
                            layers.file(fileName + ".dbf", files.dbf.buffer, {
                              binary: true,
                            });
                            layers.file(fileName + ".prj", projection);
                            layers.file(fileName + ".cpg", cpg);
                          }.bind(this)
                        );

                        g2s.writePolyline(
                          function (err, files) {
                            const fileName = i + "_polyline";
                            layers.file(fileName + ".shp", files.shp.buffer, {
                              binary: true,
                            });
                            layers.file(fileName + ".shx", files.shx.buffer, {
                              binary: true,
                            });
                            layers.file(fileName + ".dbf", files.dbf.buffer, {
                              binary: true,
                            });
                            layers.file(fileName + ".prj", projection);
                            layers.file(fileName + ".cpg", cpg);
                          }.bind(this)
                        );
                        g2s.writePolygon(
                          function (err, files) {
                            const fileName = i + "_polygon";
                            layers.file(fileName + ".shp", files.shp.buffer, {
                              binary: true,
                            });
                            layers.file(fileName + ".shx", files.shx.buffer, {
                              binary: true,
                            });
                            layers.file(fileName + ".dbf", files.dbf.buffer, {
                              binary: true,
                            });
                            layers.file(fileName + ".prj", projection);
                            layers.file(fileName + ".cpg", cpg);
                          }.bind(this)
                        );
                        zip
                          .generateAsync({ type: "nodebuffer" })
                          .then(function (content) {
                            const zipPath = folderName + "/" + i + ".zip";
                            fs.writeFile(
                              zipPath,
                              content,
                              async function (err) {
                                if (!err) {
                                  console.log(`${i} zip success`);
                                  compressing.zip
                                    .uncompress(zipPath, folderName)
                                    .then(() => {
                                      console.log(`${i} unzip success`);
                                      fs.unlinkSync(zipPath);
                                      console.log(`${i} deletezip success`);
                                    })
                                    .catch((err) => {
                                      console.log(err);
                                    });
                                } else {
                                  console.log(zip + "压缩失败");
                                }
                              }
                            );
                          });
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
