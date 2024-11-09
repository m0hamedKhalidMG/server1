const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Admin = require('../models/User'); // Import the Preferences model



require("dotenv").config({ path: ".env" });

exports.register = async (req, res) => {

  try {
    let { email, password } = req.body;

    if (!email || !password )
      
      return res.status(400).json({ msg: "Not all fields have been entered." });
   

    const existingAdmin = await Admin.findOne({ email: email });
    if (existingAdmin)
      return res
        .status(400)
        .json({ msg: "An account with this email already exists." });


    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const newAdmin = new Admin({
      email,
      password: passwordHash,
    
    });
    const savedAdmin = await newAdmin.save();
    res.status(200).send({
      success: true,
      user: {
        id: savedAdmin._id,
        email: savedAdmin.email,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      result: null,
      message: err.message,
    });
  }
};

exports.login = async (req, res) => {
  try {

    const { email, password } = req.body;

    // Validate input
    if (!email || !password)
      return res.status(400).json({ msg: "Not all fields have been entered." });

    // Find the user by email
    const user = await Admin.findOne({ email });

    // Return error if user not found
    if (!user)
      return res.status(400).json({
        success: false,
        result: null,
        message: "No account with this email has been registered.",
      });

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({
        success: false,
        result: null,
        message: "Invalid credentials.",
      });

    // Assign role based on email and password
    let role;
    if (email === "admin@gmail.com" && password === "admin") {
      role = "Admin";
    } else {
      role = "user";
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // Token expiration in 24 hours
        id: user._id,
        role: role,
      },
      process.env.JWT_SECRET
    );

    // Update user's login status
    const result = await Admin.findByIdAndUpdate(
      { _id: user._id },
      { isLoggedIn: true },
      { new: true }
    ).exec();

    const response = {
      success: true,
      result: {
        token,
        role: role,
        admin: {
          id: result._id,
          name: result.email,
          isLoggedIn: result.isLoggedIn,
        },
      },
      message: `Successfully logged in as ${role.toLowerCase()}`,
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ success: false, result: null, message: err.message });
  }
};


exports.isValidToken = async (req, res, next) => {
  try {
    const token = req.header("x-auth-token");
    if (!token)
      return res.status(401).json({
        success: false,
        result: null,
        message: "No authentication token, authorization denied.",
        jwtExpired: true,
      });

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (!verified)
      return res.status(401).json({
        success: false,
        result: null,
        message: "Token verification failed, authorization denied.",
        jwtExpired: true,
      });

    let user = null;
    if (verified.role === "Admin") {
      req.role = "Admin";
      user = await Admin.findOne({ _id: verified.id });
      if (!user)
        return res.status(401).json({
          success: false,
          result: null,
          message: "Admin doesn't exist, authorization denied.",
          jwtExpired: true,
        });
    } else if (verified.role === "user") {
        user = await Admin.findOne({ _id: verified.id });
        if (!user)
        return res.status(401).json({
          success: false,
          result: null,
          message: "user doesn't exist, authorization denied.",
          jwtExpired: true,
        });
    } 
      
    if (user.isLoggedIn === false)
      return res.status(401).json({
        success: false,
        result: null,
        message: `${verified.role} is already logged out, try to login again, authorization denied.`,
        jwtExpired: true,
      });

    req.user = user; // Attach the user to the request object
    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      result: null,
      message: err.message,
      jwtExpired: true,
    });
  }
};
exports.logout = async (req, res) => {
  const result = await Admin.findOneAndUpdate(
    { _id: req.admin._id },
    { isLoggedIn: false },
    {
      new: true,
    }
  ).exec();

  res.status(200).json({ isLoggedIn: result.isLoggedIn });
};
exports.isUser = (req, res, next) => {
  console.log(req.user)
  if (req.user.role !== "User") {
    return res.status(403).json({
      success: false,
      result: null,
      message: "Access denied. Only User are allowed to access this route.",
    });
  }
  next();
};
exports.IsAdmin = (req, res, next) => {
  if (req.role !== "Admin") {
    return res.status(403).json({
      success: false,
      result: null,
      message: "Access denied. Only Admin are allowed to access this route.",
    });
  }
  next();
};
