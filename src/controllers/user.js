import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const hashPassword = async (password) => {
  try {
    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.SALT_ROUNDS)
    );
    return hashedPassword;
  } catch (err) {
    console.log(err);
  }
};
const comparePassword = async (password, hashedPassword) => {
  try {
    const result = await bcrypt.compare(password, hashedPassword);
    if (!result) return false;
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const register = async (req, res) => {
  const { name, email, password } = req.body;
  console.log(req.body);
  if (!name || !email || !password) {
    return res.status(400).json({ message: "all feilds are required" });
  }
  const isEmailUsed = await User.findOne({ email });
  if (isEmailUsed) {
    return res.status(400).json({ message: "email already Exicit" });
  }
  let hashedPassword;
  if (password) {
    hashedPassword = await hashPassword(password);
  }
  try {
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });
    await newUser.save();
    return res.status(201).json({ message: "user created Successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All feilds are required" });
    }
    const findUSer = await User.findOne({ email });
    if (!findUSer) {
      return res.status(404).json("Invalid Credentials ");
    }
    const passwordCompareResult = await comparePassword(
      password,
      findUSer.password
    );
    if (!passwordCompareResult)
      return res.status(400).json({ message: "invalid credentials" });

    const token = jwt.sign(
      { id: findUSer._id, username: findUSer.name, useremail: findUSer.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({ message: "logedIn Successfully", token });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "server Error" + err.message });
  }
};

export const updateDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(req.user);
    const { name, ph_no, address, education, job } = req.body;
    if (!name && !ph_no && !address && !education && !job) {
      return res
        .status(400)
        .json({ message: "Atleast ONe feild is required " });
    }
    const getUser = await User.findById(userId);

    if (!getUser) {
      return res.status(404).json({ message: "Can't find user" });
    }
    if (name) getUser.name = name;
    if (ph_no) getUser.ph_no = ph_no;
    if (address) getUser.details.address = address;
    if (education) getUser.details.education = education;
    if (job) getUser.details.job = job;

    await getUser.save();
    return res.status(200).json({ message: "user updated " });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server erro" + err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "All Feilds are required" });
    }
    const getUser = await User.findById(userId);
    if (!getUser) {
      return res.status(404).json({ message: "Can't find user" });
    }

    const validPassword = await comparePassword(oldPassword, getUser.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid Password" });
    }
    const hashedPassword = await hashPassword(newPassword);
    await User.findByIdAndUpdate(userId, {
      $set: { password: hashedPassword },
    });
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server erro" + err.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await User.findById(userId, { _id: 0, password: 0 });
    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ profile });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server erro" + err.message });
  }
};
