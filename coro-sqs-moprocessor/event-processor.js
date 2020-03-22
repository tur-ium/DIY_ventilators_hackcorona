const AWS = require("aws-sdk");
const Bunyan = require("bunyan");
const Dialogflow = require("dialogflow");
const CoroLib = require("coro-lib");
const Request = require("request-promise");
const UUIDV1 = require("uuid/v1");
const UUIDV5 = require("uuid/v5");

const {
    utils: { LambdaInvoker, Response }
} = CoroLib;

const ManagerCtrl = require("./controllers/manager/manager-ctrl");
const ManagerCmdCtrl = require("./controllers/manager/manager-cmd-ctrl");
const ManagerInlineQueryCtrl = require("./controllers/manager/manager-inline-query-ctrl");

const CustomerCtrl = require("./controllers/customer/customer-ctrl");
const CustomerCmdCtrl = require("./controllers/customer/customer-cmd-ctrl");

const Responder = require("./responder");

const log = Bunyan.createLogger({ name: "coro-sqs-moprocessor:EventProcessor" });

let sqs = new AWS.SQS();

let resources;
let properties;
let count = 1;

class EventProcessor {

    static init({
        Resources,
        properties: props
    }) {
        if(!resources) {
            log.info(`<====================COLD START: 1====================>`);
            count++;
        } else {
            log.info(`<====================WARM START: ${count}====================>`);
            count++;
        }
        resources = Resources;
        properties = props;
        ManagerCtrl.init({ resources, properties });
        ManagerCmdCtrl.init({ resources, properties });
        ManagerInlineQueryCtrl.init({ resources, properties });
        CustomerCtrl.init({ resources, properties });
        CustomerCmdCtrl.init({ resources, properties });
        Responder.init({ resources, properties });
        return resources.initRedis();
    }
    
    static ping() {
        log.info("PING");
    }

    static async processSQS({
        event: { Records }
    }) {

        log.info("RECORDS:::", Records);

        // log.info("MGR RECORDS IS " , { Records });
        for (let { body } of Records) {
            try {
                let { molog, coroService, userCoroRole } = JSON.parse(body);
                log.info("THE MOLOG: ", molog);
                log.info("THE CORO SERVICE: ", coroService);
                log.info("THE USER'S CURRENT ROLE: ", userCoroRole);


                molog.customer.userRoles = molog.userRoles;

                await resources.setExpireRedis(`coroCustomer:${molog.sessionId}`, JSON.stringify(molog.customer), 1800);
                await resources.setExpireRedis(`psemillaChannel:${molog.sessionId}`, JSON.stringify(molog.channel), 1800);

                if (userCoroRole=="OWNR" || userCoroRole=="MNGR") {
                    if(molog.messageType == "CBQ") {
                        await ManagerCmdCtrl.processCallbackCommand({ molog, coroService, userCoroRole });
                    } else if(molog.messageType == "ILQ") {
                        await ManagerInlineQueryCtrl.processInlineQuery({ molog, coroService, userCoroRole });
                    } else if(molog.messageType == "MSG") {
                        await ManagerCtrl.processMOLog({ molog, coroService, userCoroRole });
                    }
                    
                } else {
                    if(molog.messageType == "CBQ") {
                        await CustomerCmdCtrl.processCallbackCommand({ molog, coroService, userCoroRole });
                    } else if(molog.messageType == "ILQ") {
                        // await CustomerInlineQueryCtrl.processInlineQuery({ molog, coroService, userCoroRole });
                    } else if(molog.messageType == "MSG") {
                        await CustomerCtrl.processMOLog({ molog, coroService, userCoroRole });
                    }
                }
            } catch (error) {
                log.error("PROCESS ERROR", error);
            }
        };
    }
}

module.exports = EventProcessor;
