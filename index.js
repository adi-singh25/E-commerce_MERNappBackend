const port = process.env.PORT || 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

// ✅ Corrected CORS setup for Render:
app.use(cors({
  origin: 'https://e-commerce-mernappfrontend.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Connect to MongoDB
mongoose.connect("mongodb+srv://STRIKER:Ecommerce%4025@cluster0.q0kgo.mongodb.net/E-commerce");

// Test endpoint
app.get("/", (req, res) => {
  res.send("Express App Is Running");
});

// Setup Multer for image uploads
const storage = multer.diskStorage({
  destination: './upload/images',
  filename: (req, file, cb) => {
    return cb(null, `${file.originalname}_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage: storage });
app.use('/images', express.static('upload/images'));

app.post("/upload", upload.single('product'), (req, res) => {
  res.json({
    success: 1,
    image_url: `https://e-commerce-mernappbackend-1.onrender.com/images/${req.file.filename}`
  });
});

// Product schema
const Product = mongoose.model("Product", {
  id: { type: Number, required: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  new_price: { type: Number, required: true },
  old_price: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  avilable: { type: Boolean, default: true }
});

app.post('/addproduct', async (req, res) => {
  let products = await Product.find({});
  let id = products.length > 0 ? products[products.length - 1].id + 1 : 1;

  const product = new Product({
    id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price
  });

  await product.save();
  res.json({ success: true, name: req.body.name });
});

app.post('/removeproduct', async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  res.json({ success: true, name: req.body.name });
});

app.get('/allproducts', async (req, res) => {
  let products = await Product.find({});
  res.send(products);
});

// User schema
const User = mongoose.model('Users', {
  name: { type: String },
  email: { type: String, unique: true },
  password: { type: String },
  cartData: { type: Object },
  date: { type: Date, default: Date.now }
});

app.post('/signup', async (req, res) => {
  let check = await User.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({ success: false, errors: "existing user found with same email address" });
  }

  let cart = {};
  for (let i = 0; i < 300; i++) cart[i] = 0;

  const user = new User({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    cartData: cart
  });

  await user.save();
  const data = { user: { id: user.id } };
  const token = jwt.sign(data, 'secret_ecom');
  res.json({ success: true, token });
});

app.post('/login', async (req, res) => {
  let user = await User.findOne({ email: req.body.email });
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = { user: { id: user.id } };
      const token = jwt.sign(data, 'secret_ecom');
      res.json({ success: true, token });
    } else {
      res.json({ success: false, errors: "Wrong Password" });
    }
  } else {
    res.json({ success: false, errors: "Wrong Email ID" });
  }
});

app.get('/newcollections', async (req, res) => {
  let products = await Product.find({});
  let newcollection = products.slice(1).slice(-8);
  res.send(newcollection);
});

app.get('/popularinwomen', async (req, res) => {
  let products = await Product.find({ category: "women" });
  let popular_in_women = products.slice(0, 4);
  res.send(popular_in_women);
});

// Middleware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) return res.status(401).send({ errors: "please authenticate using a valid token" });

  try {
    const data = jwt.verify(token, 'secret_ecom');
    req.user = data.user;
    next();
  } catch (error) {
    return res.status(401).send({ errors: "please authenticate using a valid token" });
  }
};

// Cart APIs
app.post('/addtocart', fetchUser, async (req, res) => {
  let userData = await User.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await User.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
  res.send("Added");
});

app.post('/removefromcart', fetchUser, async (req, res) => {
  let userData = await User.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0) userData.cartData[req.body.itemId] -= 1;
  await User.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
  res.send("removed");
});

app.post('/getcart', fetchUser, async (req, res) => {
  let userData = await User.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

// Order schema and routes
const Order = mongoose.model("Order", {
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  items: [{
    productId: Number,
    name: String,
    quantity: Number,
    price: Number,
    total: Number
  }],
  totalAmount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

app.post("/placeorder", async (req, res) => {
  const { customerName, customerEmail, items, totalAmount, timestamp } = req.body;
  const newOrder = new Order({ customerName, customerEmail, items, totalAmount, timestamp });

  try {
    await newOrder.save();
    res.json({ success: true, message: "Order placed successfully!" });
  } catch (err) {
    console.error("Error placing order:", err);
    res.status(500).json({ success: false, message: "Failed to place the order. Please try again." });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ timestamp: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Start server
app.listen(port, (error) => {
  if (!error) {
    console.log("Server Running on the port " + port);
  } else {
    console.log("Error: " + error);
  }
});
