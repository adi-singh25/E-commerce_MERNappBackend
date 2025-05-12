const port = process.env.PORT || 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

// ✅ CORS Configuration
const allowedOrigins = [
    "https://e-commerce-mernappfrontend.onrender.com",
    "https://e-commerce-application-1-4ktx.onrender.com"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());
app.use('/images', express.static('upload/images'));

// ✅ Connect to MongoDB
mongoose.connect("mongodb+srv://STRIKER:Ecommerce%4025@cluster0.q0kgo.mongodb.net/E-commerce");

// ✅ Multer Setup
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        cb(null, `${file.originalname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// ✅ Basic Route
app.get("/", (req, res) => {
    res.send("Express App is Running");
});

// ✅ HTTPS Image Upload Endpoint
app.post("/upload", upload.single('product'), (req, res) => {
    const baseUrl = "https://e-commerce-mernappbackend-1.onrender.com";
    res.json({
        success: 1,
        image_url: `${baseUrl}/images/${req.file.filename}`
    });
});

// ✅ Product Schema
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

// ✅ Add Product
app.post('/addproduct', async (req, res) => {
    const products = await Product.find({});
    const id = products.length > 0 ? products[products.length - 1].id + 1 : 1;

    const product = new Product({ id, ...req.body });
    await product.save();

    res.json({ success: true, name: req.body.name });
});

// ✅ Remove Product
app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    res.json({ success: true, name: req.body.name });
});

// ✅ Get All Products
app.get('/allproducts', async (req, res) => {
    const products = await Product.find({});
    res.send(products);
});

// ✅ User Schema
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

// ✅ Auth Middleware
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

// ✅ Cart APIs
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

// ✅ New Collections & Popular
app.get('/newcollections', async (req, res) => {
    const products = await Product.find({});
    const newcollection = products.slice(-8);
    res.send(newcollection);
});

app.get('/popularinwomen', async (req, res) => {
    const products = await Product.find({ category: "women" });
    res.send(products.slice(0, 4));
});

// ✅ Order Schema
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

// ✅ Place Order
app.post("/placeorder", async (req, res) => {
    const order = new Order(req.body);
    try {
        await order.save();
        res.json({ success: true, message: "Order placed successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to place order." });
    }
});

// ✅ Get All Orders
app.get("/orders", async (req, res) => {
    try {
        const orders = await Order.find().sort({ timestamp: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// ✅ 404 Handler
app.use((req, res) => {
    res.header("Access-Control-Allow-Origin", "https://e-commerce-application-1-4ktx.onrender.com");
    res.status(404).send("Not Found");
});

// ✅ Start Server
app.listen(port, (error) => {
    if (!error) console.log("Server running on port " + port);
    else console.log("Error: " + error);
});
