import mongoose from "mongoose";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import CommentOutlier from "../models/comment.outlier.model.js";

export const createComment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const userId = req.user?.userId;
    const name = req.user?.username;
    const email = req.user?.useremail;
    const { postId, content, parent_commentId } = req.body;
    console.log(req.body);

    // ✅ Input validation
    if (!postId)
      return res.status(400).json({ message: "post id is required" });
    if (!content)
      return res.status(400).json({ message: "comment content is required" });

    // ✅ Check post existence
    const post = await Post.findById(postId).session(session);
    if (!post) {
      await session.abortTransaction();
      return res.status(404).json({ message: "post not found" });
    }

    // --- CASE 1: Comments still within limit ---
    if (post.commentCounter < 500) {
      const newComment = new Comment({
        postId,
        userId,
        userDetails: { name, email },
        content,
        parent_commentId: parent_commentId || null,
      });

      await newComment.save({ session });
      post.commentCounter += 1;

      // ✅ If reply, increment parent’s reply count
      if (parent_commentId) {
        await Comment.findByIdAndUpdate(
          parent_commentId,
          { $inc: { repliesCount: 1 } },
          { session }
        );
      }

      // ✅ Update post recentComment (keep 3 recent)
      post.recentComment.push({
        commentId: newComment._id,
        userId,
        content,
        userDetails: { name, email },
        createdAt: new Date(),
      });
      if (post.recentComment.length > 3) {
        post.recentComment = post.recentComment.slice(-3);
      }

      await post.save({ session });
      await session.commitTransaction();

      return res.status(201).json({ message: "comment created successfully" });
    }

    // --- CASE 2: Move to CommentOutlier bucket ---
    const outliers = await CommentOutlier.find({ postId })
      .sort({ bucket_no: 1 })
      .session(session);

    if (!outliers || outliers.length === 0) {
      // No outlier exists → create one
      const newOutlier = new CommentOutlier({
        postId,
        bucket_no: 1,
        comments: [
          {
            userId,
            userDetails: { name, email },
            content,
            parent_commentId: parent_commentId || null,
          },
        ],
      });
      await newOutlier.save({ session });
      post.commentCounter += 1;

      if (parent_commentId) {
        await Comment.findByIdAndUpdate(
          parent_commentId,
          { $inc: { repliesCount: 1 } },
          { session }
        );
      }

      // ✅ Update recentComment
      post.recentComment.push({
        commentId: null, // outlier comments aren’t separate Comment docs
        userId,
        content,
        userDetails: { name, email },
        createdAt: new Date(),
      });
      if (post.recentComment.length > 3) {
        post.recentComment = post.recentComment.slice(-3);
      }

      await post.save({ session });
      await session.commitTransaction();
      return res
        .status(201)
        .json({ message: "comment created (new outlier bucket)" });
    }

    // --- CASE 3: Existing outlier buckets ---
    let added = false;
    for (const outlier of outliers) {
      if (outlier.comments.length < 100) {
        outlier.comments.push({
          userId,
          userDetails: { name, email },
          content,
          parent_commentId: parent_commentId || null,
        });
        await outlier.save({ session });
        post.commentCounter += 1;

        if (parent_commentId) {
          await Comment.findByIdAndUpdate(
            parent_commentId,
            { $inc: { repliesCount: 1 } },
            { session }
          );
        }

        // ✅ Update recentComment
        post.recentComment.push({
          commentId: null,
          userId,
          content,
          userDetails: { name, email },
          createdAt: new Date(),
        });
        if (post.recentComment.length > 3) {
          post.recentComment = post.recentComment.slice(-3);
        }

        await post.save({ session });
        await session.commitTransaction();
        added = true;
        break;
      }
    }

    // --- CASE 4: All outlier buckets are full → create new one ---
    if (!added) {
      const lastBucket = outliers[outliers.length - 1]?.bucket_no || 1;
      const newOutlier = new CommentOutlier({
        postId,
        bucket_no: lastBucket + 1,
        comments: [
          {
            userId,
            userDetails: { name, email },
            content,
            parent_commentId: parent_commentId || null,
          },
        ],
      });

      await newOutlier.save({ session });
      post.commentCounter += 1;

      if (parent_commentId) {
        await Comment.findByIdAndUpdate(
          parent_commentId,
          { $inc: { repliesCount: 1 } },
          { session }
        );
      }

      // ✅ Update recentComment
      post.recentComment.push({
        commentId: null,
        userId,
        content,
        userDetails: { name, email },
        createdAt: new Date(),
      });
      if (post.recentComment.length > 3) {
        post.recentComment = post.recentComment.slice(-3);
      }

      await post.save({ session });
      await session.commitTransaction();
    }

    return res.status(201).json({ message: "comment created successfully" });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    return res.status(500).json({ message: "server error: " + err.message });
  } finally {
    session.endSession();
  }
};

