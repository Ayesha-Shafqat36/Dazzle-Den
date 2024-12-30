const Product = require("../models/productModel");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const slugify = require("slugify");
const validateMongoDbId = require("../utils/validateMongodbId");

const createProduct = asyncHandler(async (req, res) => {
  try {
    if (req.body.title) {
      req.body.slug = slugify(req.body.title);
    }
    
    // Validate quantity
    if (req.body.quantity < 0) {
      throw new Error("Product quantity cannot be negative");
    }
    
    // Set initial status based on quantity
    req.body.status = req.body.quantity > 0 ? "in_stock" : "out_of_stock";
    
    const newProduct = await Product.create(req.body);
    res.json(newProduct);
  } catch (error) {
    throw new Error(error);
  }
});


const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  
  try {
    if (req.body.title) {
      req.body.slug = slugify(req.body.title);
    }
    
    // Validate quantity if it's being updated
    if (req.body.quantity !== undefined) {
      if (req.body.quantity < 0) {
        throw new Error("Product quantity cannot be negative");
      }
      // Update status based on new quantity
      req.body.status = req.body.quantity > 0 ? "in_stock" : "out_of_stock";
    }
    
    const updateProduct = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.json(updateProduct);
  } catch (error) {
    throw new Error(error);
  }
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const deletedProduct = await Product.findByIdAndDelete(id);

    res.json(deletedProduct);
  } catch (error) {
    throw new Error(error);
  }
});

const getaProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const findProduct = await Product.findById(id).populate("color");
    res.json(findProduct);
  } catch (error) {
    throw new Error(error);
  }
});

const getAllProduct = asyncHandler(async (req, res) => {
  try {
    // Filtering
    const queryObj = { ...req.query };
    const excludeFields = ["page", "sort", "limit", "fields"];
    excludeFields.forEach((el) => delete queryObj[el]);
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    let query = Product.find(JSON.parse(queryStr));

    // Sorting

    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    // limiting the fields

    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      query = query.select("-__v");
    }

    // pagination

    const page = req.query.page;
    const limit = req.query.limit;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);
    if (req.query.page) {
      const productCount = await Product.countDocuments();
      if (skip >= productCount) throw new Error("This Page does not exists");
    }
    const product = await query;
    res.json(product);
  } catch (error) {
    throw new Error(error);
  }
  
});
const getRecommendations = asyncHandler(async (req, res) => {
  try {
    // Get the category, brand, and excludeId from query params
    const { category, brand, excludeId } = req.query;

    // Base filtering
    const queryObj = { ...req.query };
    const excludeFields = ["page", "sort", "limit", "fields", "excludeId"];
    excludeFields.forEach((el) => delete queryObj[el]);

    // Create filter object for recommendations
    const filterObj = {
      // Match the category and brand if provided
      ...(category && { category }),
      ...(brand && { brand }),
      // Exclude the current product
      ...(excludeId && { _id: { $ne: excludeId } })
    };

    // Convert query string to MongoDB format
    let queryStr = JSON.stringify(filterObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // Build the query
    let query = Product.find(JSON.parse(queryStr));

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      // Default sort by createdAt
      query = query.sort("-createdAt");
    }

    // Field limiting
    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      query = query.select("-__v");
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);

    // Check if page exists
    if (req.query.page) {
      const productCount = await Product.countDocuments(JSON.parse(queryStr));
      if (skip >= productCount) throw new Error("This Page does not exists");
    }

    // Execute query
    const recommendations = await query;

    // Send response
    res.json(recommendations);
  } catch (error) {
    throw new Error(error);
  }
});
const addToWishlist = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { prodId } = req.body;
  try {
    const user = await User.findById(_id);
    const alreadyadded = user.wishlist.find((id) => id.toString() === prodId);
    if (alreadyadded) {
      let user = await User.findByIdAndUpdate(
        _id,
        {
          $pull: { wishlist: prodId },
        },
        {
          new: true,
        }
      );
      res.json(user);
    } else {
      let user = await User.findByIdAndUpdate(
        _id,
        {
          $push: { wishlist: prodId },
        },
        {
          new: true,
        }
      );
      res.json(user);
    }
  } catch (error) {
    throw new Error(error);
  }
});

