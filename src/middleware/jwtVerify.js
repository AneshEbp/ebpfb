import jwt from "jsonwebtoken";

const jwtVerify = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // now accessible as req.user.id
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

export default jwtVerify;
