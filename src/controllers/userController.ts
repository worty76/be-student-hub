import { Request, Response } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Rating from "../models/Rating";
import Product from "../models/Product";

// Generate JWT token
const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET || "your-secret-key";
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
};

// Register user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "User already exists with this email" });
      return;
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || "user", // Default to 'user' if not provided
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id.toString());

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    // Generate token
    const token = generateToken(user._id.toString());

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user profile
export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user profile
export const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, email, bio, avatar, location, role } = req.body;

    // Find user
    let user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;
    if (location !== undefined) user.location = location;

    // Only allow role updates if user is an admin
    if (role !== undefined && req.user.role === "admin") {
      user.role = role;
    }

    await user.save();

    res.json(user);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user by ID
export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Get user's product count
    const productCount = await Product.countDocuments({ seller: user._id });

    res.json({
      ...user.toObject(),
      productCount,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user ratings
export const getUserRatings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const ratings = await Rating.find({ rated: req.params.id })
      .populate("rater", "name avatar")
      .sort({ createdAt: -1 });

    res.json(ratings);
  } catch (error) {
    console.error("Get ratings error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Rate a user
export const rateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { rating, comment } = req.body;
    const raterId = req.user.id;
    const ratedId = req.params.id;

    // Can't rate yourself
    if (raterId === ratedId) {
      res.status(400).json({ message: "You cannot rate yourself" });
      return;
    }

    // Find rated user
    const ratedUser = await User.findById(ratedId);
    if (!ratedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Check if user already rated
    let userRating = await Rating.findOne({ rater: raterId, rated: ratedId });

    if (userRating) {
      // Update existing rating
      userRating.rating = rating;
      if (comment !== undefined) userRating.comment = comment;

      await userRating.save();
    } else {
      // Create new rating
      userRating = new Rating({
        rater: raterId,
        rated: ratedId,
        rating,
        comment,
      });

      await userRating.save();
    }

    // Update user's average rating
    const allRatings = await Rating.find({ rated: ratedId });
    const totalRating = allRatings.reduce((sum, item) => sum + item.rating, 0);
    const averageRating = totalRating / allRatings.length;

    // Update user
    ratedUser.rating = averageRating;
    ratedUser.ratingCount = allRatings.length;
    await ratedUser.save();

    res.status(201).json(userRating);
  } catch (error) {
    console.error("Rate user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all users (admin only)
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Get all users with admin role
    const users = await User.find({ role: "admin" }).select("-password");
    res.json(users);
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update any user by admin
export const updateUserByAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, email, role } = req.body;

    // Find user
    let user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;

    await user.save();

    res.json(user);
  } catch (error) {
    console.error("Admin update user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a user (admin only)
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    await User.findByIdAndDelete(req.params.id);

    // Additional cleanup could be added here (products, ratings, etc.)

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
