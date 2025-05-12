const port = process.env.PORT || 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

// ✅ Use CORS before any routes
app.use(cors({
    origin: "https://e-commerce-application-1-4ktx.onrender.com",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());
app.use('/images', express.static('upload/images'));

// ✅ Connect to MongoDB
mongoose.connect("mongodb+srv://STRIKER:Ecommerce%4025@cluster0.q0kgo.mongodb.net/E-commerce");

// ✅ Multer setup
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.originalname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// ✅ Basic test route
app.get("/", (req, res) => {
    res.send("Express App is Running");
});

// ✅ Image upload endpoint
app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `https://e-commerce-mernappbackend-1.onrender.com/images/${req.file.filename}`
    });
});

// ✅ Product schema
const Product = mongoose.model("Product", {
    id: Number,
    name: String,
    image: String,
    category: String,
    new_price: Number,
    old_price: Number,
    date: { type: Date, default: Date.now },
    avilable: { type: Boolean, default: true }
});

// ✅ Add product
app.post('/addproduct', async (req, res) => {
    const products = await Product.find({});
    const id = products.length > 0 ? products[products.length - 1].id + 1 : 1;

    const product = new Product({ id, ...req.body });
    await product.save();

    res.json({ success: true, name: req.body.name });
});

// ✅ Remove product
app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    res.json({ success: true, name: req.body.name });
});

// ✅ Get all products
app.get('/allproducts', async (req, res) => {
    const products = await Product.find({});
    res.send(products);
});

// ✅ User schema
const User = mongoose.model("Users", {
    name: String,
    email: { type: String, unique: true },
    password: String,
    cartData: Object,
    date: { type: Date, default: Date.now }
});

// ✅ Signup
app.post('/signup', async (req, res) => {
    const check = await User.findOne({ email: req.body.email });
    if (check) {
        return res.status(400).json({ success: false, errors: "Email already in use" });
    }

    const cart = {};
    for (let i = 0; i < 300; i++) cart[i] = 0;

    const user = new User({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart
    });

    await user.save();

    const token = jwt.sign({ user: { id: user.id } }, "secret_ecom");
    res.json({ success: true, token });
});

// ✅ Login
app.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user && req.body.password === user.password) {
        const token = jwt.sign({ user: { id: user.id } }, "secret_ecom");
        res.json({ success: true, token });
    } else {
        res.json({ success: false, errors: "Invalid email or password" });
    }
});

// ✅ Fetch user middleware
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) return res.status(401).send({ errors: "Please authenticate using a valid token" });

    try {
        const data = jwt.verify(token, 'secret_ecom');
        req.user = data.user;
        next();
    } catch {
        return res.status(401).send({ errors: "Invalid token" });
    }
};

// ✅ Cart endpoints
app.post('/addtocart', fetchUser, async (req, res) => {
    const userData = await User.findOne({ _id: req.user.id });
    userData.cartData[req.body.itemId] += 1;
    await User.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Added");
});

app.post('/removefromcart', fetchUser, async (req, res) => {
    const userData = await User.findOne({ _id: req.user.id });
    if (userData.cartData[req.body.itemId] > 0)
        userData.cartData[req.body.itemId] -= 1;

    await User.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("removed");
});

app.post('/getcart', fetchUser, async (req, res) => {
    const userData = await User.findOne({ _id: req.user.id });
    res.json(userData.cartData);
});

// ✅ New collections and popular
app.get('/newcollections', async (req, res) => {
    const products = await Product.find({});
    const newcollection = products.slice(-8);
    res.send(newcollection);
});

app.get('/popularinwomen', async (req, res) => {
    const products = await Product.find({ category: "women" });
    res.send(products.slice(0, 4));
});

// ✅ Order schema
const Order = mongoose.model("Order", {
    customerName: String,
    customerEmail: String,
    items: [{
        productId: Number,
        name: String,
        quantity: Number,
        price: Number,
        total: Number,
    }],
    totalAmount: Number,
    timestamp: { type: Date, default: Date.now }
});

// ✅ Place order
app.post("/placeorder", async (req, res) => {
    const order = new Order(req.body);
    try {
        await order.save();
        res.json({ success: true, message: "Order placed successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to place order." });
    }
});

// ✅ Get all orders
app.get("/orders", async (req, res) => {
    try {
        const orders = await Order.find().sort({ timestamp: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// ✅ Handle unmatched routes with CORS
app.use((req, res) => {
    res.header("Access-Control-Allow-Origin", "https://e-commerce-application-1-4ktx.onrender.com");
    res.status(404).send("Not Found");
});

// ✅ Start server
app.listen(port, (error) => {
    if (!error) console.log("Server running on port " + port);
    else console.log("Error: " + error);
});
