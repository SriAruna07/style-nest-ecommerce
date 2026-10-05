const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: String,
        price: Number,
        quantity: Number,
        size: String,
        color: String,
        image: String
      }
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    shippingAddress: {
      fullName: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      pincode: String
    },
    paymentMethod: {
      type: String,
      enum: ["Cash on Delivery", "UPI Demo", "Card Demo"],
      default: "Cash on Delivery"
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
