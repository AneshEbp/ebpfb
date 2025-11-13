import express from "express";
import jwtVerify from "../middleware/jwtVerify.js";
import {
  checkLikeStatus,
  getLikesForPost,
  likePost,
} from "../controllers/like.controller.js";

const router = express.Router();

router.post("/likePost", jwtVerify, likePost);
router.get("/getLikesForPost/:id", getLikesForPost);
router.get("/likestatus/:id", jwtVerify, checkLikeStatus);

export default router;
