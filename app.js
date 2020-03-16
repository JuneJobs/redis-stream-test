let ioRedis = require("ioredis");
let redisCli = new ioRedis();
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
                } else if (fileName === 'test') {
                    // name, sequence, qty, used memory, elapsed time 
                    fs.appendFile(`./res/${fileName}.csv`, resource.replace(/,/gi,',\t')+'\n', function (err) {
                        if (err) {
                            console.err(err);
                        } else {
                            resolve(true);
                        }
                    });
                } else if (fileName === "test-search") {
                    //        await util.csv.write('test-search', `Stream,${epoch},7,${1008},${util.time.elapsed()}`);
                    fs.appendFile(`./res/${fileName}.csv`, resource.replace(/,/gi,',\t')+'\n', function (err) {
                        if (err) {
                            console.err(err);
                        } else {
                            resolve(true);
                        }
                    });
                }
            });
        }
    }
    time = {
        tempTime : 0,
        start: () => {
            this.timeTemp =  new Date().getTime();
        },
        elapsed: () => {
            return (new Date().getTime() - this.timeTemp)/1000;
        }
    }
};

class intuseerRedis {
    init = () => {
        return new Promise((resolve) => {
            redisCli.flushall((err, result) => {
                if(err) {
                    console.err(err);
                } else {
                    resolve(true);
                }
            })
        });
    }
    /**
     * function memoryCheck()
     * Output of redis info -> used_memory_by_human
     */
    memoryCheck = () =>{
        return new Promise((resolve) => {
            redisCli.info('Memory', (err, result)=> {
                if(err) {
                    console.err(err);
                } else {
                    resolve(parseFloat(result.split(/\n?:/)[2].split('M')[0]));
                }
            })
        })
    }
    run = (command) => {
        return new Promise((resolve) => {
            redisCli.multi([command]).exec((err, result) => {
                if(err) {
                    console.err(err);
                } else {
                    resolve(result);
                }
            });
        });
    }
    /** Format
        add: () => {
            return new Promise((resolve) => {
                resolve(output);
            });
        }
     */
}

let util = new Utility();
let redis = new intuseerRedis();
//본사 GPS : 35.834882, 128.679314
//util.generateGps(100, 35.8, 128.6);
let test1 = async () => {
    //let objSensors = await util.csv.read('sensor');
    //sensorList 생성
    // if(objSensors.length === 0) {
    //     await util.csv.write('sensor');
    // }
    // /** 
    //   * 각 센서별 데이터 생성, 시간 많이 걸림 (20분정도)
    //   * 센서: 100개 / 최초 에폭: 1262304000 : (2010년1월1일) 
    //   * 센서별: collect interval: 10 min
    //   *       size: 20,000 (약 4~5달치)
    //   *       format: ()안에 string length 표시. x.x표기는 정수부 길이와, 소수부 길이를 의미 
    //   *              created_at(10), entry_id(5), pm2p5cf1(2.2), pm10atm(2.2), pm1p0cfatm(2.2), pm1p0atm(2.2), pm2p5cfatm(2.2), pm10p0cfatm(3.2), ps0p3(4.2), ps0p5(4.2), ps1p0(3.2), ps2p5(2.2), ps5p0(2.2), ps10p0(1.2)
    //   */ 
    // let objDataset = await util.csv.read('dataset');
    // if(objDataset.length === 0) {
    //     await util.csv.write('dataset', [objSensors, 20000]);
    // }
    // console.log('done');
    //redis로 데이터 삽입

    //redis 초기화
    let beforeMemory = 0,
        afterMemory = 0;
    const epoch = 1262304000,
          testMaxTime = 100,
          ssn = '00001',
          keyHead= 'db:air:his:',
          dataQty = 1000;
    for (let testCount = 0; testCount < testMaxTime; testCount++) {
        //Test xadd
        await redis.init();
        util.time.start();
        beforeMemory = await redis.memoryCheck();
        for (let i = 0; i < dataQty; i++) {
            let timestamp = epoch + i * 600;
            //xadd, key, id, field1, value1, field2, value2, ... ,
            await redis.run(['xadd',keyHead+ssn, timestamp, 'pm2p5cf1', util.getRndData(2, 2), 'pm10atm', util.getRndData(2, 2)]);
        }
        afterMemory = await redis.memoryCheck();
        console.log(`[Stream-${testCount}]used memory:`, (afterMemory-beforeMemory).toFixed(2), 'elapsed time:', util.time.elapsed());
        await util.csv.write('test', `Stream    ,${testCount},${dataQty},${(afterMemory-beforeMemory).toFixed(2)},${util.time.elapsed()}`);
        //Test zadd
        await redis.init();
        util.time.start();
        beforeMemory = await redis.memoryCheck();
        for (let i = 0; i < dataQty; i++) {
            let timestamp = epoch + i * 600;
            //xadd, key, score, field1, value1, field2, value2, ... ,
            await redis.run(['zadd',keyHead+ssn, timestamp, timestamp+ ',' +util.getRndData(2, 2)+ ',' +util.getRndData(2, 2)]);
        }
        afterMemory = await redis.memoryCheck();
        console.log(`[Sorted set-${testCount}]used memory:`,(afterMemory-beforeMemory).toFixed(2), 'elapsed time:', util.time.elapsed());
        await util.csv.write('test', `Sorted set,${testCount},${dataQty},${(afterMemory-beforeMemory).toFixed(2)},${util.time.elapsed()}`);
    }
    //데이터 가져오기
    //Purple air 기준 1주일치 데이터 가져오기
    //2010년 에폭기준 7주일 후: 1262908800

   
}
//test1();

