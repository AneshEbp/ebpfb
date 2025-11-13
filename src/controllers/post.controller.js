import Post from "../models/post.model.js";
import { uploadToCloudinary } from "../middleware/cloudinary.js";

export const createPost = async (req, res) => {
  try {
    console.log(req.body);
    const { postDescription, visible, postType } = req.body;
    // const imageUrl = req.file.path;
    const userId = req.user.id;
    const username = req.user.username;
    const useremail = req.user.useremail;
    const imageUrl = await uploadToCloudinary(req.file.path);
    if (!postDescription || !imageUrl) {
      return res.status(400).json({ message: "all feilds are required" });
    }
    const newPost = new Post({
      userId,
      imageUrl: imageUrl,
      postDescription,
      authorDetails: {
        name: username,
        email: useremail,
      },
      visible_toWhom: visible || "public",
      postType: postType || "post",
    });
    await newPost.save();
    return res.status(201).json({ message: "Post created Successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "server error" + err.message });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { postId, postDescription, visible, postType } = req.body;
    const imageUrl = req.file?.path;
    const userId = req.user.id;
    if (!postId) {
      return res.status(400).json({ message: "post id is compuliary" });
    }
    if (!postDescription && !visible && !postType && !imageUrl) {
      return res.status(400).json({ message: "Atleast one feild required" });
    }
    const post = await Post.findById(postId);

    if (userId.toString() != post.userId.toString()) {
      return res.status.json({ message: "unauthorize to update post" });
    }

    if (imageUrl) post.imageUrl = imageUrl;
    if (postDescription) post.postDescription = postDescription;
    if (visible) post.visible_toWhom = visible;
    if (postType) post.postType = postType;
    await post.save();
    return res.status(200).json({ message: "updated successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "server error" + err.message });
  }
};

export const getPostDetails = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId, { userId: 0 });
    if (!post) {
      return res.status(404).json({ message: "can't find a post" });
    }
    return res.status(200).json({ post });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "server error" + err.message });
  }
};

export const getAllPost = async (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId) {
      return res.status(404).json({ message: "Invalid user" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const posts = await Post.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments({ userId });
    const totalPages = Math.ceil(totalPosts / limit);

    if (!posts || posts.length === 0) {
      return res.status(404).json({ message: "No posts found" });
    }

    return res.status(200).json({
      currentPage: page,
      totalPages,
      totalPosts,
      limit,
      count: posts.length,
      posts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.user.id;

    if (!postId) {
      return res.status(400).json({ message: "Post ID is required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this post" });
    }

    const result = await Post.deleteOne({ _id: postId });

    if (result.deletedCount === 0) {
      return res.status(400).json({ message: "Unable to delete post" });
    }

    return res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};
