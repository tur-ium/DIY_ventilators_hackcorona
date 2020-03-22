const AWS = require("aws-sdk");
const Bunyan = require("bunyan");
const Dialogflow = require("dialogflow");
const CoroLib = require("coro-lib");
const Moment = require('moment-timezone');
const Request = require('request-promise');
const Mustache = require('mustache');

const {
    utils : { LambdaInvoker, Response },
    assets : { Replies, ButtonLabels }
} = CoroLib;

// const InlineQueryCtrl = require("./inline-query-ctrl");
// const ManagerCmdCtrl = require("./manager-cmd-ctrl");
const Responder = require("../../responder");

const log = Bunyan.createLogger({ name : "coro-sqs-moprocessor:controllers/CustomerCtrl" });

let sqs = new AWS.SQS();

let resources;
let properties;

let userLanguage = 'en';

class CustomerCtrl {

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
                
                switch(molog.message.toLowerCase()) {
                    case "/start":
                        // await CustomerCtrl.defaultResponse({
                        //     sessionId : molog.sessionId,
                        //     channel : molog.channel,
                        //     molog, coroService
                        // });
                        break;
                    case "/survey":
                        await Responder.sendEvent({
                            sessionId : molog.sessionId,
                            channel : molog.channel,
                            event : "surveyStart",
                            payload : {}
                        });
                        break;
                    case "/ventilatorstart":
                        await Responder.sendToCustomerDF({
                            molog,
                            eventName : "buildVentilatorEvent"
                        });
                        break;
                    case "/ventilator":
                        await Responder.sendToCustomerDF({
                            molog,
                            eventName : "buildVentilatorEvent"
                        });
                        // await Responder.sendResponse({
                        //     reply : `Hello, ${molog.customer.name}!\nWhat kind of respirator are you looking to build?`,
                        //     sessionId : molog.sessionId,
                        //     channel : molog.channel,
                        //     chunk:2,
                        //     options : [{
                        //         "text" : "Pandemic Ventilator",
                        //         "callback_data" : `CMD:CORO:VENTILATOR:PAN:${molog.customer.uuid}`
                        //     },{
                        //         "text" : "NXF Ventilator",
                        //         "callback_data" : `CMD:CORO:VENTILATOR:NXF:${molog.customer.uuid}`
                        //     }]
                        // });
                        break;
                    default :
                        // await CustomerCtrl.defaultResponse({
                        //     sessionId : molog.sessionId,
                        //     channel : molog.channel,
                        //     molog, coroService
                        // });
                    
                        // send to DF
                        let response = await Responder.sendToCustomerDF({ molog });
                        
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
                        } else if (intentName == "Default Welcome Intent") {
                            await CustomerCtrl.defaultResponse({
                                sessionId : molog.sessionId,
                                channel : molog.channel,
                                molog, coroService
                            });
                        } else if (intentName == "Default Fallback Intent") {
                            await CustomerCtrl.defaultResponse({
                                sessionId : molog.sessionId,
                                channel : molog.channel,
                                molog, coroService,
                                fallback : true
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
    
    static async defaultResponse({ sessionId, channel, molog, coroService, fallback }) {
        // Do Menu stuff
        log.info("DEFAULT RESPONSE CALLED");
        
        let reply, options, photo;
        
        if(!fallback) {
            reply = Mustache.render(Replies.mainMenu.defaultWelcome[userLanguage], {userName : molog.customer.name});
        } else {
            reply = Replies.mainMenu.defaultFallback[userLanguage];
        }
        
        options = [{
            "text" : ButtonLabels.mainMenu.statsNews[userLanguage],
            "callback_data" : `CMD:CORO:STATSNEWS:${molog.customer.uuid}`
        }, {
            "text" : ButtonLabels.mainMenu.selfAssessment[userLanguage],
            "callback_data" : `CMD:CORO:ASSESSMENT:${molog.customer.uuid}`
        }, {
            "text" : ButtonLabels.mainMenu.generalInformation[userLanguage],
            "callback_data" : `CMD:CORO:GENERALINFO:${molog.customer.uuid}`
        }, {
            "text" : ButtonLabels.mainMenu.otherResources[userLanguage],
            "callback_data" : `CMD:CORO:RESOURCES:${molog.customer.uuid}`
        }, {
            "text" : ButtonLabels.mainMenu.settings[userLanguage],
            "callback_data" : `CMD:CORO:SETTINGS:${molog.customer.uuid}`
        }]
            
        await Responder.sendResponse({ reply, sessionId, photo, options, chunk : 1, channel });
            
    }
    
}

module.exports = CustomerCtrl;