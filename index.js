
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import cors from 'cors';
import path from 'path';

import pkg from 'multer-storage-cloudinary';
const { CloudinaryStorage } = pkg;

const port = process.env.PORT || 4000;

const app = express();
app.use(express.json());

app.use(cors({
  origin: [
    "https://e-commerce-mernappfrontend1.onrender.com",
    "https://e-commerce-application-adminpanel.onrender.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));



// ------------ DB connect ------------
mongoose
  .connect("mongodb+srv://STRIKER:Ecommerce%4025@cluster0.q0kgo.mongodb.net/E-commerce")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connect error:", err));

 cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------------- MULTER + CLOUDINARY STORAGE ----------------
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "ecommerce_products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({ storage });

// ---------------- UPLOAD ROUTE ----------------
app.post("/upload", upload.single("product"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: 0, message: "No file uploaded" });
    }

    return res.json({
      success: 1,
      image_url: req.file.path, // Cloudinary HTTPS URL
    });
    // ddjss

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.status(500).json({ success: 0, error: "Upload failed" });
  }
});
// ------------ Models ------------
const Product = mongoose.model("Product", {
  id: Number,
  name: String,
  image: String,
  category: String,
  new_price: Number,
  old_price: Number,
  date: { type: Date, default: Date.now },
  avilable: { type: Boolean, default: true },
});

// IMPORTANT: cartData as Map of Numbers to Numbers
const User = mongoose.model("Users", {
  name: String,
  email: { type: String, unique: true },
  password: String,
  cartData: {
    type: Map,
    of: Number,
    default: {},
  },
  date: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", {
  customerName: String,
  customerEmail: String,
  items: [
    {
      productId: Number,
      name: String,
      quantity: Number,
      price: Number,
      total: Number,
    },
  ],
  totalAmount: Number,
  timestamp: { type: Date, default: Date.now },
});

// ------------ Helpers ------------
const signToken = (userId) => jwt.sign({ user: { id: userId } }, "secret_ecom");

const extractUserId = (req) => {
  if (req.body && req.body.userId) return req.body.userId;

  const header = req.headers["auth-token"];
  if (!header) return null;

  if (typeof header === "string" && /^[0-9a-fA-F]{24}$/.test(header)) return header;

  try {
    const data = jwt.verify(header, "secret_ecom");
    if (data && data.user && data.user.id) return data.user.id;
  } catch (err) {}

  return null;
};

// ------------ Routes ------------
app.get("/", (req, res) => res.send("Express App Is Running"));

// app.post("/upload", upload.single("product"), (req, res) => {
//   if (!req.file) return res.status(400).json({ success: 0, message: "No file uploaded" });
//   res.json({
//     success: 1,
//     image_url: `http://localhost:${port}/images/${req.file.filename}`,
//   });
// });

app.post("/upload", upload.single("product"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: 0, message: "No file uploaded" });

  const fullUrl = req.protocol + "://" + req.get("host");

  res.json({
    success: 1,
    image_url: `${fullUrl}/images/${req.file.filename}`,
  });
});



