import mongoose from "mongoose";

const commentSchema = mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.ObjectId,
      ref: "Post",
    },
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    userDetails: {
      name: { type: String },
      email: { type: String },
    },
    content: { type: String, required: true },
    parent_commentId: {
      type: mongoose.Schema.ObjectId,
      ref: "Comment",
    },
    repliesCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
