import mongoose from "mongoose";

const likeSchema = mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.ObjectId,
      ref: "Post",
    },
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);
likeSchema.index({ postId: 1, userId: 1 }, { unique: true });
const Like = mongoose.model("Like", likeSchema);

export default Like;
