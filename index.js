// require('dotenv').config()

const port = 4000;
const express=require("express");
const app=express();
const mongoose=require("mongoose");
const jwt=require("jsonwebtoken");
const multer=require("multer");
const path=require("path");
// using this  path  we can get the  our backend directory path
const cors=require("cors");
app.use(express.json());
app.use(cors());
// ==============================================
/*
const port = 4000;: This defines the port on which your server will listen for incoming requests.

const express = require("express");: Imports the Express framework, which simplifies the process of building web servers in Node.js.

const app = express();: Creates an instance of the Express application.

const mongoose = require("mongoose");: Imports Mongoose, which is an ODM (Object Data Modeling) library for MongoDB and Node.js, allowing you to define schemas and interact with your MongoDB database easily.

const jwt = require("jsonwebtoken");: Imports the jsonwebtoken library, which is used for creating and verifying JSON Web Tokens (JWTs). This is often used for authentication.

const multer = require("multer");: Imports multer, a middleware for handling multipart/form-data, which is primarily used for file uploads.

const path = require("path");: Imports the path module, which provides utilities for working with file and directory paths.

const cors = require("cors");: Imports the CORS (Cross-Origin Resource Sharing) middleware, allowing your server to handle requests from different origins.

app.use(express.json());: This middleware parses incoming JSON requests and makes the parsed data available under req.body. It's crucial for APIs that expect JSON data.

app.use(cors());: This enables CORS, allowing your server to accept requests from different domains. This is important for client-side applications hosted on different servers.

*/



// ============================================
// Connecting the database  with the database

mongoose.connect("mongodb+srv://STRIKER:Ecommerce%4025@cluster0.q0kgo.mongodb.net/E-commerce")


/*


This line connects your application to a MongoDB database. 
The connection string contains the username, password, and database name.
It's essential to establish this connection before interacting with the database.
 If this fails, any subsequent database operations will not work.


*/


// ================================================================
// creating API
app.get("/",(req,res)=>{
    res.send("Express  App Is Running");

})


// image  storage Engine  we use molter

const  storage=multer.diskStorage({
    destination:'./upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.originalname }_${Date.now()}${path.extname(file.originalname)}`)
    }
})

/*

multer.diskStorage: Configures storage settings for Multer.
destination: Specifies the directory where uploaded files will be stored.
filename: Defines how the uploaded files will be named. 
In this case, it concatenates the original filename with the current timestamp and its extension to ensure uniqueness.
*/

const upload=multer({storage:storage});
app.use('/images',express.static('upload/images'));


// creating  Upload Endpoint  for Image;


/*

const upload = multer({ storage: storage });
: Creates a Multer instance with the specified storage configuration.

app.use('/images', express.static('upload/images'));
: Sets up a static file server to serve images from the upload/images directory.
 This means that when a file is uploaded, it can be accessed via a URL.
*/




app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })

})
// ========================
/*

app.post("/upload", upload.single('product'), ...);
: This route listens for POST requests at /upload and uses the upload.single('product') 
middleware to handle file uploads. 
The 'product' here refers to the name of the file input field in the form that will
 be sending the file.

Inside the callback: If the upload is successful,
 the server responds with a JSON object containing
  a success indicator and the URL where the uploaded image can be accessed.
*/




// ======================
//  Schema for creating  Product
const Product=mongoose.model("Product",{
    id:{
        type:Number,
        required:true,
        

    },
    name:{
        type:String,
        required:true,

    },
    image:{
        type:String,
        required:true,

    },
    category:{
        type:String,
        required:true,
        

    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    avilable:{
        type:Boolean,
        default:true,
    },

})

app.post('/addproduct',async(req,res)=>{

    // creating for automatic id to be generated in the the database

    let products=await Product.find({});
    let id;
    if(products.length>0)
    {
        let last_product_array=products.slice(-1);
        let last_product=last_product_array[0];
        id=last_product.id+1;

    }
    else{
        id=1;
    }

    const product=new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,



    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success:true,
        name:req.body.name,
})

})

// creating  Api  for deleting the product
app.post('/removeproduct',async(req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Remove");
    res.json({
        success:true,
        name:req.body.name
})
})

// creating the api  for getting  all product
app.get('/allproducts',async(req,res)=>{
    let products=await Product.find({});
    console.log("All Product Fetched");
    res.send(products);
})



// ===================================for  developing the  backend for the user login and signup(user model)

const User=mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,

    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})


// creating the end point for  registering the user

app.post('/signup',async(req,res)=>{
    let check=await User.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false,errors:"existing user found with same email address"})
    }

    let cart={};
    for(let i=0;i<300; i++){
        cart[i]=0;

    }

    const user=new User({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })

    await user.save();
    const data={
        user:{
            id:user.id
        }
    }

    const token=jwt.sign(data,'secret_ecom');
    res.json({success:true,token});
})

// creating the  endpoint for user login

app.post('/login',async(req,res)=>{
    let  user=await User.findOne({email:req.body.email});
    if(user){
        const  passCompare =req.body.password===user.password;
        if(passCompare){
            const data={
    
                    user:{
                        id:user.id
                    }
            }

            const token =jwt.sign(data,'secret_ecom');
            res.json({success:true,token});

        }
        else{
            res.json({success:false,errors:"Wrong Password"});
        }
    }
    else{
        res.json({success:false,errors:"Wrong Email ID"})
    }
})


// creating  endpoint for the new collection data   for frontended    fetching the data  from  database
app.get('/newcollections',async(req,res)=>{
    let products=await Product.find({});
    let newcollection=products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollection);
})

// creating the endpoint  for the  popular in the women categorgy

app.get('/popularinwomen',async(req,res)=>{
    let products=await Product.find({category:"women"});
    let popular_in_women=products.slice(0,4);
    console.log("popular in women fetched");
    res.send(popular_in_women);

})
//=============================================================

//creating middleware to fetch  user

// const fetchUser =async(req,res,next)=>{
//     const token=req.header('auth-token');
//     console.log("Token received:", token);
//     if(!token){
//         res.status(401).send({errors:"please authenticate using  valid token"});
//     }
//     else{
//         try{
//             const data=jwt.verify(token,'secret_ecom');
//             req.user=data.user;
//             next();
//         }
//         catch(error){

//             res.status(401).send({errors:"please authenticate using  valid token "});

//         }
//     }


// }



// ===============fetchuser===========
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    console.log("Token received:", token);

    if (!token) {
        return res.status(401).send({ errors: "please authenticate using a valid token" });
    }
    
    try {
        const data = jwt.verify(token, 'secret_ecom');
        req.user = data.user;
        next();
    } catch (error) {
        console.error("JWT Error:", error);
        return res.status(401).send({ errors: "please authenticate using a valid token" });
    }
};





// ==========================================

// creating  endpoint   for  adding the  product   in cartdata 



app.post('/addtocart',fetchUser,async(req,res)=>{




    // console.log("added",req.body.itemId);

    let userData=await  User.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] +=1;
    await User.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added");



})



// creating  endpoint  to remove the product from cartdata
app.post('/removefromcart',fetchUser,async (req,res)=>{
    console.log("removed",req.body.itemId);

    let userData=await  User.findOne({_id:req.user.id});

    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId] -=1;
    await User.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("removed");


})

// creating  endpoint   to  get  cartdata
app.post('/getcart',fetchUser,async(req,res)=>{
    // console.log("GetCart");
    let userData= await User.findOne({_id:req.user.id});
    res.json(userData.cartData);

})



app.listen(port,(error)=>{
    if(!error){
        console.log("Server Running on the port"+port);

    }
    else
    {
        console.log("Error: "+error);
    }

})


