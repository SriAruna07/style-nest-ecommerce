const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["Tops & T-Shirts", "Jeans & Trousers", "Footwear", "Bags", "Watches", "Accessories"]
    },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    sizes: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    stock: { type: Number, default: 10, min: 0 },
    featured: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
