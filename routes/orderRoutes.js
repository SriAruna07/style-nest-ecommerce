const express = require("express");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty." });
    }

    const ids = items.map(item => item.product);
    const products = await Product.find({ _id: { $in: ids } });

    const productMap = new Map(products.map(p => [String(p._id), p]));
    const cleanItems = [];
    let total = 0;

    for (const item of items) {
      const product = productMap.get(String(item.product));
      const quantity = Math.max(1, Number(item.quantity) || 1);

      if (!product) return res.status(400).json({ message: "A product in your cart no longer exists." });
      if (product.stock < quantity) {
        return res.status(400).json({ message: `${product.name} has only ${product.stock} left.` });
      }

      const line = product.price * quantity;
      total += line;

      cleanItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity,
        size: item.size || product.sizes[0] || "Standard",
        color: item.color || product.colors[0] || "Default",
        image: product.image
      });
    }

    const order = await Order.create({
      user: req.user._id,
      items: cleanItems,
      totalAmount: total,
      shippingAddress,
      paymentMethod: paymentMethod || "Cash on Delivery"
    });

    for (const item of cleanItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: "Could not place order.", error: error.message });
  }
});

router.get("/my", protect, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

router.get("/", protect, adminOnly, async (req, res) => {
  const orders = await Order.find().populate("user", "name email").sort({ createdAt: -1 });
  res.json(orders);
});

router.put("/:id/status", protect, adminOnly, async (req, res) => {
  const allowed = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];
  if (!allowed.includes(req.body.status)) {
    return res.status(400).json({ message: "Invalid order status." });
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );

  if (!order) return res.status(404).json({ message: "Order not found." });
  res.json(order);
});

module.exports = router;
