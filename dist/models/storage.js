"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.load = load;
exports.save = save;
exports.addFlag = addFlag;
exports.getAll = getAll;
exports.getByUser = getByUser;
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("../utils/logger");
const config_1 = require("../utils/config");
const filePath = config_1.config.persistenceFile;
let flagged = [];
function ensureFile() {
    const dir = require("path").dirname(filePath);
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
    if (!fs_1.default.existsSync(filePath))
        fs_1.default.writeFileSync(filePath, JSON.stringify([]));
}
function load() {
    try {
        ensureFile();
        const raw = fs_1.default.readFileSync(filePath, "utf8");
        flagged = JSON.parse(raw);
    }
    catch (err) {
        logger_1.logger.warn("Could not load flagged file, starting fresh", { err });
        flagged = [];
    }
}
function save() {
    try {
        fs_1.default.writeFileSync(filePath, JSON.stringify(flagged, null, 2));
    }
    catch (err) {
        logger_1.logger.warn("Failed to persist flagged transactions", { err });
    }
}
function addFlag(tx) {
    flagged.push(tx);
    save();
}
function getAll() {
    return flagged.slice().reverse(); // newest first
}
function getByUser(userId) {
    return flagged.filter((f) => f.userId === userId).reverse();
}