const rating = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { star, prodId, comment } = req.body;
  try {
    const product = await Product.findById(prodId);
    let alreadyRated = product.ratings.find(
      (userId) => userId.postedby.toString() === _id.toString()
    );
    if (alreadyRated) {
      const updateRating = await Product.updateOne(
        {
          ratings: { $elemMatch: alreadyRated },
        },
        {
          $set: { "ratings.$.star": star, "ratings.$.comment": comment },
        },
        {
          new: true,
        }
      );
    } else {
      const rateProduct = await Product.findByIdAndUpdate(
        prodId,
        {
          $push: {
            ratings: {
              star: star,
              comment: comment,
              postedby: _id,
            },
          },
        },
        {
          new: true,
        }
      );
    }
    const getallratings = await Product.findById(prodId);
    let totalRating = getallratings.ratings.length;
    let ratingsum = getallratings.ratings
      .map((item) => item.star)
      .reduce((prev, curr) => prev + curr, 0);
    let actualRating = Math.round(ratingsum / totalRating);
    let finalproduct = await Product.findByIdAndUpdate(
      prodId,
      {
        totalrating: actualRating,
      },
      { new: true }
    );
    res.json(finalproduct);
  } catch (error) {
    throw new Error(error);
  }
});
const getRecommendedProducts = async (req, res) => {
  try {
    const { category, brand, excludeId, tags = [], price } = req.body;

    // Validate required parameters
    if (!category || !excludeId) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: category and excludeId are required"
      });
    }

    // Build category match query
    const query = {
      _id: { $ne: excludeId }, // Exclude current product
      category: category, // Only match same category
    };

    // Find similar products
    let recommendations = await Product.find(query)
      .limit(12) // Get more initially for better filtering
      .select('title description price brand category images ratings totalrating tags color')
      .exec();

    // Calculate comprehensive similarity scores
    const scoredRecommendations = recommendations.map(product => {
      let score = 0;

      // Tag matching
      if (tags && tags.length > 0) {
        const commonTags = tags.filter(tag => product.tags.includes(tag));
        score += (commonTags.length * 0.5); // 0.5 points per matching tag
      }

      // Brand matching
      if (product.brand === brand) {
        score += 1;
      }

      // Price similarity (within 20% range)
      if (price && Math.abs(product.price - price) / price <= 0.2) {
        score += 1;
      }

      // Rating bonus
      if (product.totalrating >= 4) {
        score += 0.5;
      }

      return {
        ...product._doc,
        relevanceScore: score
      };
    });

    // Sort by relevance score and limit to top 8
    const sortedRecommendations = scoredRecommendations
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 8);

    // Return success response
    res.json({
      success: true,
      count: sortedRecommendations.length,
      data: sortedRecommendations
    });

  } catch (error) {
    // Return error response
    res.status(500).json({
      success: false,
      message: "Error getting recommendations",
      error: error.message
    });
  }
};

const checkProductStock = asyncHandler(async (req, res, next) => {
  console.log("Stock")
  try {
    const { productId, color, quantity, price } = req.body;
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      
      if (product.status === "out_of_stock") {
        throw new Error(`Product ${product.title} is out of stock`);
      }
      
      if (product.quantity < quantity) {
        throw new Error(`Only ${product.quantity} units available for ${product.title}`);
      }
    
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

const updateProductStock = async (items) => {
  console.log("st: ", items[0].productId)
  try {
    for (const item of items) {
      const product = await Product.findById(item.productId._id);
      
      // Decrease quantity
      const newQuantity = product.quantity - item.quantity;

      
      // Update product with new quantity and status
      await Product.findByIdAndUpdate(
        item.productId._id,
        {
          quantity: newQuantity,
          status: newQuantity > 0 ? "in_stock" : "out_of_stock"
        },
        { new: true }
      );
    }
  } catch (error) {
    throw new Error("Error updating product stock: " + error.message);
  }
};

module.exports = {
  createProduct,
  getaProduct,
  getAllProduct,
  updateProduct,
  deleteProduct,
  addToWishlist,
  rating,
  getRecommendedProducts,
  getRecommendations,
  checkProductStock,
  updateProductStock,
};
