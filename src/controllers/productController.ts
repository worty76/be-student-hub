import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Product from '../models/Product';
import User from '../models/User';
import { cloudinary } from '../config/cloudinary';
import mongoose from 'mongoose';

// Get all products with filters
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      category, 
      minPrice, 
      maxPrice, 
      condition, 
      status,
      sort = 'createdAt', 
      order = 'desc',
      page = 1,
      limit = 10
    } = req.query;
    
    // Build filter object
    const filter: any = {};
    
    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (status) filter.status = status;
    
    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    
    // Build sort object
    const sortObj: any = {};
    sortObj[sort as string] = order === 'asc' ? 1 : -1;
    
    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Execute query
    const products = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))
      .populate('seller', 'name avatar rating');
    
    // Get total count for pagination
    const total = await Product.countDocuments(filter);
    
    res.json({
      products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get product by ID
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name avatar rating ratingCount location');
    
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    
    // Increment view count
    product.views += 1;
    await product.save();
    
    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new product
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { title, description, price, category, condition } = req.body;
    
    // Get file paths if images were uploaded
    const images = req.files ? (req.files as Express.Multer.File[]).map(
      (file: any) => file.path || file.location
    ) : [];
    
    // Create new product
    const product = new Product({
      title,
      description,
      price,
      images,
      category,
      condition,
      seller: req.user.id,
      location: req.user.location
    });
    
    await product.save();
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a product
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { title, description, price, category, condition, status } = req.body;
    
    // Find product
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    
    // Check if user owns the product
    if (product.seller.toString() !== req.user.id) {
      res.status(403).json({ message: 'Not authorized to update this product' });
      return;
    }
    
    // Update fields
    if (title) product.title = title;
    if (description) product.description = description;
    if (price) product.price = price;
    if (category) product.category = category;
    if (condition) product.condition = condition;
    if (status) product.status = status;
    
    // Add new images if uploaded
    if (req.files && (req.files as Express.Multer.File[]).length > 0) {
      const newImages = (req.files as Express.Multer.File[]).map(
        (file: any) => file.path || file.location
      );
      product.images = [...product.images, ...newImages];
    }
    
    await product.save();
    
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a product
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    
    // Check if user owns the product
    if (product.seller.toString() !== req.user.id) {
      res.status(403).json({ message: 'Not authorized to delete this product' });
      return;
    }
    
    // Delete images from Cloudinary
    for (const imageUrl of product.images) {
      if (imageUrl.includes('cloudinary')) {
        // Extract public_id from Cloudinary URL
        const publicId = imageUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`studenthub/${publicId}`);
        }
      }
    }
    
    await product.deleteOne();
    
    res.json({ message: 'Product removed' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get products by user ID
export const getProductsByUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find({ seller: req.params.userId })
      .sort({ createdAt: -1 });
    
    res.json(products);
  } catch (error) {
    console.error('Get user products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search products
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.params;
    
    const products = await Product.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .populate('seller', 'name avatar');
    
    res.json(products);
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get products by category
export const getProductsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;
    
    const products = await Product.find({ category })
      .sort({ createdAt: -1 })
      .populate('seller', 'name avatar');
    
    res.json(products);
  } catch (error) {
    console.error('Get category products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add product to favorites
export const addToFavorites = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Check if product is already in favorites
    if (user.favorites.some(favId => favId.toString() === product._id.toString())) {
      res.status(400).json({ message: 'Product already in favorites' });
      return;
    }
    
    // Add to favorites
    user.favorites.push(product._id);
    await user.save();
    
    // Increment favorites count
    product.favorites += 1;
    await product.save();
    
    res.json({ message: 'Product added to favorites' });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove product from favorites
export const removeFromFavorites = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Check if product is in favorites
    if (!user.favorites.some(favId => favId.toString() === product._id.toString())) {
      res.status(400).json({ message: 'Product not in favorites' });
      return;
    }
    
    // Remove from favorites
    user.favorites = user.favorites.filter(
      favId => favId.toString() !== product._id.toString()
    );
    await user.save();
    
    // Decrement favorites count
    product.favorites = Math.max(0, product.favorites - 1);
    await product.save();
    
    res.json({ message: 'Product removed from favorites' });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's favorite products
export const getFavoriteProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'favorites',
      populate: {
        path: 'seller',
        select: 'name avatar'
      }
    });
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.json(user.favorites);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 