import express from "express";
import jwtVerify from "../middleware/jwtVerify.js";
import { upload } from "../middleware/cloudinary.js";
import {
  createPost,
  deletePost,
  getAllPost,
  getPostDetails,
  updatePost,
} from "../controllers/post.controller.js";
const router = express.Router();

router.post("/upload", jwtVerify, upload.array("images", 10), createPost);
router.put("/update-post", jwtVerify, upload.array("images", 10), updatePost);
router.get("/post/:id", getPostDetails);
router.get("/getAllpost", jwtVerify, getAllPost);
router.delete("/remove", jwtVerify, deletePost);

export default router;
