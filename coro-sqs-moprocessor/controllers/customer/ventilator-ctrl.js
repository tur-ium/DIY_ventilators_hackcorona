const AWS = require("aws-sdk");
const Bunyan = require("bunyan");
const Dialogflow = require("dialogflow");
const CoroLib = require("coro-lib");
const Request = require('request-promise');
const Mustache = require('mustache');

const {
    utils : { LambdaInvoker, Response },
    assets : { Replies, ButtonLabels, ImageUrls, CountryDecoderCT }
} = CoroLib;

const Responder = require("../../responder");

const log = Bunyan.createLogger({ name : "coro-sqs-moprocessor:controllers/VentilatorCtrl" });

let resources;
let properties;

class VentilatorCtrl {

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
                let coroSessionKey = `coro:session:${molog.sessionId}`;
                let { coroUser } = JSON.parse(await resources.getRedis(coroSessionKey));
                
                let reply = "", options, photo, assessmentKey, assessmentResponse, responseAnswers, chunk = 1;
                let country = CountryDecoderCT[coroUser.country];
                let userLanguage = coroUser.language || "en";
                
                log.info("DB COUNTRY:", coroUser.country);
                log.info("CT COUNTRY:", country);
                
                log.info("TO PROCESS CALLBACK COMMAND:", molog);
                log.info("PROPERTIES:", properties);
                
                let command = molog.message.split(':')[3];
                let response, messageToDF;
                
