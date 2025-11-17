import mongoose, { mongo } from "mongoose";

const postSchema = mongoose.Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    imageUrl: [String],
    postDescription: { type: String },
    authorDetails: {
      name: { type: String },
      email: { type: String },
    },
    visible_toWhom: {
      type: String,
      enum: ["public", "private", "onlyFriends"],
      default: "public",
    },
    likeCounter: {
      type: Number,
      default: 0,
    },
    // haslikeOutlier: {
    //   type: Boolean,
    //   default: false,
    // },
    shareCounter: {
      type: Number,
      default: 0,
    },
    recentComment: [
      {
        commentId: { type: mongoose.Schema.ObjectId, ref: "Comment" },
        userId: { type: mongoose.Schema.ObjectId, ref: "User" },
        content: { type: String },
        userDetails: {
          name: { type: String },
          email: { type: String },
        },
      },
    ],
    commentCounter: {
      type: Number,
      default: 0,
    },
    // hasCommentOutlier: { type: Boolean, default: false },
    postType: {
      type: String,
      enum: ["post", "story"],
      default: "post",
    },
  },
  { timestamps: true }
);
postSchema.index({ userId: 1 });

const Post = mongoose.model("Post", postSchema);

export default Post;
