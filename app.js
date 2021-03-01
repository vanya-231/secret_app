require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true});

const userSchema = new mongoose.Schema({
  username: {type: String},
  password: {type: String}
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);


passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.route("/")
  .get((req, res) => {
  res.render("home");
  })

app.route("/register")
.get((req, res) => {
  res.render("register");
})
.post((req, res) => {
  const userName = req.body.username;
  const userPassword = req.body.password;
  User.register({username: userName}, userPassword, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets")
      })
    }
  })
});

app.route("/login")
.get((req, res) => {
  res.render("login")
})
.post((req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets")
      });
    };
  });
});

app.route("/secrets")
.get((req,res) => {
  console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    return res.render("secrets");
  }
  return res.render("login");
});

app.route("/logout")
.get((req, res) => {
  req.logout();
  res.redirect('/');
})

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
