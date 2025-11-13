import express from "express";
import jwtVerify from "../middleware/jwtVerify.js";
import {
  getTotalShareforPost,
  sharePost,
  unSharePost,
} from "../controllers/share.controller.js";

const router = express.Router();

router.post("/share", jwtVerify, sharePost);
router.delete("/unshare", jwtVerify, unSharePost);
router.get("/totalshare/:id", getTotalShareforPost);

export default router;
