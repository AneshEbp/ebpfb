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

router.post("/upload", jwtVerify, upload.single("image"), createPost);
router.put("/update-post", jwtVerify, updatePost);
router.get("/post/:id", getPostDetails);
router.get("/getAllpost", getAllPost);
router.delete("/remove", jwtVerify, deletePost);

export default router;
