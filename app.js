// let Redis = require("ioredis");
// let redisCli = new Redis();
const codeGenerator = require("node-code-generator");
const fs = require('fs');
const csvjson = require('csvjson');
let generator = new codeGenerator();

class Utility {
    pad = (n, strLen) => {
        n = n + '';
        return n.length >= strLen ? n : new Array(strLen - n.length + 1).join('0') + n;
    };
    generateSensorCsvData = (dataQty, lat, lng) => {
        let generatedCodes;
        let generatedCodeString ="";
        for (let i = 0; i < dataQty; i++) {
            generatedCodes = generator.generateCodes("#####", 2);
            lat + generatedCodes[0];
            lng + generatedCodes[1];
            generatedCodeString += (`${this.pad(i, 5)},${lat + generatedCodes[0]},${lng + generatedCodes[1]} \n`);
        }
        return generatedCodeString;
    };
    csv = {
        read: (fileName) => {
            return new Promise((resolve) => {
                fs.readFile(`./res/${fileName}.csv`,'utf8', (err, data) => {
                    if(err) {
                        //파일이 없을경우
                        if(err.code === "ENOENT") {
                            resolve([]);
                        } else {
                            console.err(err);
                        }
                    } else {
                        resolve(csvjson.toObject(data));
                    }
                })
            });
        },
        write: (fileName) => {
            return new Promise((resolve) => {
                if(fileName === 'sensor') {
                    let sensorCsvData = 'ssn,lat,lng\n';
                    sensorCsvData =sensorCsvData + this.generateSensorCsvData(100, 35.8, 128.6)+'';
                    fs.writeFile(`./res/${fileName}.csv`, sensorCsvData, function (err) {
                        if (err) {
                            console.err(err);
                        } else {
                            resolve(true);
                        }
                    });
                }
            });
        }
    };
};
let util = new Utility();
//본사 GPS : 35.834882, 128.679314
//util.generateGps(100, 35.8, 128.6);
let data = {}
//
let main = async () => {
    let sensorList = await util.csv.read('sensor');
    //sensorList 생성
    if(sensorList.length === 0) {
        await util.csv.write('sensor');
    }

}
main();
