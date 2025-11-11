import express from "express";
import {
  changePassword,
  getUserProfile,
  login,
  register,
  updateDetails,
} from "../controllers/user.js";
import jwtVerify from "../middleware/jwtVerify.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.put("/update-profile", jwtVerify, updateDetails);
router.put("/change-password", jwtVerify, changePassword);
router.get("/profile", jwtVerify, getUserProfile);

export default router;
