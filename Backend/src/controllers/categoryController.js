const Category = require('../models/CategoryModel');
const Restaurant = require('../models/RestaurantModel');

// Get all categories for a restaurant
const getCategories = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Verify restaurant exists and is active/approved
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive || !restaurant.isApproved) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found not available'
      });
    };

    // Build query
    const query = { restaurantId };

    // Filter by active status
    if (req.query.active === "true") {
      query.isActive = true;
    };

    // sorting
    let sort = {};
    if (req.query.sort) {
        const sortFields = req.query.sort.split(',');
        sortFields.forEach(field => {
            if (field.startsWith('-')) {
                sort[field.substring(1)] = -1; // descending
            }
            else {
                sort[field] = 1; // ascending
            }
        });
    } else {
        sort = { displayOrder: 1, name: 1 }; // default sorting by createdAt descending
    };

    // execute query
    const categories = await Category.find(query).sort(sort);

    return res.status(200).json({
      success: true,
      message: 'Categories fetched successfully',
      data: categories
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get a single category
const getCategory = async (req, res) => {
    try {
        const { restaurantId, categoryId } = req.params;

        const category = await Category.findOne({
            _id: categoryId,
            restaurantId
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        };

        return res.status(200).json({
            success: true,
            message: 'Category fetched successfully',
            data: category
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Create a new category (restaurant owner)
const createCategory = async (req, res) => {
  try {
    const { restaurantId } = req.params;
   
    // Verify restaurant exists and is active/approved
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found or not available'
      });
    };

    // Check ownership
    if (restaurant.ownerId.toString() !== req.user._id.toString() && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add categories to this restaurant'
      });
    };

    // Create new category
    const newCategory = await Category.create({
        ...req.body,
        restaurantId,
    });


    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: newCategory
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update a category (restaurant owner)
const updateCategory = async (req, res) => {
  try {
    const { restaurantId, categoryId } = req.params;

    // Check if category exists
    let category = await Category.findOne({
        _id: categoryId,
        restaurantId
    });
      
    if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
    }
      
    // Check ownership
    const restaurant = await Restaurant.findById(restaurantId);
    if (restaurant.ownerId.toString() !== req.user._id.toString() && 
        req.user.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to update categories for this restaurant'
        });
    };
      
    // Update category
    category = await Category.findByIdAndUpdate(
        categoryId,
        { ...req.body, updatedAt: Date.now() },
        { new: true, runValidators: true }
    );
      
    return res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: category
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete Category (restaurant owner)
const deleteCategory = async (req, res) => {
    try {
        const { restaurantId, categoryId } = req.params;

        // Check if category exists and delete in one operation
        const category = await Category.findOneAndDelete({
            _id: categoryId,
            restaurantId
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        // Check ownership
        const restaurant = await Restaurant.findById(restaurantId);
        if (restaurant.ownerId.toString() !== req.user._id.toString() && req.user.role !== "super_admin") {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete categories for this restaurant"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Category deleted successfully",
            data: {}
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error deleting category',
            error: error.message
        }); 
    }
};

//  Update category display order( Restaurant owner)
const reOrderCategories = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { categories } = req.body;

        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of categories with displayOrder'
            });
        }

        // Check ownership
        const restaurant = await Restaurant.findById(restaurantId);
        if(!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });  
        }

        if (restaurant.ownerId.toString() !== req.user._id.toString() && 
            req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update categories for this restaurant'
            });
        }

        // Process updates
        const updatePromises = categories.map(async (item) => {
            if (!item.categoryId || typeof item.displayOrder !== "number") {
                return null;
            }

            // Verify the category belongs to this restaurant
            const category = await Category.findOne({
                _id: item.categoryId,
                restaurantId
            });

            if (!category) return null;

            // Update the display order
            return Category.findByIdAndUpdate(
                item.categoryId,
                { displayOrder: item.displayOrder, updatedAt: Date.now() },
                { new: true }
            );
        });

        const updatedCategories = await Promise.all(updatePromises);
        const validUpdates = updatedCategories.filter(item => item !== null);

        if (validUpdates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid categories were found to update'
            });
        }

        return res.status(200).json({
            success: true,
            message: `${validUpdates.length} categories reordered successfully`,
            data: validUpdates
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error reordering categories',
            error: error.message
        });
    }
};

module.exports = {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    reOrderCategories
};