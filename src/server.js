import express from "express";
import cors from "cors";
import dotenv from "dotenv";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import userRoutes from "./routes/user.routes.js";
app.use("/api/auth", userRoutes);

import friendRoutes from "./routes/friend.routes.js";
app.use("/api/friend", friendRoutes);

import postRoutes from "./routes/post.routes.js";
app.use("/api/post", postRoutes);

import likeRoutes from "./routes/likes.routes.js";
app.use("/api/like", likeRoutes);

import connectdb from "./db/connectdb.js";
app.listen(3000, async () => {
  try {
    await connectdb();
    console.log("server started");
  } catch (err) {
    console.log(err);
  }
});
