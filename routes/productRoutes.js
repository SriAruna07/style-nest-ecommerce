const express = require("express");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.query.category && req.query.category !== "All") query.category = req.query.category;
    if (req.query.featured === "true") query.featured = true;
    if (req.query.search) query.name = { $regex: req.query.search, $options: "i" };

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Could not load products.", error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json(product);
  } catch {
    res.status(400).json({ message: "Invalid product id." });
  }
});

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: "Could not create product.", error: error.message });
  }
});

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: "Could not update product.", error: error.message });
  }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json({ message: "Product deleted." });
  } catch {
    res.status(400).json({ message: "Could not delete product." });
  }
});

module.exports = router;
