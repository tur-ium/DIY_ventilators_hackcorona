const AWS = require("aws-sdk");
const Bunyan = require("bunyan");
const Dialogflow = require("dialogflow");
const CoroLib = require("coro-lib");
const Moment = require('moment-timezone');
const Request = require('request-promise');
    
const {
    utils : { LambdaInvoker, Response }
} = CoroLib;

const ManagerInlineQueryCtrl = require("./manager-inline-query-ctrl");
const ManagerCmdCtrl = require("./manager-cmd-ctrl");
const Responder = require("../../responder");

const log = Bunyan.createLogger({ name : "coro-sqs-moprocessor:controllers/ManagerCtrl" });

let sqs = new AWS.SQS();

let resources;
let properties;

class ManagerCtrl {

    static init({ 
        resources : res, 
        properties : props
    }) {
        resources = res;
        properties = props;
        // InlineQueryCtrl.init({ resources, properties });
        // ManagerCmdProductCtrl.init({ resources, properties });
    } 
    
    static processMOLog({ molog, coroService, userCoroRole }) {
        return new Promise(async (resolve, reject) => {
            try {
                
                let reply, options;
                
                log.info("MOLOG:::", molog);
                
                let input = molog.mediaUrl ? molog.mediaUrl : molog.message;
                
                switch(input) {
                    case "/start":
                        await ManagerCtrl.defaultResponse({
                            sessionId : molog.sessionId,
                            channel : molog.channel,
                            molog, coroService
                        });
                        break;
                    default :
                        // send to DF
                        let response = await Responder.sendToManagerDF({ molog });
                        
                        log.info(`RESPONSE FROM DF:::`, { response });
        
                        let { 
                            queryResult : { fulfillmentText }
                        } = response[0];
                        
                        log.info("QUERY RESULT:", response[0].queryResult);
                        let intentName =  response[0].queryResult.intent.displayName;
                        
                        if(fulfillmentText.length > 0 && response[0].queryResult.action.split(".")[0] == "smalltalk") {
                            reply = fulfillmentText;
                            // Only sends replies through here if it's Smalltalk. Otherwise through dfwebhook
                            await Responder.sendResponse({
                                reply,
                                sessionId : molog.sessionId,
                                channel : molog.channel
                            });
                        } else if (intentName == "Default Fallback Intent" || intentName == "Default Welcome Intent" || molog.message == "cancel") {
                            await ManagerCtrl.defaultResponse({
                                sessionId : molog.sessionId,
                                channel : molog.channel,
                                molog, coroService
                            });
                        }
                }

                resolve("Done");
            } catch(error) {
                log.error("THE ERROR FOUND: ", error);
                reject(error);
            }
        });
    } 
    
    static countSalesForToday(coroService) {
        let fromDate = Moment().tz('Asia/Singapore').startOf('day');
        let toDate = Moment().tz('Asia/Singapore').endOf('day');
        
        return LambdaInvoker.invoke({
            properties, 
            ms : "coro-mdl-shoppingcart", 
            payload : {
                "function" : "countByStatusServiceDateRange",
                "payload" : {
                    coroService, fromDate, toDate,
                    statuses : [
                        "confirmed", "paid", "shipped", "delivered"
                    ]
                }
            }
        });
    }
    
    static defaultResponse({ sessionId, channel, molog, coroService }) {
        // Do Menu stuff
        log.info("DEFAULT RESPONSE CALLED");

        return ManagerCtrl.countSalesForToday(coroService).
                then(Response.promise).
                then(({ count }) => {
                    let reply = count > 0 ? 
                        `Hello, ${molog.customer.name}! You've had ${count} sales today!` :
                        `Hello, ${molog.customer.name}! You don't have any sales yet today!`;

                    let options = [{
                        "text" : "Payment",
                        "switch_inline_query_current_chat" : "payment"
                    }, {
                        "text" : "Inventory",
                        "callback" : `CMD:CORO:EDITINVENTORY`
                    }];

                    return Responder.sendResponse({ reply, options, sessionId, channel });            
                });
    
    }
    
}

module.exports = ManagerCtrl;