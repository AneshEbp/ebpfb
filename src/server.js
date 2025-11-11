import express from "express";
import cors from "cors";
import dotenv from "dotenv";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());

import userRoutes from "./routes/user.routes.js";
app.use("/api/auth", userRoutes);

import connectdb from "./db/connectdb.js";

app.listen(3000, async () => {
  try {
    await connectdb();
    console.log("server started");
  } catch (err) {
    console.log(err);
  }
});
