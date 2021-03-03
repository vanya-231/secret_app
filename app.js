require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

//serialize and deserialize of model for passport session support
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then(user => {
    done(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  (accessToken, refreshToken, profile, cb) => {
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  (accessToken, refreshToken, profile, cb) => {
    User.findOrCreate({
       facebookId: profile.id
     }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.route("/")
  .get((req, res) => {
    res.render("home");
  })

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/auth/facebook",
  passport.authenticate("facebook"));

app.get("/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  });

app.route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    const userName = req.body.username;
    const userPassword = req.body.password;
    User.register({
      username: userName
    }, userPassword, (err, user) => {
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

app.get("/secrets", (req, res) => {
    User.find({secret : {$ne: null}}, (err, foundUsers) => {
      if (err) {
        console.log(err);
      } else {
        if (foundUsers) {
          res.render("secrets", {userWithSecrets: foundUsers});
        }
      }
    })
});

app.route("/logout")
  .get((req, res) => {
    req.logout();
    res.redirect("/");
  })

app.route("/submit")
  .get((req, res) => {
    if (req.isAuthenticated()) {
      return res.render("submit");
    }
    return res.redirect("/login");
  })
  .post((req, res) => {
    const userSecret = req.body.secret;
    User.findById(req.user.id, (err, foundUser) => {
      if (err) console.log(err);
      if (foundUser) {
        foundUser.secret = userSecret;
        foundUser.save(() => {
          res.redirect("/secrets");
        });
      }
    });
    });

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, () => {
  console.log(`App listening at ${port}`)
});
