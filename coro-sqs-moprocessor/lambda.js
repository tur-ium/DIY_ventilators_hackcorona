const Bunyan = require("bunyan");
const CoroLib = require("coro-lib");

const log = Bunyan.createLogger({ name : "coro-sqs-moprocessor:lambda" })

const {
    lib : { LambdaService }
} = CoroLib;

const EventProcessor = require('./event-processor');

let lambdaService = LambdaService.init({
    init : ({ event, Resources, properties }) => {
        log.info("################################## THE EVENTS: ", { event });
        event.function = "processSQS";
        // event.function = "ping" ? "ping" : "processSQS";

        return EventProcessor.init({ Resources, properties });
    },
    processSQS : EventProcessor.processSQS,
    ping : EventProcessor.ping
});

exports.handler = lambdaService.handler;