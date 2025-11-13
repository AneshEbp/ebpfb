import mongoose from "mongoose";
import Like from "../models/likes.model.js";
import Post from "../models/post.model.js";
import LikeOutlier from "../models/likes.outlier.model.js";

// export const likePost = async (req, res) => {
//   const { postId } = req.body;
//   const userId = req.user.id;
//   const session = await mongoose.startSession();
//   try {
//     await session.startTransaction();
//     if (!postId) {
//       return res.status(400).json({ message: "poost id is required" });
//     }
//     const post = await Post.findById(postId).session(session);
//     if (!post) {
//       await session.abortTransaction();
//       return res.status(404).json({ message: "can't find post" });
//     }

//     if (post.likeCounter < 500) {
//       const existingLike = await Like.findOne({ postId, userId }).session(
//         session
//       );
//       if (existingLike) {
//         await Like.deleteOne({ postId, userId }).session(session);
//         post.likeCounter -= 1;
//         await post.save({ session });
//         await session.commitTransaction();
//         return res.status(400).json({ message: "Post unliked" });
//       }

//       const newlike = new Like({
//         postId,
//         userId,
//       });
//       await newlike.save({ session });
//       post.likeCounter += 1;
//       await post.save({ session });
//       await session.commitTransaction();
//       res.status(200).json({ message: "liked the post" });
//     } else {
//       const dooutlierExisits = await LikeOutlier.find({ postId }).sort({
//         createdAt: -1,
//       });
//       if (!dooutlierExisits || dooutlierExisits.length == 0) {
//         const newOutlier = new LikeOutlier({
//           postId,
//           bucket_no: 1,
//           likes: [
//             {
//               userId,
//               createdAt: Date.now,
//             },
//           ],
//         });
//         await newOutlier.save({ session });
//         post.likeCounter += 1;
//         await post.save({ session });
//         await session.commitTransaction();
//         res.status(200).json({ message: "liked the post" });
//       } else if (dooutlierExisits[0].likes.length <= 100) {
//         const recentOutlier = await LikeOutlier.findById(
//           dooutlierExisits[0]._id
//         );
//         recentOutlier.likes.push({ userId, createdAt: Date.now });
//         recentOutlier.save({ session });
//         post.likeCounter += 1;
//         await post.save({ session });
//         await session.commitTransaction();
//         res.status(200).json({ message: "liked the post" });
//       } else {
//         const newOutlier = new LikeOutlier({
//           postId,
//           bucket_no: 1,
//           likes: [
//             {
//               userId,
//               createdAt: Date.now,
//             },
//           ],
//         });
//         await newOutlier.save({ session });
//         post.likeCounter += 1;
//         await post.save({ session });
//         await session.commitTransaction();
//         res.status(200).json({ message: "liked the post" });
//       }
//     }
//   } catch (err) {
//     await session.abortTransaction();
//     console.log(err);
//     return res.status(500).json({ message: "Server Error " + err.message });
//   } finally {
//     session.endSession();
//   }
// };

export const likePost = async (req, res) => {
  const { postId } = req.body;
  const userId = req.user.id;
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    if (!postId) {
      return res.status(400).json({ message: "postId is required" });
    }

    const post = await Post.findById(postId).session(session);
    if (!post) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Post not found" });
    }

    // ---- CASE 1: When likeCounter is small (normal Like collection) ----
    if (post.likeCounter < 500) {
      const existingLike = await Like.findOne({ postId, userId }).session(
        session
      );

      if (existingLike) {
        // ✅ Unlike (remove existing like)
        await Like.deleteOne({ postId, userId }).session(session);
        post.likeCounter -= 1;
        await post.save({ session });
        await session.commitTransaction();
        return res.status(200).json({ message: "Post unliked" });
      }

      // ✅ Like (add new)
      const newLike = new Like({ postId, userId });
      await newLike.save({ session });
      post.likeCounter += 1;
      await post.save({ session });
      await session.commitTransaction();
      return res.status(200).json({ message: "Post liked successfully" });
    }

    // ---- CASE 2: Like outlier logic (large post) ----
    const allBuckets = await LikeOutlier.find({ postId })
      .sort({ bucket_no: 1 })
      .session(session);

    // 🔍 Check if user already liked in outlier buckets
    const bucketWithUser = allBuckets.find((bucket) =>
      bucket.likes.some((like) => like.userId.toString() === userId.toString())
    );

    if (bucketWithUser) {
      // ✅ Unlike from outlier bucket
      bucketWithUser.likes = bucketWithUser.likes.filter(
        (like) => like.userId.toString() !== userId.toString()
      );
      await bucketWithUser.save({ session });

      post.likeCounter -= 1;
      await post.save({ session });
      await session.commitTransaction();
      return res.status(200).json({ message: "Post unliked (outlier bucket)" });
    }

    // ✅ Like — find available space in any existing bucket
    let availableBucket = allBuckets.find(
      (bucket) => bucket.likes.length < 100
    );

    if (availableBucket) {
      // Use available space in existing bucket
      availableBucket.likes.push({ userId, createdAt: Date.now() });
      await availableBucket.save({ session });
    } else {
      // Create a new bucket if all are full
      const lastBucketNo =
        allBuckets.length > 0 ? allBuckets[allBuckets.length - 1].bucket_no : 0;

      const newOutlier = new LikeOutlier({
        postId,
        bucket_no: lastBucketNo + 1,
        likes: [{ userId, createdAt: Date.now() }],
      });
      await newOutlier.save({ session });
    }

    post.likeCounter += 1;
    await post.save({ session });
    await session.commitTransaction();

    return res.status(200).json({ message: "Post liked (outlier bucket)" });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    return res.status(500).json({ message: "Server Error: " + err.message });
  } finally {
    session.endSession();
  }
};

export const getLikesForPost = async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // ✅ For smaller posts (less than 500 likes)
    if (post.likeCounter < 500) {
      const likes = await Like.find({ postId })
        .populate("userId", "name email")
        .select("userId createdAt")
        .sort({ createdAt: -1 });
      return res.status(200).json({ total: likes.length, likes });
    }

    // ✅ For large posts (with outlier buckets)
    const likesInPost = await Like.find({ postId })
      .populate("userId", "name email")
      .select("userId createdAt");

    const outlierBuckets = await LikeOutlier.find({ postId })
      .populate("likes.userId", "name email")
      .select("likes.userId likes.createdAt");

    // Combine all likes
    let likes = [...likesInPost];
    outlierBuckets.forEach((bucket) => {
      if (bucket.likes && bucket.likes.length > 0) {
        likes.push(...bucket.likes);
      }
    });
    likes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({ total: likes.length, likes });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error " + err.message });
  }
};

export const checkLikeStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    // ✅ Basic validation
    if (!postId) {
      return res.status(400).json({ message: "Post ID is required" });
    }

    const post = await Post.findById(postId).select("likeCounter");
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    let liked = false;

    // ✅ For smaller posts, check in Like collection
    if (post.likeCounter < 500) {
      liked = await Like.exists({ postId, userId });
    } else {
      // ✅ For large posts, check both collections
      liked =
        (await Like.exists({ postId, userId })) ||
        (await LikeOutlier.exists({ postId, "likes.userId": userId }));
    }

    return res.status(200).json({ liked: !!liked });
  } catch (err) {
    console.error("Error checking like status:", err);
    return res.status(500).json({ message: "Server Error: " + err.message });
  }
};
