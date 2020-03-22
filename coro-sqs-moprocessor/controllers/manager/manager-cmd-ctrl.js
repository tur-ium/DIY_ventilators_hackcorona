const AWS = require("aws-sdk");
const Bunyan = require("bunyan");
const Dialogflow = require("dialogflow");
const CoroLib = require("coro-lib");
const Request = require('request-promise');

const {
    utils : { LambdaInvoker, Response }
} = CoroLib;

const Responder = require("../../responder");

const log = Bunyan.createLogger({ name : "coro-sqs-moprocessor:controllers/ManagerCmdCtrl" });

let sqs = new AWS.SQS();

let resources;
let properties;

class ManagerCmdCtrl {

    static init({ 
        resources : res, 
        properties : props
    }) {
        resources = res;
        properties = props;
    } 
    
    static processCallbackCommand({ molog, coroService, userCoroRole }) {
        return new Promise(async (resolve, reject) => {
            try {
                let reply, options;
                
                log.info("TO PROCESS CALLBACK COMMAND:", molog);
                
                let command = molog.message.split(':')[2];
                let productUuid = molog.message.split(':')[3];
                let response, messageToDF;
                
                log.info("COMMAND:", command);
                switch(command) {
                    case "ADDNEWSCONTENT":
                        break;
                    case "UPDATENEWSCONTENT":
                        break;
                    case "ADDNEWSURL":
                        break;
                    case "UPDATENEWSURL":
                        break;
                }
                
                await Responder.sendResponse({
                    reply, options,
                    sessionId : molog.sessionId,
                    channel : molog.channel
                });
                    
                resolve("Done");
            } catch(error) {
                reject(error);
            }
        });
    }
    
    static async pinItem({ 
        sku, molog
    }) {
        
        // let { customer } = userSession;
        log.info("PINNING ITEM");
        
        let resultProduct = await LambdaInvoker.invoke({ 
            properties, 
            ms : "coro-mdl-product",
            payload : {
                "function" : "pin",
                "payload" : {
                    catalog : molog.customer.catalog._id,
                    sku
                }
            }            
        });
        
        let product = resultProduct.data.product;
        
        log.info("RIGHT AFTER TOGGLING PIN:::::", product);
        
        let reply;
        if (product.pinned) {
            reply = `${product.name} has been pinned! 📌`;
        } else {
            reply = `${product.name} has been unpinned!`;
        }
        
        await Responder.sendResponse({
            reply,
            sessionId : molog.sessionId,
            channel : molog.channel
        });
        
        return async (agent) => {
            try {
                
                
            } catch(error) {
                log.error("PIN ITEM ERROR", error);
            }
        }
    }
    
}

module.exports = ManagerCmdCtrl;