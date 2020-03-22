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
const GeneralInfo = require('./general-info.json');
const PreventionInfo = require('./prevention-info.json');
const AssessmentResults = require('./assessment-results.json');
const VentilatorCtrl = require('./ventilator-ctrl');

const log = Bunyan.createLogger({ name : "coro-sqs-moprocessor:controllers/CustomerCmdCtrl" });

let sqs = new AWS.SQS();

let resources;
let properties;

class CustomerCmdCtrl {

    static init({ 
        resources : res, 
        properties : props
    }) {
        resources = res;
        properties = props;
        
        VentilatorCtrl.init({ resources, properties });
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
                
                let command = molog.message.split(':')[2];
                let code = molog.message.split(':')[3];
                let response, messageToDF;
                
                log.info("COMMAND:", command);
                switch(command) {
                    case "GENERALINFO":
                        log.info("GENERAL INFO");
                        
                        reply = Replies.generalInformation.menu[userLanguage];
        
                        options = [{
                            "text" : ButtonLabels.generalInformation.aboutDisease[userLanguage],
                            "callback_data" : `CMD:CORO:ABOUT:${molog.customer.uuid}`
                        }, {
                            "text" : ButtonLabels.generalInformation.symptoms[userLanguage],
                            "callback_data" : `CMD:CORO:SYMPTOMS:${molog.customer.uuid}`
                        }, {
                            "text" : ButtonLabels.generalInformation.prevention[userLanguage],
                            "callback_data" : `CMD:CORO:PREVENTION:${molog.customer.uuid}`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Main Menu"}),
                            "callback_data" : `CMD:CORO:HOME:${molog.customer.uuid}`
                        }]
                        
                        break;
                        
                    case "ABOUT":
                        log.info("ABOUT COVID-19");
                        
                        reply = Replies.generalInformation.aboutDisease[userLanguage];
                        photo = ImageUrls.generalInformation.aboutDisease[userLanguage];
                        options = [{
                            "text" : ButtonLabels.generalInformation.symptoms[userLanguage],
                            "callback_data" : `CMD:CORO:SYMPTOMS:${molog.customer.uuid}`
                        }, {
                            "text" : ButtonLabels.generalInformation.prevention[userLanguage],
                            "callback_data" : `CMD:CORO:PREVENTION:${molog.customer.uuid}`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Main Menu"}),
                            "callback_data" : `CMD:CORO:HOME:${molog.customer.uuid}`
                        }]
                        
                        break;
                        
                    case "SYMPTOMS":
                        log.info("SYMPTOMS");
                        
                        reply = Replies.generalInformation.symptoms[userLanguage];
                        photo = ImageUrls.generalInformation.symptoms[userLanguage];
                        options = [{
                            "text" : ButtonLabels.mainMenu.selfAssessment[userLanguage],
                            "callback_data" : `CMD:CORO:ASSESSMENT:${molog.customer.uuid}`
                        }, {
                            "text" : ButtonLabels.generalInformation.aboutDisease[userLanguage],
                            "callback_data" : `CMD:CORO:ABOUT:${molog.customer.uuid}`
                        }, {
                            "text" : ButtonLabels.generalInformation.prevention[userLanguage],
                            "callback_data" : `CMD:CORO:PREVENTION:${molog.customer.uuid}`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Main Menu"}),
                            "callback_data" : `CMD:CORO:HOME:${molog.customer.uuid}`
                        }]
                        
                        break;
                    
                    case "PREVENTION":
                        log.info("PREVENTION");
                        
                        reply = Replies.prevention.menu[userLanguage];
                        options = [{
                            "text" : ButtonLabels.prevention.spread[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_SPREAD:1`
                        }, {
                            "text" : ButtonLabels.prevention.protectingYourself[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_SELF:1`
                        }, {
                            "text" : ButtonLabels.prevention.protectingOthers[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_OTHERS:1`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "General Information"}),
                            "callback_data" : `CMD:CORO:GENERALINFO:1`
                        }];
                      
                        break;
                        
                    case "PREVENTION_SPREAD":
                        log.info("PREVENTION SPREAD");
                        
                        reply = Replies.prevention.spread[userLanguage];
                        photo = ImageUrls.prevention.spread[userLanguage];
                        
                        options = [{
                            "text" : ButtonLabels.prevention.protectingYourself[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_SELF:1`
                        }, {
                            "text" : ButtonLabels.prevention.protectingOthers[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_OTHERS:1`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "General Information"}),
                            "callback_data" : `CMD:CORO:GENERALINFO:1`
                        }];
                      
                        break;
                        
                    case "PREVENTION_SELF":
                        log.info("PREVENTION SELF");
                        
                        reply = Replies.prevention.protectingYourself[userLanguage];
                        photo = ImageUrls.prevention.protectingYourself[userLanguage];
                        
                        options = [{
                            "text" : ButtonLabels.prevention.cleanHands[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_CLEANHANDS:1`
                        }, {
                            "text" : ButtonLabels.prevention.avoidCloseContact[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_AVOID:1`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Prevention"}),
                            "callback_data" : `CMD:CORO:PREVENTION:1`
                        }];
                      
                        break;
                        
                    case "PREVENTION_CLEANHANDS":
                        log.info("PREVENTION CLEAN HANDS");
                        
                        reply = Replies.prevention.cleanHands[userLanguage];
                        photo = ImageUrls.prevention.cleanHands[userLanguage];
                        
                        options = [{
                            "text" : ButtonLabels.prevention.avoidCloseContact[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_AVOID:1`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Prevention"}),
                            "callback_data" : `CMD:CORO:PREVENTION:1`
                        }];
                      
                        break;
                        
                    case "PREVENTION_AVOID":
                        log.info("PREVENTION AVOID CONTACT");
                        
                        reply = Replies.prevention.avoidCloseContact[userLanguage];
                        photo = ImageUrls.prevention.avoidCloseContact[userLanguage];
                        
                        options = [{
                            "text" : ButtonLabels.prevention.cleanHands[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_CLEANHANDS:1`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Prevention"}),
                            "callback_data" : `CMD:CORO:PREVENTION:1`
                        }];
                      
                        break;
                        
                    case "PREVENTION_OTHERS":
                        log.info("PREVENTION OTHERS");
                        
                        reply = Replies.prevention.protectingOthers[userLanguage];
                        options = [{
                            "text" : ButtonLabels.prevention.stayHome[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_STAYHOME:1`
                        }, {
                            "text" : ButtonLabels.prevention.coverCoughsAndSneezes[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_COVER:1`
                        }, {
                            "text" : ButtonLabels.prevention.wearMask[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_MASK:1`
                        }, {
                            "text" : ButtonLabels.prevention.cleanAndDisinfect[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_CLEAN:1`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Prevention"}),
                            "callback_data" : `CMD:CORO:PREVENTION:1`
                        }];
                      
                        break;
                        
                    case "PREVENTION_STAYHOME":
                        log.info("PREVENTION STAY HOME");
                        
                        reply = Replies.prevention.stayHome[userLanguage];
                        photo = ImageUrls.prevention.stayHome[userLanguage];
                        
                        options = [{
                            "text" : ButtonLabels.prevention.coverCoughsAndSneezes[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_COVER:1`
                        }, {
                            "text" : ButtonLabels.prevention.wearMask[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_MASK:1`
                        }, {
                            "text" : ButtonLabels.prevention.cleanAndDisinfect[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_CLEAN:1`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Prevention"}),
                            "callback_data" : `CMD:CORO:PREVENTION:1`
                        }];
                      
                        break;
                        
                    case "PREVENTION_COVER":
                        log.info("PREVENTION COVER COUGHS SNEEZES");
                        
                        reply = Replies.prevention.coverCoughsAndSneezes[userLanguage];
                        photo = ImageUrls.prevention.coverCoughsAndSneezes[userLanguage];
                        
                        options = [{
                            "text" : ButtonLabels.prevention.stayHome[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_STAYHOME:1`
                        },{
                            "text" : ButtonLabels.prevention.wearMask[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_MASK:1`
                        }, {
                            "text" : ButtonLabels.prevention.cleanAndDisinfect[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_CLEAN:1`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Prevention"}),
                            "callback_data" : `CMD:CORO:PREVENTION:1`
                        }];
                      
                        break;
                    
                    case "PREVENTION_MASK":
                        log.info("PREVENTION MASK");
                        
                        reply = Replies.prevention.wearMask[userLanguage];
                        photo = ImageUrls.prevention.wearMask[userLanguage];
                        
                        options = [{
                            "text" : ButtonLabels.prevention.stayHome[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_STAYHOME:1`
                        }, {
                            "text" : ButtonLabels.prevention.coverCoughsAndSneezes[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_COVER:1`
                        }, {
                            "text" : ButtonLabels.prevention.cleanAndDisinfect[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_CLEAN:1`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Prevention"}),
                            "callback_data" : `CMD:CORO:PREVENTION:1`
                        }];
                      
                        break;
                        
                    case "PREVENTION_CLEAN":
                        log.info("PREVENTION CLEAN DISINFECT");
                        
                        reply = Replies.prevention.cleanAndDisinfect[userLanguage];
                        photo = ImageUrls.prevention.cleanAndDisinfect[userLanguage];
                        
                        options = [{
                            "text" : ButtonLabels.prevention.toDisinfect[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_TODISINFECT:1`
                        }, {
                            "text" : ButtonLabels.prevention.stayHome[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_STAYHOME:1`
                        }, {
                            "text" : ButtonLabels.prevention.coverCoughsAndSneezes[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_COVER:1`
                        }, {
                            "text" : ButtonLabels.prevention.wearMask[userLanguage],
                            "callback_data" :  `CMD:CORO:PREVENTION_MASK:1`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Prevention"}),
                            "callback_data" : `CMD:CORO:PREVENTION:1`
                        }];
                      
                        break;
                        
                    case "PREVENTION_TODISINFECT":
                        log.info("PREVENTION HOW TO DISINFECT");
                        
                        reply = Replies.prevention.toDisinfect[userLanguage];
                        photo = ImageUrls.prevention.toDisinfect[userLanguage];
                        
                        options = [{
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Protecting Others"}),
                            "callback_data" : `CMD:CORO:PREVENTION_OTHERS:1`
                        }];
                      
                        break;
                        
                    case "ASSESSMENT":
                        log.info("ASSESSMENT");
                        
                        reply = Replies.selfAssessment.menu[userLanguage];
                        options = [{
                            "text" : ButtonLabels.selfAssessment.start[userLanguage],
                            "callback_data" :  `CMD:CORO:ASSESSMENTSTART:${molog.customer.uuid}`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Main Menu"}),
                            "callback_data" : `CMD:CORO:HOME:1`
                        }]
                        
                        break;
                        
                    case "ASSESSMENTSTART":
                        log.info("ASSESSMENT QN 1");
                        
                        reply = Replies.selfAssessment.qnTravel[userLanguage];
                        photo = ImageUrls.selfAssessment.qnTravel[userLanguage];
                        
                        options = [{
                            "text" : ButtonLabels.selfAssessment.ansYes[userLanguage],
                            "callback_data" :  `CMD:CORO:ASSESSMENT_QN1_YES:${molog.customer.uuid}`
                        }, {
                            "text" : ButtonLabels.selfAssessment.ansNo[userLanguage],
                            "callback_data" :  `CMD:CORO:ASSESSMENT_QN1_NO:${molog.customer.uuid}`
                        }]
                        
                        break;
                        
                    case "ASSESSMENT_QN1_YES":
                        log.info("ASSESSMENT QN 1 YES");
                        
                        assessmentKey = `coroAssessment:${molog.sessionId}`;
                        await resources.setExpireRedis(assessmentKey, JSON.stringify({travel : "Y"}), 300);
                        
                        reply = Replies.selfAssessment.qnExposureYesTravel[userLanguage];
                        options = [{
                            "text" : ButtonLabels.selfAssessment.ansYes[userLanguage],
                            "callback_data" :  `CMD:CORO:ASSESSMENT_QN2_YES:${molog.customer.uuid}`
                        }, {
                            "text" : ButtonLabels.selfAssessment.ansNo[userLanguage],
                            "callback_data" :  `CMD:CORO:ASSESSMENT_QN2_NO:${molog.customer.uuid}`
                        }];
                        
                        break;
                        
                    case "ASSESSMENT_QN1_NO":
                        log.info("ASSESSMENT QN 1 NO");
                        
                        assessmentKey = `coroAssessment:${molog.sessionId}`;
                        await resources.setExpireRedis(assessmentKey, JSON.stringify({travel : "N"}), 300);
                        
                        reply = Replies.selfAssessment.qnExposureNoTravel[userLanguage];
                        options = [{
                            "text" : ButtonLabels.selfAssessment.ansYes[userLanguage],
                            "callback_data" :  `CMD:CORO:ASSESSMENT_QN2_YES:${molog.customer.uuid}`
                        }, {
                            "text" : ButtonLabels.selfAssessment.ansNo[userLanguage],
                            "callback_data" :  `CMD:CORO:ASSESSMENT_QN2_NO:${molog.customer.uuid}`
                        }];
                        
                        break;
                        
                    case "ASSESSMENT_QN2_YES":
                        log.info("ASSESSMENT QN 2 YES");
                        
                        assessmentKey = `coroAssessment:${molog.sessionId}`;
                        assessmentResponse = JSON.parse(await resources.getRedis(assessmentKey));
                        assessmentResponse.contact = "Y";
                        await resources.setExpireRedis(assessmentKey, JSON.stringify(assessmentResponse), 300);
                        
                        reply = Replies.selfAssessment.qnSymptoms[userLanguage];
                        options = [{
                            "text" : ButtonLabels.selfAssessment.ansYes[userLanguage],
                            "callback_data" :  `CMD:CORO:ASSESSMENT_QN3_YES:${molog.customer.uuid}`
                        }, {
                            "text" : ButtonLabels.selfAssessment.ansNo[userLanguage],
                            "callback_data" :  `CMD:CORO:ASSESSMENT_QN3_NO:${molog.customer.uuid}`
                        }];
                        
                        break;
                        
                    case "ASSESSMENT_QN2_NO":
                        log.info("ASSESSMENT QN 2 NO");
                        
                        assessmentKey = `coroAssessment:${molog.sessionId}`;
                        assessmentResponse = JSON.parse(await resources.getRedis(assessmentKey));
                        assessmentResponse.contact = "N";
                        await resources.setExpireRedis(assessmentKey, JSON.stringify(assessmentResponse), 300);
                        
                        reply = Replies.selfAssessment.qnSymptoms[userLanguage]
                        options = [{
                            "text" : ButtonLabels.selfAssessment.ansYes[userLanguage],
                            "callback_data" :  `CMD:CORO:ASSESSMENT_QN3_YES:${molog.customer.uuid}`
                        }, {
                            "text" : ButtonLabels.selfAssessment.ansNo[userLanguage],
                            "callback_data" :  `CMD:CORO:ASSESSMENT_QN3_NO:${molog.customer.uuid}`
                        }];
                        
                        break;
                        
                    case "ASSESSMENT_QN3_YES":
                        log.info("ASSESSMENT QN 3 YES");
                        
                        assessmentKey = `coroAssessment:${molog.sessionId}`;
                        assessmentResponse = JSON.parse(await resources.getRedis(assessmentKey));
                        assessmentResponse.symptoms = "Y";
                        await resources.setExpireRedis(assessmentKey, JSON.stringify(assessmentResponse), 300);
                        
                        reply = Replies.selfAssessment.qnGender[userLanguage];
                        options = [{
                            "text" : ButtonLabels.selfAssessment.genderMale[userLanguage],
                            "callback_data" :  `CMD:CORO:ASSESSMENT_MALE:${molog.customer.uuid}`
                        }, {
                            "text" : ButtonLabels.selfAssessment.genderFemale[userLanguage],
                            "callback_data" :  `CMD:CORO:ASSESSMENT_FEMALE:${molog.customer.uuid}`
                        }];
                        
                        break;
                        
                    case "ASSESSMENT_QN3_NO":
                        log.info("ASSESSMENT QN 3 NO");
                        
                        assessmentKey = `coroAssessment:${molog.sessionId}`;
                        assessmentResponse = JSON.parse(await resources.getRedis(assessmentKey));
                        assessmentResponse.symptoms = "N";
                        await resources.setExpireRedis(assessmentKey, JSON.stringify(assessmentResponse), 300);
                        
                        reply = `Okay! May I know your gender?`;
                        options = [{
                            "text" : ButtonLabels.selfAssessment.genderMale[userLanguage],
                            "callback_data" :  `CMD:CORO:ASSESSMENT_MALE:${molog.customer.uuid}`
                        }, {
                            "text" : ButtonLabels.selfAssessment.genderFemale[userLanguage],
                            "callback_data" :  `CMD:CORO:ASSESSMENT_FEMALE:${molog.customer.uuid}`
                        }];
                        
                        break;
                        
                    case "ASSESSMENT_MALE":
                        log.info("ASSESSMENT MALE");
                        
                        assessmentKey = `coroAssessment:${molog.sessionId}`;
                        assessmentResponse = JSON.parse(await resources.getRedis(assessmentKey));
                        assessmentResponse.gender = "M";
                        await resources.setExpireRedis(assessmentKey, JSON.stringify(assessmentResponse), 300);
                        
                        await LambdaInvoker.invoke({
                            properties,
                            ms: "coro-mdl-user",
                            payload: {
                                function: "setGenderByUuid",
                                payload: {
                                    uuid : molog.customer.uuid,
                                    gender : "M"
                                }
                            }
                        });
                        
                        // reply = Replies.selfAssessment.viewResults[userLanguage];
                        // options = [{
                        //     "text" : ButtonLabels.selfAssessment.viewResults[userLanguage],
                        //     "callback_data" :  `CMD:CORO:ASSESSMENT_RESULTS:${molog.customer.uuid}`
                        // }];
                        
                        // break;
                        
                        responseAnswers = `${assessmentResponse.travel}${assessmentResponse.contact}${assessmentResponse.symptoms}`;
                        log.info("RESPONSE ANSWERS:", responseAnswers);
                        
                        reply = Replies.selfAssessmentResults[responseAnswers][userLanguage];
                        
                        if(assessmentResponse.symptoms == "N" || (assessmentResponse.contact == "N" && assessmentResponse.travel == "N")) {
                            options = [{
                                "text" : ButtonLabels.generalInformation.prevention[userLanguage],
                                "callback_data" : `CMD:CORO:PREVENTION:${molog.customer.uuid}`
                            }, {
                                "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Main Menu"}),
                                "callback_data" : `CMD:CORO:HOME:${molog.customer.uuid}`
                            }];
                        }
                        
                        break;
                        
                    case "ASSESSMENT_FEMALE":
                        log.info("ASSESSMENT FEMALE");
                        
                        assessmentKey = `coroAssessment:${molog.sessionId}`;
                        assessmentResponse = JSON.parse(await resources.getRedis(assessmentKey));
                        assessmentResponse.gender = "F";
                        await resources.setExpireRedis(assessmentKey, JSON.stringify(assessmentResponse), 300);
                        
                        await LambdaInvoker.invoke({
                            properties,
                            ms: "coro-mdl-user",
                            payload: {
                                function: "setGenderByUuid",
                                payload: {
                                    uuid : molog.customer.uuid,
                                    gender : "F"
                                }
                            }
                        });
                        
                    //     reply = Replies.selfAssessment.viewResults[userLanguage];
                    //     options = [{
                    //         "text" : ButtonLabels.selfAssessment.viewResults[userLanguage],
                    //         "callback_data" :  `CMD:CORO:ASSESSMENT_RESULTS:${molog.customer.uuid}`
                    //     }];
                        
                    //     break;
                        
                    // case "ASSESSMENT_RESULTS":
                    //     log.info("ASSESSMENT RESULTS");
                        
                    //     assessmentKey = `coroAssessment:${molog.sessionId}`;
                    //     assessmentResponse = JSON.parse(await resources.getRedis(assessmentKey));
                        
                        responseAnswers = `${assessmentResponse.travel}${assessmentResponse.contact}${assessmentResponse.symptoms}`;
                        log.info("RESPONSE ANSWERS:", responseAnswers);
                        
                        reply = Replies.selfAssessmentResults[responseAnswers][userLanguage];
                        
                        if(assessmentResponse.symptoms == "N" || (assessmentResponse.contact == "N" && assessmentResponse.travel == "N")) {
                            options = [{
                                "text" : ButtonLabels.generalInformation.prevention[userLanguage],
                                "callback_data" : `CMD:CORO:PREVENTION:${molog.customer.uuid}`
                            }, {
                                "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Main Menu"}),
                                "callback_data" : `CMD:CORO:HOME:${molog.customer.uuid}`
                            }];
                        }
                        
                        break;
                        
                    case "STATSNEWS":
                        log.info("STATSNEWS");
                        log.info("CORO USER:", coroUser);
                        
                        if(coroUser.country) {
                            reply = Mustache.render(Replies.statsNews.menu[userLanguage], {userCountry: country});
                            options = [{
                                "text" : ButtonLabels.statsNews.stats[userLanguage],
                                "callback_data" : `CMD:CORO:STATS:${molog.customer.uuid}`
                            }, {
                                "text" : ButtonLabels.statsNews.news[userLanguage],
                                "callback_data" : `CMD:CORO:NEWS:${molog.customer.uuid}`
                            }, {
                                "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Main Menu"}),
                                "callback_data" : `CMD:CORO:HOME:${molog.customer.uuid}`
                            }];
                        } else {
                            
                            await Responder.sendResponse({
                                reply : Replies.settings.selectCountryDetails[userLanguage],
                                sessionId : molog.sessionId,
                                channel : molog.channel
                            }); 
                            
                            await Responder.sendToCustomerDF({
                                molog,
                                // messageToDF : "set country"
                                eventName : "setCountryEvent",
                                parameters : {
                                    "newsStats" : "true"
                                }
                            })
                        }
                        
                        break;
                        
                    case "STATS":
                        log.info("STATS");
                        
                        let stats = await LambdaInvoker.invoke({
                            properties, 
                            ms : "coro-lamb-getstats", 
                            payload : {
                                "function" : "getStats",
                                "payload" : { country }
                            }
                        }).then(Response.promise);
                        
                        photo = stats.image;
                        
                    //     let statOptions = {
                    //         url: 'http://api.coronatracker.com/v2/stats/latest'
                    //     };
                        
                    //     let statArr = await Request.get(statOptions)
                    // 	.then(process => {
                    // 	    console.log("Fetched stat data successfully");
                    // 		return (JSON.parse(process));
                    // 	})
                    // 	.catch(err => {
                    // 		console.log(err);
                    // 	});
                        
                    //     let indoObj = statArr.filter(x => x.country == 'Indonesia')[0];
                        
                        reply = Mustache.render(Replies.statsNews.stats[userLanguage],
                            {
                                userCountry: country,
                                confirmedCount: stats.confirmed,
                                recoveredCount: stats.recovered,
                                deathCount: stats.deaths
                                
                            });
                        
                        break;
                        
                    case "NEWS":
                        log.info("NEWS");
                        
                        await Responder.sendResponse({
                            reply : Replies.statsNews.news[userLanguage],
                            sessionId : molog.sessionId,
                            channel : molog.channel
                        });
                        
                        //Get news URLs from CoronAPI
                        let newsLimit = '3';
                        
                        let newsOptions = {
                            url: `http://api.coronatracker.com/news/trending?limit=${newsLimit}&country=${country}&language=en,id`
                        };
                        log.info("URL:", newsOptions.url);
                        
                        let newsArr = await Request.get(newsOptions)
                        .then(process => {
                            console.log("Fetched news successfully");
                            return (JSON.parse(process));
                        })
                        .catch(err => {
                            console.log(err);
                        });
                        
                        let newsUrls = newsArr.items.map(newsItem => newsItem.url);
                        
                        //Send URLs in individual messages
                        for (let newsUrl of newsUrls) {
                            await Responder.sendResponse({
                                reply : newsUrl,
                                sessionId : molog.sessionId,
                                channel : molog.channel
                            });
                        }
                        
                        //Get subscription status
                        let newsSubscriptionStatus = await LambdaInvoker.invoke({
                            properties, 
                            ms : "coro-mdl-user", 
                            payload : {
                                "function" : "getSubscriptionStatus",
                                "payload" : {
                                    uuid : molog.customer.uuid,
                                    subscriptionType : 'news'
                                }
                            }
                        });
                        
                        //Ask for subscription/cancellation
                        if (newsSubscriptionStatus == 'active') {
                            reply = Replies.subscription.isSubbedNews[userLanguage];
                            options = [{
                                'text' : ButtonLabels.subscription.unsubNews[userLanguage],
                                'callback_data' : `CMD:CORO:NEWS_SUBSCRIPTION_OFF`
                            }];
                        }
                        else if (newsSubscriptionStatus == 'inactive') {
                            reply = Replies.subscription.isUnsubbedNews[userLanguage];
                            options = [{
                                'text' : ButtonLabels.subscription.subNews[userLanguage],
                                'callback_data' : `CMD:CORO:NEWS_SUBSCRIPTION_ON`
                            }];
                        }
                        
                        break;
                    
                    case "NEWS_SUBSCRIPTION_ON":
                        log.info("SUBSCRIPTION ON");
                        
                        //Invoke lambda to set subscription flag
                        let newsWasNotSubscribed = await LambdaInvoker.invoke({
                            properties, 
                            ms : "coro-mdl-user", 
                            payload : {
                                "function" : "setSubscriptionStatus",
                                "payload" : {
                                    uuid : molog.customer.uuid,
                                    subscriptionType : 'news',
                                    newStatus : 'active'
                                }
                            }
                        });
                        
                        if (newsWasNotSubscribed) {
                            reply = Replies.subscription.isUnsubbedSubEvent[userLanguage];
                            options = [{
                                'text' : ButtonLabels.subscription.unsubNews[userLanguage],
                                'callback_data' : `CMD:CORO:NEWS_SUBSCRIPTION_OFF`
                            }];
                        }
                        else {
                            reply = Replies.subscription.isSubbedSubEvent[userLanguage];
                        }
                        
                        break;
                    
                    case "NEWS_SUBSCRIPTION_OFF":
                        log.info("SUBSCRIPTION OFF");
                        
                        //Invoke lambda to set subscription flag
                        let newsWasSubscribed = await LambdaInvoker.invoke({
                            properties, 
                            ms : "coro-mdl-user", 
                            payload : {
                                "function" : "setSubscriptionStatus",
                                "payload" : {
                                    uuid : molog.customer.uuid,
                                    subscriptionType : 'news',
                                    newStatus : 'inactive'
                                }
                            }
                        });
                        
                        if (newsWasSubscribed) {
                            reply = Replies.subscription.isSubbedUnsubEvent[userLanguage];
                            options = [{
                                'text' : ButtonLabels.subscription.subNews[userLanguage],
                                'callback_data' : `CMD:CORO:NEWS_SUBSCRIPTION_ON`
                            }];
                        }
                        else {
                            reply = Replies.subscription.isUnsubbedUnsubEvent[userLanguage];
                        }
                            
                        break;
                        
                    case "RESOURCES":
                        log.info("RESOURCES");
                        
                        reply = Replies.otherResources.menu[userLanguage];
                        options = [{
                            "text" : ButtonLabels.otherResources.infographics[userLanguage],
                            "callback_data" :  `CMD:CORO:INFOGRAPHIC:1`
                        }, {
                            "text" : `🛠 DIY Ventilators`,
                            "callback_data" : `CMD:CORO:VENTILATOR:MENU`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Main Menu"}),
                            "callback_data" : `CMD:CORO:HOME:1`
                        }];
                      
                        break;
                        
                    case "INFOGRAPHIC":
                        log.info("INFOGRAPHIC");
                        
                        reply = Replies.otherResources.infographics[userLanguage];
                        options = [{
                            "text" : ButtonLabels.otherResources.infographicsHygiene[userLanguage],
                            "callback_data" : `CMD:CORO:INFOGRAPHIC_HYGIENE:1`
                        }, {
                            "text" : ButtonLabels.otherResources.infographicsSymptoms[userLanguage],
                            "callback_data" : `CMD:CORO:INFOGRAPHIC_SYMPTOMS:1`
                        }];
                      
                        break;
                        
                    case "INFOGRAPHIC_HYGIENE":
                        log.info("INFOGRAPHIC HYGIENE");
                        
                        reply = Replies.otherResources.infographicsHygiene[userLanguage];
                        photo = ImageUrls.otherResources.infographicsHygiene[userLanguage];
                      
                        break;
                        
                    case "INFOGRAPHIC_SYMPTOMS":
                        log.info("INFOGRAPHIC HYGIENE");
                        
                        reply = Replies.otherResources.infographicsSymptoms[userLanguage];
                        photo = ImageUrls.otherResources.infographicsSymptoms[userLanguage];
                        
                        break;
                        
                    case "VENTILATOR":
                        log.info("VENTILATOR");
                        
                        await VentilatorCtrl.processCallbackCommand({ molog, coroService, userCoroRole });
                        
                        break;
                        
                    case "HOME":
                        log.info("HOME");
                        
                        await CustomerCmdCtrl.defaultResponse({
                            sessionId : molog.sessionId,
                            channel : molog.channel,
                            molog, coroService,
                            coroUser
                        });
                        
                        break;
                        
                    case "SETTINGS":
                        log.info("SETTINGS");
                        
                        reply = Replies.settings.menu[userLanguage];
                        options = [{
                            "text" : ButtonLabels.settings.selectCountry[userLanguage],
                            "callback_data" : `CMD:CORO:CHANGECOUNTRY:${molog.customer.uuid}`
                        }, {
                            "text" : ButtonLabels.settings.selectLanguage[userLanguage],
                            "callback_data" : `CMD:CORO:CHANGELANGUAGE:${molog.customer.uuid}`
                        }, {
                            "text" : Mustache.render(ButtonLabels.common.backToMenu[userLanguage], {menuName: "Main Menu"}),
                            "callback_data" : `CMD:CORO:HOME:${molog.customer.uuid}`
                        }];
                        
                        break;
                        
                    case "CHANGECOUNTRY":
                        log.info("CHANGE COUNTRY");
                        
                        await Responder.sendToCustomerDF({
                            molog,
                            eventName : "setCountryEvent"
                        });
                        
                        break;
                        
                    case "CHANGELANGUAGE":
                        log.info("CHANGE LANGUAGE");
                        
                        reply = Replies.settings.selectLanguage[userLanguage];
                        options = [{
                            "text" : ButtonLabels.language.en,
                            "callback_data" : `CMD:CORO:CHANGELANGUAGE_ENGLISH:1`
                        }, {
                            "text" : ButtonLabels.language.id,
                            "callback_data" : `CMD:CORO:CHANGELANGUAGE_INDONESIAN:1`
                        }];
                        
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
    
    static async defaultResponse({ sessionId, channel, molog, coroService, coroUser }) {
        // Do Menu stuff
        log.info("DEFAULT RESPONSE CALLED");
        
        let reply, options, photo;
        
        let userLanguage = coroUser.language || "en";
        
        reply = Replies.mainMenu.menu[userLanguage];
        
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
        }];
            
        await Responder.sendResponse({ reply, sessionId, photo, options, chunk : 1, channel });
            
    }
    
}

module.exports = CustomerCmdCtrl;