app.post("/addproduct", async (req, res) => {
  try {
    const products = await Product.find({});
    const id = products.length > 0 ? products[products.length - 1].id + 1 : 1;

    const product = new Product({
      id,
      name: req.body.name,
      image: req.body.image,
      category: req.body.category,
      new_price: req.body.new_price,
      old_price: req.body.old_price,
    });

    await product.save();
    res.json({ success: true, name: req.body.name });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/removeproduct", async (req, res) => {
  try {
    await Product.findOneAndDelete({ id: req.body.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/allproducts", async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/signup", async (req, res) => {
  try {
    const exists = await User.findOne({ email: req.body.email });
    if (exists)
      return res
        .status(400)
        .json({ success: false, errors: "existing user found with same email address" });

    const user = new User({
      name: req.body.username,
      email: req.body.email,
      password: req.body.password,
      cartData: new Map(),
    });

    await user.save();

    const token = signToken(user.id);
    res.json({ success: true, token, userId: user.id, cartData: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.json({ success: false, errors: "Wrong Email ID" });

    if (req.body.password !== user.password) return res.json({ success: false, errors: "Wrong Password" });

    const token = signToken(user.id);
    res.json({ success: true, token, userId: user.id, cartData: Object.fromEntries(user.cartData) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/addtocart", async (req, res) => {
  const productId = req.body.productId !== undefined ? req.body.productId : req.body.itemId;
  const userId = extractUserId(req);

  console.log("Add to cart payload:", { userId, productId });

  if (!userId || productId === undefined) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.cartData) user.cartData = new Map();

    const key = String(productId);
    const currentQty = user.cartData.get(key) || 0;
    user.cartData.set(key, currentQty + 1);

    await user.save();

    console.log("Updated cartData after add:", Object.fromEntries(user.cartData));
    res.json({ success: true, cartData: Object.fromEntries(user.cartData) });
  } catch (err) {
    console.error("Error in addtocart:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/removefromcart", async (req, res) => {
  const productId = req.body.productId !== undefined ? req.body.productId : req.body.itemId;
  const userId = extractUserId(req);

  console.log("Remove from cart payload:", { userId, productId });

  if (!userId || productId === undefined) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.cartData) user.cartData = new Map();

    const key = String(productId);
    const currentQty = user.cartData.get(key) || 0;

    if (currentQty > 1) {
      user.cartData.set(key, currentQty - 1);
    } else {
      user.cartData.delete(key);
    }

    await user.save();

    console.log("Updated cartData after remove:", Object.fromEntries(user.cartData));
    res.json({ success: true, cartData: Object.fromEntries(user.cartData) });
  } catch (err) {
    console.error("Error in removefromcart:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


/*
app.get("/getcart/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const productIds = user.cartData ? Array.from(user.cartData.keys()) : [];
    if (productIds.length === 0) return res.json([]);

    const products = await Product.find({
      id: { $in: productIds.map((k) => Number(k)) },
    });

    const cart = products.map((p) => ({
      product: p,
      qty: user.cartData.get(String(p.id)) || 0,
    }));

    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




*/
/*

app.get("/getcart/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const productIds = user.cartData ? Object.keys(user.cartData) : [];
    if (productIds.length === 0) return res.json([]);

    const products = await Product.find({
      id: { $in: productIds.map(Number) },
    });

    const cart = products.map((p) => ({
      product: p,
      qty: user.cartData[String(p.id)] || 0,
    }));

    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


*/
app.get("/getcart", async (req, res) => {
  try {
    const userId = req.header("auth-token");
    console.log("Fetching cart for user:", userId);

    if (!userId) {
      return res.status(400).json({ message: "No auth-token provided" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const rawCart = user.cartData || new Map();
    console.log("RAW CART FROM DB:", rawCart);

    // ✅ FIX: Convert Map → Array of [key, qty]
    const cartEntries = Array.from(rawCart.entries());

    // Extract numeric product IDs
    const productIds = cartEntries
      .filter(([id, qty]) => qty > 0)
      .map(([id]) => Number(id));

    console.log("CLEAN PRODUCT IDS:", productIds);

    if (productIds.length === 0) {
      return res.json({ cartData: {}, cartList: [] });
    }

    // Fetch corresponding products
    const products = await Product.find({ id: { $in: productIds } });

    const cartList = products.map((p) => ({
      product: p,
      qty: rawCart.get(String(p.id)) || 0,  // IMPORTANT: rawCart is Map
    }));

    res.json({
      cartData: Object.fromEntries(rawCart), // convert Map → plain object
      cartList,
    });

  } catch (err) {
    console.error("GET CART ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});





app.get("/newcollections", async (req, res) => {
  const products = await Product.find({});
  res.json(products.slice(-8));
});

app.get("/popularinwomen", async (req, res) => {
  const products = await Product.find({ category: "women" });
  res.json(products.slice(0, 4));
});

app.post("/clearcart", async (req, res) => {
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ success: false, message: "Missing userId" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.cartData = new Map();
    await user.save();

    res.json({ success: true, message: "Cart cleared", cartData: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/placeorder", async (req, res) => {
  try {
    const { customerName, customerEmail, items, totalAmount } = req.body;
    const order = new Order({ customerName, customerEmail, items, totalAmount });
    await order.save();
    res.json({ success: true, message: "Order placed successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to place the order" });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ timestamp: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ======= Start server =======
app.listen(port, () => {
  console.log("Server Running on port " + port);
});