let test2 = async () => {
    let beforeMemory = 0,
        afterMemory = 0;
    const epoch = 1262304000,
          testMaxTime = 100,
          ssn1 = '00001',
          ssn2 = '00002',
          keyHead= 'db:air:his:',
          dataQty = 100000;
    //데이터 초기화
    // await redis.init();
    // beforeMemory = await redis.memoryCheck();
    // //데이터 삽입
    // for (let i = 0; i < dataQty; i++) {
    //     let timestamp = epoch + i * 600;
    //     //xadd, key, id, field1, value1, field2, value2, ... ,
    //     //created_at(10), entry_id(5), pm2p5cf1(2.2), pm10atm(2.2), pm1p0cfatm(2.2), pm1p0atm(2.2), pm2p5cfatm(2.2), pm10p0cfatm(3.2), ps0p3(4.2), ps0p5(4.2), ps1p0(3.2), ps2p5(2.2), ps5p0(2.2), ps10p0(1.2)
    //     await redis.run(['xadd',keyHead+ssn1, timestamp, 
    //         'pm2p5cf1', util.getRndData(2, 2), 
    //         'pm10atm', util.getRndData(2, 2),
    //         'pm1p0cfatm', util.getRndData(2, 2),
    //         'pm1p0atm', util.getRndData(2, 2),
    //         'pm2p5cfatm', util.getRndData(2, 2),
    //         'pm10p0cfatm', util.getRndData(3, 2),
    //         'ps0p3', util.getRndData(4, 2),
    //         'ps0p5', util.getRndData(4, 2),
    //         'ps1p0', util.getRndData(3, 2),
    //         'ps2p5', util.getRndData(2, 2),
    //         'ps5p0', util.getRndData(2, 2),
    //         'ps10p0', util.getRndData(1, 2)
    //     ]);
    // }
    // afterMemory = await redis.memoryCheck();
    // console.log((afterMemory-beforeMemory).toFixed(2));
    // beforeMemory = await redis.memoryCheck();
    // for (let i = 0; i < dataQty; i++) {
    //     let timestamp = epoch + i * 600;
    //     //xadd, key, id, field1, value1, field2, value2, ... ,
    //     //created_at(10), entry_id(5), pm2p5cf1(2.2), pm10atm(2.2), pm1p0cfatm(2.2), pm1p0atm(2.2), pm2p5cfatm(2.2), pm10p0cfatm(3.2), ps0p3(4.2), ps0p5(4.2), ps1p0(3.2), ps2p5(2.2), ps5p0(2.2), ps10p0(1.2)
    //     await redis.run(['zadd',keyHead+ssn2, timestamp, timestamp+ ',' +
    //         util.getRndData(2, 2)+ ',' +
    //         util.getRndData(2, 2)+ ',' +
    //         util.getRndData(2, 2)+ ',' +
    //         util.getRndData(2, 2)+ ',' +
    //         util.getRndData(2, 2)+ ',' +
    //         util.getRndData(3, 2)+ ',' +
    //         util.getRndData(4, 2)+ ',' +
    //         util.getRndData(4, 2)+ ',' +
    //         util.getRndData(3, 2)+ ',' +
    //         util.getRndData(2, 2)+ ',' +
    //         util.getRndData(2, 2)+ ',' +
    //         util.getRndData(1, 2)
    //     ]);
    // }
    // afterMemory = await redis.memoryCheck();
    // console.log((afterMemory-beforeMemory).toFixed(2));
    let data = {};
    for (let testCount = 0; testCount < testMaxTime; testCount++) {
        //1주
        util.time.start();
        data = await redis.run(['xrange', `db:air:his:00001`, epoch, 1262304000]);
        await util.csv.write('test-search', `Stream    ,${epoch},7,${1008},${util.time.elapsed()}`);
        util.time.start();
        data = await redis.run(['zrangebyscore', `db:air:his:00002`, epoch, 1262304000]);
        await util.csv.write('test-search', `Sorted set,${epoch},7,${1008},${util.time.elapsed()}`);

        //1달
        util.time.start();
        data = await redis.run(['xrange', `db:air:his:00001`, epoch, 1264982400]);
        await util.csv.write('test-search', `Stream    ,${epoch},31,${4464},${util.time.elapsed()}`);
        util.time.start();
        data = await redis.run(['zrangebyscore', `db:air:his:00002`, epoch, 1264982400]);
        await util.csv.write('test-search', `Sorted set,${epoch},31,${4464},${util.time.elapsed()}`);

        //1년
        util.time.start();
        data = await redis.run(['xrange', `db:air:his:00001`, epoch, 1293840000]);
        await util.csv.write('test-search', `Stream    ,${epoch},365,${52560},${util.time.elapsed()}`);
        util.time.start();
        data = await redis.run(['zrangebyscore', `db:air:his:00002`, epoch, 1293840000]);
        await util.csv.write('test-search', `Sorted set,${epoch},365,${52560},${util.time.elapsed()}`);
    }
    console.log("end");
}
test2();