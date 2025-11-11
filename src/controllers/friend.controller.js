import mongoose from "mongoose";
import Friend from "../models/friend.model.js";
import User from "../models/user.model.js";

export const addFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.body;
    const user = await User.findById(userId);
    if (userId.toString() == friendId.toString()) {
      return res
        .status(400)
        .json({ message: "can't send friend request to own" });
    }
    if (!user) {
      return res.status(404).json({ message: "Can't find the user" });
    }
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ message: "Can't find the freind" });
    }
    const isFriendAlready = await Friend.findOne({
      $or: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
    });
    if (isFriendAlready && isFriendAlready.status == "accepted") {
      return res.status(400).json({ message: "already friend" });
    }
    if (isFriendAlready && isFriendAlready.status == "requested") {
      return res.status(400).json({ message: "freind request already sent" });
    }
    const newFriend = new Friend({
      userId,
      friendId,
    });
    await newFriend.save();
    return res.status(201).json({ message: "freind request send" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "server error" + err.message });
  }
};

export const getFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const requestList = await Friend.find({
      friendId: userId,
      status: "requested",
    }).populate("userId", " name email");
    if (!requestList || requestList.length == 0) {
      return res.status(400).json({ message: "can not any request rn" });
    }
    res.status(200).json({ request: requestList });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "server error" + err.message });
  }
};

export const acceptRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendRequestId } = req.body;
    const friend = await Friend.findById(friendRequestId);
    if (!friend) {
      return res.status(404).json({ message: "invlaid request" });
    }
    if (friend.friendId.toString() != userId.toString()) {
      return res.status(400).json({ message: "invalid request" });
    }
    if (friend.status === "accepted") {
      return res.status(400).json({ message: "Request already accepted" });
    }
    friend.status = "accepted";
    await friend.save();
    return res.status(200).json({ message: "Request Accepted" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "server error" + err.message });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendRequestId } = req.body;
    const friend = await Friend.findById(friendRequestId);
    if (!friend) {
      return res.status(404).json({ message: "invlaid request" });
    }
    if (friend.friendId.toString() != userId.toString()) {
      return res.status(400).json({ message: "invalid request" });
    }
    if (friend.status === "accepted") {
      return res.status(400).json({ message: "Request already accepted" });
    }
    await Friend.deleteOne(friendRequestId);
    res.status(200).json({ message: "request rejected" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "server error" + err.message });
  }
};

export const getFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const friends = await Friend.find({
      $or: [
        { userId, status: "accepted" },
        { friendId: userId, status: "accepted" },
      ],
    })
      .populate("userId", "name email")
      .populate("friendId", "name email");
    if (!friends || friends.length === 0) {
      return res.status(404).json({ message: "No friends found" });
    }

    // 3️⃣ Normalize: return the other user and friendship info
    const formattedFriends = friends.map((f) => {
      const isUserTheRequester = f.userId._id.toString() === userId.toString();

      const friendUser = isUserTheRequester ? f.friendId : f.userId;

      return {
        friendshipId: f._id, // 🔹 ID of the Friend record
        friend: friendUser, // 🔹 Populated friend info
        status: f.status, // 🔹 Current friendship status
      };
    });

    // 4️⃣ Send response
    return res.status(200).json({ friends: formattedFriends });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "server error" + err.message });
  }
};

export const unfriend = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const { friendshipId } = req.body;
    const userId = req.user.id;

    // 1️⃣ Find the friendship first
    const friendship = await Friend.findById(friendshipId).session(session);

    if (!friendship) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Friendship not found" });
    }

    // 2️⃣ Check if user is part of this friendship
    const isAuthorized =
      friendship.userId.toString() === userId.toString() ||
      friendship.friendId.toString() === userId.toString();

    if (!isAuthorized) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Not authorized to unfriend" });
    }

    // 3️⃣ Delete the friendship
    await Friend.deleteOne({ _id: friendshipId }).session(session);

    // 4️⃣ Commit transaction
    await session.commitTransaction();
    return res.status(200).json({ message: "Unfriended successfully" });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    return res.status(500).json({ message: "Server error: " + err.message });
  } finally {
    await session.endSession();
  }
};
