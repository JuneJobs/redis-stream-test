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
    getRndData = (IntegerSize, decimalSize) => {
        let dataPattern = ""; 
            for (let i = 0; i < IntegerSize; i++) {
                dataPattern += "#";
            }
            dataPattern += ".";
            for (let i = 0; i < decimalSize; i++) {
                dataPattern += "#";
            }
        return generator.generateCodes(dataPattern, 1)[0];
    };
    generateSensorCsvData = (dataQty, lat, lng) => {
        let generatedCodes,
            generatedCsvString = '';
        for (let i = 0; i < dataQty; i++) {
            generatedCodes = generator.generateCodes("#####", 2);
            generatedCsvString += (`${this.pad(i, 5)},${lat + generatedCodes[0]},${lng + generatedCodes[1]} \n`);
        }
        return generatedCsvString;
    };
    generateDatasetCsvData = (sensor, dataQty) => {
        let generateCsvString = '';
        /** 
         * 각 센서별 데이터 생성
         * 센서: 100개 / 최초 에폭: 1262304000 : (2010년1월1일) 
         * 센서별: collect interval: 10 min
         *       size: 100,000 
         *       format: ()안에 string length 표시. x,x표기는 정수부 길이와, 소수부 길이를 의미 
         *              created_at(10), entry_id(5), pm2p5cf1(2,2), pm10atm(2,2), pm1p0cfatm(2,2), pm1p0atm(2,2), pm2p5cfatm(2,2), pm10p0cfatm(3,2), ps0p3(4,2), ps0p5(4,2), ps1p0(3,2), ps2p5(2,2), ps5p0(2,2), ps10p0(1,2)
         */ 
        console.log(`${sensor.ssn}: generating started.`)
        const epoch = 1262304000;
        let timestamp;
        for (let idx = 0; idx < dataQty; idx++) {
            if (idx === 0) {
                timestamp = epoch;
            }
            generateCsvString += `${timestamp}, ${sensor.ssn}, ${this.getRndData(2,2)}, ${this.getRndData(2,2)}, ${this.getRndData(2,2)}, ${this.getRndData(2,2)}, ${this.getRndData(2,2)}, ${this.getRndData(3,2)}, ${this.getRndData(4,2)}, ${this.getRndData(4,2)}, ${this.getRndData(3,2)}, ${this.getRndData(2,2)}, ${this.getRndData(2,2)}, ${this.getRndData(1,2)}\n`
            if(idx%10000 === 0 && idx != 0) {
                console.log(`${sensor.ssn}: until ${idx} generated.`);
            }
            timestamp += 600;
        }
        return generateCsvString;
    }
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
        write: (fileName, resource) => {
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
                } else if (fileName === 'dataset') {
                    let objSensor = resource[0],
                        dataQty = resource[1],
                        datasetCsvData = '';
                    objSensor.map((sensor, idx)=> {
                        
                        if(idx === 0) {
                            datasetCsvData = 'created_at,entry_id,pm2p5cf1,pm10atm,pm1p0cfatm,pm1p0atm,pm2p5cfatm,pm10p0cfatm,ps0p3,ps0p5,ps1p0,ps2p5,ps5p0,ps10p0\n';
                        }
                        datasetCsvData = datasetCsvData + this.generateDatasetCsvData(sensor, dataQty)+'';
                        fs.writeFileSync(`./res/${fileName}.csv`, datasetCsvData, function (err) {
                            if (err) {
                                console.err(err);
                            } else {
                                if(idx === objSensor.length) {
                                    resolve(true);
                                }
                            }
                        });
                    })
                }
            });
        }
    };
};

// class RedisCommand {
//     stream = {
//         set = (dataSet) => {
//             redisCli.xadd();
//         }
//     }
// }

let util = new Utility();
//본사 GPS : 35.834882, 128.679314
//util.generateGps(100, 35.8, 128.6);
let main = async () => {
    let objSensors = await util.csv.read('sensor');
    //sensorList 생성
    if(objSensors.length === 0) {
        await util.csv.write('sensor');
    }
    /** 
      * 각 센서별 데이터 생성, 시간 많이 걸림 (20분정도)
      * 센서: 100개 / 최초 에폭: 1262304000 : (2010년1월1일) 
      * 센서별: collect interval: 10 min
      *       size: 20,000 (약 4~5달치)
      *       format: ()안에 string length 표시. x.x표기는 정수부 길이와, 소수부 길이를 의미 
      *              created_at(10), entry_id(5), pm2p5cf1(2.2), pm10atm(2.2), pm1p0cfatm(2.2), pm1p0atm(2.2), pm2p5cfatm(2.2), pm10p0cfatm(3.2), ps0p3(4.2), ps0p5(4.2), ps1p0(3.2), ps2p5(2.2), ps5p0(2.2), ps10p0(1.2)
      */ 
    let objDataset = await util.csv.read('dataset');
    if(objDataset.length === 0) {
        await util.csv.write('dataset', [objSensors, 20000]);
    }
    console.log('done');
    //redis로 데이터 삽입


}
main();
