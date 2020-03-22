const Bunyan = require("bunyan");
const CoroLib = require("coro-lib");
const Request = require('request-promise');
const Dialogflow = require("dialogflow");
const { struct } = require('pb-util');

const {
    utils: { LambdaInvoker }
} = CoroLib;

const log = Bunyan.createLogger({ name: "coro-sqs-moprocessor:Responder" });

let resources;
let properties;

class Responder {

    static init({
        resources: res,
        properties: props
    }) {
        resources = res;
        properties = props;
    }
    
    static async sendToManagerDF({ molog, eventName, parameters, messageToDF }) {
        log.info("SENDING TO MANAGER DF");
        const sessionClient = new Dialogflow.SessionsClient({
            keyFilename : process.env.GOOGLE_APPLICATION_CREDENTIAL_managerBot
        });
        const sessionPath = sessionClient.sessionPath(properties.dialogflow.managerProjectId, molog.sessionId);
        
        let request = await Responder.craftDFRequest({ molog, eventName, parameters, sessionPath, messageToDF });
        
        return sessionClient.detectIntent(request);        
    }
    
    static async sendToCustomerDF({ molog, eventName, parameters, messageToDF }) {
        const sessionClient = new Dialogflow.SessionsClient({
            keyFilename : process.env.GOOGLE_APPLICATION_CREDENTIAL_customerBot
        });
        const sessionPath = sessionClient.sessionPath(properties.dialogflow.customerProjectId, molog.sessionId);
        
        let request = await Responder.craftDFRequest({ molog, eventName, parameters, sessionPath, messageToDF });
        
        log.info("SENDING TO CUSTOMER DF:", request);
        
        return sessionClient.detectIntent(request);        
    }
    
    static craftDFRequest({ molog, eventName, parameters, sessionPath, messageToDF }) {
        let text, request;
        parameters = parameters ? struct.encode(parameters) : null;
        
        let languageCode = molog.language ? molog.language : "en-US";
        if(languageCode == "ms") { languageCode = "id"; }
        
        if(molog.message) {
            text = molog.message;
        } else if (molog.mediaType == "photo") {
            text = molog.mediaUrl;
        }
        
        if(messageToDF) { text = messageToDF; }
        
        if (eventName) {
            request = {
                session: sessionPath,
                queryInput: {
                    event: {
                        name : eventName,
                        languageCode,
                        parameters
                    }
                }
            };
        } else if (text) {
            request = {
                session: sessionPath,
                queryInput: {
                    text: {
                        text,
                        languageCode
                    }
                }
            };
        }
        
        return request;
    }
    
    static async sendResponse({
        sessionId,
        messageId,
        molog,
        channel,
        reply,
        photo,
        document,
        options,
        chunk,
        results,
        cache_time
    }) {
        log.info("SEND RESPONSE", { sessionId, channel, reply, photo, options });
        
        return new Promise(async (resolve, reject) => {
            try {
                let params = {
                	apiKey	: properties.general.psemillaKey,
                	apiSecret	: properties.general.psemillaSecret,
                	sessionId,
                	messageId,
                	molog,
                	channel,
                	message	: "",
                	photo,
                	document,
                	options,
                	chunk,
                	results,
                	cache_time : cache_time ? cache_time : 10
                }
                
                if(reply) {
                    log.info("REPLY:", reply);
                    params.message = reply;
                }
                
                let response = await Request({
                    method: 'POST',
                    uri : properties.general.psemillaSendAPI,
                    body : params,
                    json : true // Automatically stringifies the body to JSON
                });
                
                resolve("Done");
                
            } catch(error) {
                reject(error);
            } 
        });
    }
    
    static async sendEvent({
        sessionId,
        event,
        channel,
        payload
    }) {
        log.info("SEND EVENT", { sessionId, payload });
        
        return new Promise(async (resolve, reject) => {
            try {
                let params = {
                	apiKey	: properties.general.psemillaKey,
                	apiSecret	: properties.general.psemillaSecret,
                	sessionId,
                	channel,
                	event,
                	payload
                }
                
                let response = await Request({
                    method: 'POST',
                    uri : properties.general.psemillaEventAPI,
                    body : params,
                    json : true // Automatically stringifies the body to JSON
                });
                
                resolve("Done");
                
            } catch(error) {
                reject(error);
            } 
        });
    }
    
    static async answerInlineQuery({ messageId, results, channel, cache_time }) {
        log.info("ANSWER INLINE QUERY", { messageId, results, channel });
        
        return new Promise(async (resolve, reject) => {
            try {
                let params = {
                	messageId,
                	results,
                	channel,
                	cache_time : cache_time ? cache_time : 10
                };
                let response = await Request({
                    method: 'POST',
                    uri : properties.general.psemillaInlineQueryAPI,
                    body : params,
                    json : true // Automatically stringifies the body to JSON
                });
                
                resolve("Done");
                
            } catch(error) {
                reject(error);
            } 
        });
    }
    
    static async updateMessage({ chatId, messageId, inlineMessageId, chatInstance, chatMessageId, text, channel, reply_markup }) {
        log.info("UPDATE MESSAGE", { chatId, messageId, inlineMessageId, chatInstance, chatMessageId, text, channel });
        
        return new Promise(async (resolve, reject) => {
            try {
                let params = {
                    channel,
                    chatId,
                	messageId,
                	chatInstance,
                	chatMessageId,
                	inlineMessageId,
                	text,
                	reply_markup
                }
                let response = await Request({
                    method: 'POST',
                    uri : properties.general.psemillaUpdateMessageAPI,
                    body : params,
                    json : true // Automatically stringifies the body to JSON
                });
                
                resolve("Done");
                
            } catch(error) {
                reject(error);
            } 
        });
    }
}

module.exports = Responder;