export const updateComment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { commentId, content } = req.body;

    if (!commentId) {
      return res.status(400).json({ message: "commentId is required" });
    }
    if (!content) {
      return res.status(400).json({ message: "content is required" });
    }

    // ✅ Try to find the comment in the main Comment collection
    let comment = await Comment.findOne({ _id: commentId, userId });
    let postId = null;

    if (comment) {
      comment.content = content;
      await comment.save();
      postId = comment.postId;
    } else {
      // ✅ Try to find it in CommentOutlier buckets
      const outlier = await CommentOutlier.findOne({
        "comments._id": commentId,
        "comments.userId": userId,
      });

      if (!outlier) {
        return res.status(404).json({ message: "comment not found" });
      }

      // ✅ Update the specific subdocument in comments array
      const commentIndex = outlier.comments.findIndex(
        (c) => c._id.toString() === commentId
      );

      if (commentIndex === -1) {
        return res
          .status(404)
          .json({ message: "comment not found in outlier" });
      }

      outlier.comments[commentIndex].content = content;
      await outlier.save();

      postId = outlier.postId;
    }

    // ✅ Update Post.recentComment if this comment is listed there
    if (postId) {
      await Post.updateOne(
        { _id: postId, "recentComment.commentId": commentId },
        {
          $set: { "recentComment.$.content": content },
        }
      );
    }

    return res.status(200).json({ message: "comment updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "server error: " + err.message });
  }
};

export const deleteComment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { postId, commentId } = req.body;
    const userId = req.user.userId;

    if (!postId || !commentId) {
      return res
        .status(400)
        .json({ message: "postId and commentId are required" });
    }

    const post = await Post.findById(postId).session(session);
    if (!post) {
      await session.abortTransaction();
      return res.status(404).json({ message: "post not found" });
    }

    let deleted = false;
    let parentId = null;

    // --- 1️⃣ Try deleting from main Comment collection
    const comment = await Comment.findOne({ _id: commentId, userId }).session(
      session
    );
    if (comment) {
      parentId = comment.parent_commentId;
      await Comment.deleteOne({ _id: commentId, userId }).session(session);
      deleted = true;
    } else {
      // --- 2️⃣ Try deleting from CommentOutlier array
      const outlier = await CommentOutlier.findOne({
        postId,
        "comments._id": commentId,
        "comments.userId": userId,
      }).session(session);

      if (outlier) {
        const targetComment = outlier.comments.find(
          (c) => c._id.toString() === commentId
        );
        parentId = targetComment?.parent_commentId || null;

        const result = await CommentOutlier.updateOne(
          { _id: outlier._id },
          { $pull: { comments: { _id: commentId } } }
        ).session(session);

        if (result.modifiedCount > 0) deleted = true;
      }
    }

    if (!deleted) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ message: "comment not found or not authorized" });
    }

    // --- 3️⃣ Handle parent comment reply count (both Comment & Outlier)
    if (parentId) {
      // Try in Comment
      const parentInMain = await Comment.findById(parentId).session(session);
      if (parentInMain) {
        await Comment.updateOne(
          { _id: parentId },
          { $inc: { repliesCount: -1 } }
        ).session(session);
      } else {
        // Try in Outlier
        await CommentOutlier.updateOne(
          { "comments._id": parentId },
          { $inc: { "comments.$.repliesCount": -1 } }
        ).session(session);
      }
    }

    // --- 4️⃣ Update Post (decrement count & remove from recentComment)
    await Post.updateOne(
      { _id: postId },
      {
        $inc: { commentCounter: -1 },
        $pull: { recentComment: { commentId } },
      }
    ).session(session);

    await session.commitTransaction();

    return res.status(200).json({ message: "comment deleted successfully" });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    return res.status(500).json({ message: "server error: " + err.message });
  } finally {
    session.endSession();
  }
};

