import mongoose from "mongoose";

const shareSchema = mongoose.Schema(
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
shareSchema.index({ postId: 1, userId: 1 }, { unique: true });
const Share = mongoose.model("Share", shareSchema);

export default Share;
