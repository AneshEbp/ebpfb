import mongoose, { mongo } from "mongoose";

const commentOutlierSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.ObjectId,
      require: true,
    },
    bucket_no: {
      type: Number,
    },
    comments: [
      {
        userId: {
          type: mongoose.Schema.ObjectId,
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
    ],
  },
  { timeStamp: true }
);

commentOutlierSchema.index({ postId: 1, "comments.userId": 1 });
const CommentOutlier = mongoose.model("CommentOutlier", commentOutlierSchema);
export default CommentOutlier;
