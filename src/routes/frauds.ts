import express from "express";
import { getAll, getByUser } from "../models/storage";

const router = express.Router();

router.get("/frauds", (req, res) => {
  const list = getAll();
  res.json(list);
});

router.get("/frauds/:userId", (req, res) => {
  const userId = req.params.userId;
  const list = getByUser(userId);
  res.json(list);
});

router.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

export default router;
