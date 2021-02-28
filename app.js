require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require('mongoose-encryption');
require('mongoose-type-email');
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

const userSchema = new mongoose.Schema({
  email: {type: mongoose.SchemaTypes.Email, required: true},
  password: {type: String, required: true}
});

userSchema.plugin(encrypt, { secret: process.env.SECRET_KEY, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);

app.route("/")
  .get((req, res) => {
  res.render("home");
  })

app.route("/register")
.get((req, res) => {
  res.render("register");
})
.post((req, res) => {
  const userEmail = req.body.username;
  const userPassword = req.body.password;
  User.findOne({email: userEmail}, (err, user) => {
    if (err) return console.log(err);
    if (!user) {
      User.create({email: userEmail, password: userPassword}, (err, user) => {
        if (err) return console.log(err);
        return res.render("secrets");
      });
    } else {
      return res.send("<h1>User with email " + req.body.username +" already exist. Please login</h1>")
    }
  });
});

app.route("/login")
.get((req, res) => {
  res.render("login")
})
.post((req, res) => {
  const userEmail = req.body.username;
  const userPassword = req.body.password;
  const user = {email: userEmail, password: userPassword};
  User.findOne({email: userEmail}, (err, foundUser) => {
    if (err) return console.log(err);
    if (foundUser) {
      if (foundUser.password === userPassword) {
        return res.render("secrets");
      }
      return res.send("<h1>Wrong user name or password!</h1>")
    };
  });
});

app.route("/submit")
.get((req, res) => {
  res.render("submit")
})



let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, () => {
  console.log(`App listening at ${port}`)
});
