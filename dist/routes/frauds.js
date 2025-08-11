"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const storage_1 = require("../models/storage");
const router = express_1.default.Router();
router.get("/frauds", (req, res) => {
    const list = (0, storage_1.getAll)();
    res.json(list);
});
router.get("/frauds/:userId", (req, res) => {
    const userId = req.params.userId;
    const list = (0, storage_1.getByUser)(userId);
    res.json(list);
});
router.get("/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
});
exports.default = router;
