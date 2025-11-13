import mongoose, { mongo } from "mongoose";

const likesOutlierSchema = mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.ObjectId,
      ref: "Post",
      required: true,
    },
    bucket_no: {
      type: Number,
    },
    likes: [
      {
        userId: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
        },
      },
    ],
  },
  { timeStamps: true }
);
likesOutlierSchema.index({ postId: 1, "likes.userId": 1 });
const LikeOutlier = mongoose.model("LikeOutlier", likesOutlierSchema);
export default LikeOutlier;
