import mongoose from "mongoose";
import Post from "../models/post.model.js";
import Share from "../models/shares.model.js";

export const sharePost = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { postId } = req.body;
    const userId = req.user.id;

    if (!postId) {
      return res.status(400).json({ message: "Post ID is required" });
    }

    const post = await Post.findById(postId).session(session);
    if (!post) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Post not found" });
    }

    const alreadyShared = await Share.exists({ postId, userId }).session(
      session
    );
    if (alreadyShared) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Post already shared by this user" });
    }

    const newShare = new Share({ postId, userId });
    await newShare.save({ session });

    post.shareCounter = (post.shareCounter || 0) + 1;
    await post.save({ session });

    await session.commitTransaction();
    return res.status(201).json({ message: "Post shared successfully" });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    return res.status(500).json({ message: "Server error: " + err.message });
  } finally {
    await session.endSession();
  }
};

export const unSharePost = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { postId } = req.body;
    const userId = req.user.id;

    if (!postId) {
      return res.status(400).json({ message: "Post ID is required" });
    }

    const post = await Post.findById(postId).session(session);
    if (!post) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Post not found" });
    }

    // Try deleting the share
    const deleteResult = await Share.deleteOne({ postId, userId }).session(
      session
    );

    if (deleteResult.deletedCount === 0) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ message: "You have not shared this post yet" });
    }

    // Decrement safely
    post.shareCounter = Math.max(0, (post.shareCounter || 0) - 1);
    await post.save({ session });

    await session.commitTransaction();
    return res.status(200).json({ message: "Post unshared successfully" });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    return res.status(500).json({ message: "Server error: " + err.message });
  } finally {
    await session.endSession();
  }
};

export const getTotalShareforPost = async (req, res) => {
  try {
    const postId = req.params.id;
    if (!postId) {
      return res.status(400).json({ message: "Post ID is required" });
    }

    const shares = await Share.find({ postId })
      .select("userId createdAt") // include createdAt if you want to show when shared
      .populate("userId", "name email");

    return res.status(200).json({
      totalShares: shares.length,
      shares,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error: " + err.message });
  }
};
