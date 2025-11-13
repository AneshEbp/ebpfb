import express from "express";
import jwtVerify from "../middleware/jwtVerify.js";
import {
  createComment,
  deleteComment,
  getChildComments,
  getComments,
  updateComment,
} from "../controllers/commet.controller.js";

const router = express.Router();

router.post("/create", jwtVerify, createComment);
router.put("/update", jwtVerify, updateComment);
router.delete("/remove", jwtVerify, deleteComment);
router.get("/getparentsComment/:postId", getComments);
router.get("/getchildComments/:postId", getChildComments);

export default router;
