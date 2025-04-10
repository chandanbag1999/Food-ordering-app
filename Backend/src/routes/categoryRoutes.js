const express = require("express");
const categoryController = require("../controllers/categoryController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router({ mergeParams: true });

// Public routes
router.get("/", categoryController.getCategories);
router.get("/:categoryId", categoryController.getCategory);

// Reorder route needs to be before /:categoryId routes
router.put("/reorder", protect, authorize("restaurant_owner", "super_admin"), categoryController.reOrderCategories);

// owner routes
router.post("/", protect, authorize("restaurant_owner"), categoryController.createCategory);
router.put("/:categoryId", protect, authorize("restaurant_owner"), categoryController.updateCategory);
router.delete("/:categoryId", protect, authorize("restaurant_owner"), categoryController.deleteCategory);

module.exports = router;