                log.info("COMMAND:", command);
                switch(command) {
                    case "MENU":
                        log.info("VENTILATOR MENU");
                        
                        reply = `Hello! What kind of respirator are you looking to build?`,
                        options = [{
                            "text" : "Pandemic Ventilator",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN:1`
                        },{
                            "text" : "NXP Ventilator",
                            "callback_data" : `CMD:CORO:VENTILATOR:NXP:1`
                        }];
                        break;
                    
                    case "PAN":
                        log.info("PANDEMIC VENTILATOR");
                        
                        reply = "Here are some resources on the Pandemic Ventilator!";
                        options = [{
                            "text" : "What's the Pandemic Ventilator?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_ABOUT:1`
                        }, {
                            "text" : "What kind of materials do I need?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_MATERIALS:1`
                        }, {
                            "text" : "Where could I obtain these materials?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_OBTAIN:1`
                        }, {
                            "text" : "⬅ Back to Ventilators Menu",
                            "callback_data" : `CMD:CORO:VENTILATOR:MENU`
                        }];
                        
                        break;
                        
                    case "PAN_ABOUT":
                        log.info("PANDEMIC VENTILATOR – ABOUT");
                        
                        reply = "Invented back amidst the height of the Avian Flu Crisis, the Pandemic Ventilator is designed to be easily made from readily available materials in a short span of time.\n\nCheck out the full instructions here: https://www.instructables.com/id/The-Pandemic-Ventilator/";
                        photo = "http://cdn.instructables.com/F4M/LUIM/FAKWQ638/F4MLUIMFAKWQ638.LARGE.jpg";
                        options = [{
                            "text" : "⬅ Back to Pandemic Ventilator",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN`
                        }];
                        break;
                        
                    case "PAN_MATERIALS":
                        log.info("PANDEMIC VENTILATOR – MATERIALS");
                        
                        reply = "Click on a button here to see what materials you need to build it!";
                        options = [{
                            "text" : "What kind of valves do I need?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_VALVES`
                        },{
                            "text" : "What sensors are required?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_SENSORS`
                        },{
                            "text" : "How much wood should I get?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_WOOD`
                        },{
                            "text" : "What are the tubing requirements?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_TUBES`
                        },{
                            "text" : "Do I need any particular tools?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_TOOLS`
                        },{
                            "text" : "Which electronic components are needed?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_ELEC`
                        },{
                            "text" : "⬅ Back to Pandemic Ventilator",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN`
                        }];
                        
                        break;
                        
                    case "PAN_VALVES":
                        log.info("PANDEMIC VENTILATOR – VALVES");
                        
                        reply = "The valves you need are:\n\n1. One 1/4 inch normally open valve, one 0.5 inch normally open valve & one 0.5 inch normally closed valve.\n2.Two 0.5 inch NPT T valves (as in photo)";
                        photo = "https://images-na.ssl-images-amazon.com/images/I/51lEGUDprPL._SL1000_.jpg";
                        options = [{
                            "text" : "What sensors are required?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_SENSORS`
                        },{
                            "text" : "How much wood should I get?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_WOOD`
                        },{
                            "text" : "What are the tubing requirements?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_TUBES`
                        },{
                            "text" : "Do I need any particular tools?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_TOOLS`
                        },{
                            "text" : "Which electronic components are needed?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_ELEC`
                        },{
                            "text" : "⬅ Back to Pandemic Ventilator",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN`
                        }]
                        
                        break;
                        
                    case "PAN_SENSORS":
                        log.info("PANDEMIC VENTILATOR – SENSORS");
                        
                        reply = 'The sensors you need are:\n\n1. 1 × 1.5"×9" Sensor Pole'; // What is a sensor pole??
                        options = [{
                            "text" : "What kind of valves do I need?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_VALVES`
                        },{
                            "text" : "How much wood should I get?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_WOOD`
                        },{
                            "text" : "What are the tubing requirements?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_TUBES`
                        },{
                            "text" : "Do I need any particular tools?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_TOOLS`
                        },{
                            "text" : "Which electronic components are needed?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_ELEC`
                        },{
                            "text" : "⬅ Back to Pandemic Ventilator",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN`
                        }];
                        
                        break;
                        
                    case "PAN_WOOD":
                        log.info("PANDEMIC VENTILATOR – WOOD");
                        
                        reply = 'The wood you need is:\n\n1. 4 × 1.5"×7"×5/8" Plywood\n2. 1 × 10.5"×12.5"×0.25" Plywood\n3. 1 × 1.5"×1.5"×17" Plywood\n4. 1 × 18"×21"×0.5" Plywood';
                        photo = "https://3.imimg.com/data3/JI/VP/MY-2724494/plywood-plank-500x500.jpg";
                        options = [{
                            "text" : "What kind of valves do I need?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_VALVES`
                        },{
                            "text" : "What sensors are required?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_SENSORS`
                        },{
                            "text" : "What are the tubing requirements?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_TUBES`
                        },{
                            "text" : "Do I need any particular tools?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_TOOLS`
                        },{
                            "text" : "Which electronic components are needed?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_ELEC`
                        },{
                            "text" : "⬅ Back to Pandemic Ventilator",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN`
                        }];
                        
                        break;
                        
                    case "PAN_TUBES":
                        log.info("PANDEMIC VENTILATOR – TUBES");
                        
                        reply = 'The tube you need is:\n\n1. 1 × Inert 0.5 inch ID plastic tubing';
                        photo = "https://images-na.ssl-images-amazon.com/images/I/51iQIlWk6BL._SL1090_.jpg";
                        options = [{
                            "text" : "What kind of valves do I need?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_VALVES`
                        },{
                            "text" : "What sensors are required?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_SENSORS`
                        },{
                            "text" : "How much wood should I get?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_WOOD`
                        },{
                            "text" : "Do I need any particular tools?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_TOOLS`
                        },{
                            "text" : "Which electronic components are needed?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_ELEC`
                        },{
                            "text" : "⬅ Back to Pandemic Ventilator",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN`
                        }];
                        
                        break;
                        
                    case "PAN_TOOLS":
                        log.info("PANDEMIC VENTILATOR – TOOLS");
                        
                        reply = 'The tools you need are:\n\n1. Drill\n2. Screwdriver Set\n3. Tweezers\n4. Clamps';
                        options = [{
                            "text" : "What kind of valves do I need?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_VALVES`
                        },{
                            "text" : "What sensors are required?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_SENSORS`
                        },{
                            "text" : "How much wood should I get?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_WOOD`
                        },{
                            "text" : "What are the tubing requirements?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_TUBES`
                        },{
                            "text" : "Which electronic components are needed?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_ELEC`
                        },{
                            "text" : "⬅ Back to Pandemic Ventilator",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN`
                        }];
                        
                        break;
                        
                    case "PAN_ELEC":
                        log.info("PANDEMIC VENTILATOR – ELECTRONICS");
                        
                        reply = 'The only electronic component you need is:\n\n1. A Programmable Logic Controller (PLC)\n(e.g. Direct Logic 06 DO-06DR from Automation Direct)';
                        photo = "https://i.ebayimg.com/images/g/UVwAAOSwWq9duvAX/s-l400.jpg";
                        options = [{
                            "text" : "What kind of valves do I need?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_VALVES`
                        },{
                            "text" : "What sensors are required?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_SENSORS`
                        },{
                            "text" : "How much wood should I get?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_WOOD`
                        },{
                            "text" : "What are the tubing requirements?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_TUBES`
                        },{
                            "text" : "Do I need any particular tools?",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN_TOOLS`
                        },{
                            "text" : "⬅ Back to Pandemic Ventilator",
                            "callback_data" : `CMD:CORO:VENTILATOR:PAN`
                        }];
                        
                        break;
                        
                    case "OBTAIN":
                        log.info("OBTAIN MATERIALS");
                        
                        reply = "We've pooled together some resources on where you may be able to buy materials from areas closest to you!\nhttps://docs.google.com/spreadsheets/d/1M-FDsLVOjYmVa1kZYDuwJQOy2jgS2tk6zkipScxUhjM/edit?usp=sharing";
                        await Responder.sendResponse({
                            reply,
                            sessionId : molog.sessionId,
                            channel : molog.channel
                        });
                        
                        reply = "It would also be great if you helped to contribute to this global effort by contributing sources of where to obtain these components! Check out the Google Form here:\nhttps://forms.gle/ySoqQmwVNWuRgxnSA";
                        options = [{
                            "text" : "⬅ Back to Ventilators Menu",
                            "callback_data" : `CMD:CORO:VENTILATOR:MENU`
                        }];
                        
                        break;
                        
                    case "NXP":
                        log.info("NXP VENTILATOR");
                        
                        reply = "Resources on the NXF Ventilator are still under construction!\nDo check back again soon! 🙋🏻‍♀";
                        options = [{
                            "text" : "⬅ Back to Ventilators Menu",
                            "callback_data" : `CMD:CORO:VENTILATOR:MENU`
                        }]
                        
                        break;
                
                }
                
                
                
                if(reply || photo) {
                    await Responder.sendResponse({
                        reply, options, chunk, photo,
                        sessionId : molog.sessionId,
                        channel : molog.channel
                    }); 
                }
                    
                resolve("Done");
            } catch(error) {
                reject(error);
            }
        });
    }
    
}

module.exports = VentilatorCtrl;