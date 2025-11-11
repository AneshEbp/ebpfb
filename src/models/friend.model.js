import mongoose from "mongoose";

const friendSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    require: true,
  },
  friendId: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    require: true,
  },
  status: {
    type: String,
    enum: ["requested", "accepted"],
    default: "requested",
  },
});
friendSchema.index({ userId: 1, friendId: 1 }, { unique: true });

const Friend = mongoose.model("Friend", friendSchema);
export default Friend;