export const getComments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const postId = req.params.postId;
    if (!postId) {
      return res.status(400).json({ message: "postId is required" });
    }

    const skip = (Number(page) - 1) * Number(limit);

    // --- 1️⃣ Fetch parent comments from main Comment collection
    const mainComments = await Comment.find({
      postId,
      parent_commentId: null,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select("_id userDetails content createdAt repliesCount");

    // --- 2️⃣ Fetch parent comments from outlier buckets
    const outlierDocs = await CommentOutlier.find({ postId });
    const outlierComments = [];

    outlierDocs.forEach((bucket) => {
      bucket.comments.forEach((c) => {
        if (!c.parent_commentId) {
          outlierComments.push({
            _id: c._id,
            userId: c.userId,
            userDetails: c.userDetails,
            content: c.content,
            createdAt: c.createdAt,
            repliesCount: c.repliesCount || 0,
          });
        }
      });
    });

    // --- 3️⃣ Merge & sort all parent comments
    const allParentComments = [...mainComments, ...outlierComments].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // --- 4️⃣ Pagination (if total > limit)
    const paginatedComments = allParentComments.slice(
      skip,
      skip + Number(limit)
    );

    // --- 5️⃣ Count total parent comments
    const totalParents =
      (await Comment.countDocuments({ postId, parent_commentId: null })) +
      outlierComments.length;

    return res.status(200).json({
      message: "parent comments fetched successfully",
      total: totalParents,
      page: Number(page),
      limit: Number(limit),
      comments: paginatedComments,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "server error: " + err.message });
  }
};

export const getChildComments = async (req, res) => {
  try {
    const { parentId } = req.body;
    const postId = req.params.postId;
    if (!parentId) {
      return res.status(400).json({ message: "parentId is required" });
    }
    if (!postId) {
      return res.status(400).json({ message: "postId is required" });
    }

    // --- 1️⃣ Fetch replies from main Comment collection
    const replies = await Comment.find({
      postId,
      parent_commentId: parentId,
    })
      .sort({ createdAt: 1 }) // oldest first for natural thread order
      .select(
        "_id userDetails content createdAt repliesCount parent_commentId"
      );

    // --- 2️⃣ Fetch replies from CommentOutlier buckets
    const outlierDocs = await CommentOutlier.find({ postId });
    const outlierReplies = [];

    outlierDocs.forEach((bucket) => {
      bucket.comments.forEach((c) => {
        if (c.parent_commentId?.toString() === parentId.toString()) {
          outlierReplies.push({
            _id: c._id,
            userId: c.userId,
            userDetails: c.userDetails,
            content: c.content,
            createdAt: c.createdAt,
            repliesCount: c.repliesCount || 0,
            parent_commentId: c.parent_commentId,
          });
        }
      });
    });

    // --- 3️⃣ Merge and sort all replies
    const allReplies = [...replies, ...outlierReplies].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    return res.status(200).json({
      message: "child comments fetched successfully",
      total: allReplies.length,
      comments: allReplies,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "server error: " + err.message });
  }
};
