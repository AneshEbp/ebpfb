import express from "express";
import jwtVerify from "../middleware/jwtVerify.js";
import {
  acceptRequest,
  addFriend,
  getFriend,
  getFriendRequest,
  rejectRequest,
  unfriend,
} from "../controllers/friend.controller.js";

const router = express.Router();
router.post("/add", jwtVerify, addFriend);
router.get("/getRequest", jwtVerify, getFriendRequest);
router.put("/accept", jwtVerify, acceptRequest);
router.put("/reject", jwtVerify, rejectRequest);
router.get("/getfriends", jwtVerify, getFriend);
router.delete("/unfriend", jwtVerify, unfriend);
export default router;
