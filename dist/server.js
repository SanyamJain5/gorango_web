"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const frauds_1 = __importDefault(require("./routes/frauds"));
const logger_1 = require("./utils/logger");
function createServer() {
    const app = (0, express_1.default)();
    app.use(body_parser_1.default.json());
    app.use("/", frauds_1.default);
    // basic 404
    app.use((req, res) => {
        res.status(404).json({ error: "Not Found" });
    });
    // error handler
    app.use((err, _req, res, _next) => {
        logger_1.logger.warn("Unhandled server error", { error: err?.message || err });
        res.status(500).json({ error: "Internal Server Error" });
    });
    return app;
}
