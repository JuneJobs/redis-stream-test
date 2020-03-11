// let Redis = require("ioredis");
// let redisCli = new Redis();
const codeGenerator = require("node-code-generator");
let generator = new codeGenerator();

let util = {};
util.generateGps = (dataQty, lat, lng) => {
    let generatedCodes;
    let generatedCodeString ="";
    for (let i = 0; i < dataQty; i++) {
        generatedCodes = generator.generateCodes("#####", 2);
        lat + generatedCodes[0];
        lng + generatedCodes[1];
        generatedCodeString += (`${lat + generatedCodes[0]},${lng + generatedCodes[1]} \n`);
    }
    console.log(generatedCodeString);
}
//본사 GPS : 35.834882, 128.679314
//util.generateGps(100, 35.8, 128.6);
let data = {
    sensor: []
}

