const AWS = require("aws-sdk");
const Bunyan = require("bunyan");
const Dialogflow = require("dialogflow");
const Request = require('request-promise');
const CoroLib = require("coro-lib");
const UUIDV1 = require("uuid/v1");
const UUIDV5 = require("uuid/v5");

const {
    utils : { LambdaInvoker, TelegramUtil }
} = CoroLib;

const Responder = require("../../responder");

const log = Bunyan.createLogger({ name : "coro-sqs-moprocessor:controllers/ManagerInlineQueryCtrl" });

let sqs = new AWS.SQS();

let resources;
let properties;

class ManagerInlineQueryCtrl {

    static init({ 
        resources : res, 
        properties : props
    }) {
        resources = res;
        properties = props;
    } 
    
    static async processInlineQuery({ molog, coroService, userCoroRole }) {
        
        let results = "";
        
        return new Promise(async (resolve, reject) => {
            try {
                
                log.info("MOLOG:", molog);
                
                await Responder.sendResponse({
                    sessionId : molog.sessionId,
                    messageId : molog.messageId,
                    results,
                    channel : molog.channel
                });  
                
                resolve("Done");
            } catch(error) {
                reject(error);
            }
        });
    }
    
}

module.exports = ManagerInlineQueryCtrl;