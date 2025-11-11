import mongoose from "mongoose";

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    ph_no: {
      type: String,
    },
    password: {
      type: String,
    },
    details: {
      address: {
        type: String,
      },
      education: { type: String },
      job: { type: String },
    },
  },
  { timestamps: true }
);

userSchema.index({ name: 1, ph_no: 1 });
const User = mongoose.model("User", userSchema);
export default User;
