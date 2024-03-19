# 链接shp的属性信息（替换或者追加属性）

# 运行环境
`nodejs` https://nodejs.org/en
`vscode` https://code.visualstudio.com/

# 安装
`npm install`

# 运行
`npm start`


# 预备
需要手动创建两个文件夹
oldFiles：放要转换的文件
newFiles：存放转换完成的文件

#  参数说明
```javascript
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
```