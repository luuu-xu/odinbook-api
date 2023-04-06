const User = require('../models/user');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const JwtStrategy = require('passport-jwt').Strategy,
      ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const { validationResult, body } = require('express-validator');

// Passport local strategy setup
passport.use(new LocalStrategy(
  function verify(username, password, done) {
    User.findOne({ 'username': username })
      .then(user => {
        if (!user) {
          return done(null, false, { message: 'Incorrect username' });
        }
        bcrypt.compare(password, user.password, (err, res) => {
          if (res) {
            return done(null, user);
          } else {
            return done(null, false, { message: 'Incorrect password' });
          }
        });
      })
      .catch(err => done(err));
  }
));

// Passport JWT strategy setup
const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

// Passport JWT strategy setup
passport.use(new JwtStrategy(opts, async function(jwt_payload, done) {
  // console.log('jwt_payload', jwt_payload);
  await User.findById(jwt_payload._id)
    .then(user => {
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    })
    .catch(err => done(err, false));
}));

passport.serializeUser((user, done) => {
  process.nextTick(() => {
    done(null, {
      _id: user._id,
      username: user.username,
    });
  });
});

passport.deserializeUser((user, done) => {
  process.nextTick(() => {
    done(null, user);
  });
});

// Create a new user in the database on POST
// @route   POST api/auth/signup
// @desc    Post a new user to the database
// @access  Private
// @param   req.body.username: String, required, the username of the user
//          req.body.password: String, required, the password of the user
//          req.body.name: String, required, the name of the user
// @return  { user: User }
exports.user_signup = [
  // Validate and sanitize the sign up data
  body('name', 'Name is required')
    .trim().isLength({ min: 1 }).escape(),
  body('username', 'Username is required')
    .trim().isLength({ min: 1 }).escape(),
  body('password', 'Password is required at least 6 characters')
    .trim().isLength({ min: 6 }).escape(),

  async (req, res, next) => {
    // Process the validation errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
        input: req.body
      });
    }

    try {
      User.findOne({ username: req.body.username })
      .then(user => {
        if (user) {
          // return res.status(400).json({ message: 'Username already taken' });
          return res.status(400).json({
            errors: [{ 
              location: 'body',
              param: 'username',
              value: req.body.username,
              msg: 'Username already taken' }],
            input: req.body
          });
        }
        bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
          if (err) {
            return next(err);
          }
          try {
            const user = new User({
              name: req.body.name,
              username: req.body.username,
              password: hashedPassword,
            });
            const result = await user.save();
            res.status(201).json(result); 
          } catch(err) {
            return next(err);
          }
        });
      })
      .catch(err => next(err));
    } catch(err) {
      return next(err);
    };
  }
];

// Login a new user in the database from OAuth provider on POST
// @route   POST api/auth/facebook-login
// @desc    Post a new user from OAuth provider
// @access  Private
// @param   req.body.username: String, required, the username of the user
//          req.body.name: String, required, the name of the user
//          req.body.profile_pic_url: String, required, the profile pic url of the user
// @return  { user: User }
exports.facebook_login = [
  async (req, res, next) => {
    try {
      User.findOne({ username: req.body.username })
      .then(user => {
        if (user) {
          const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
          return res.status(200).json({
            message: 'logged in',
            user: user,
            token
          });
        }
        try {
          const user = new User({
            name: req.body.name,
            username: req.body.username,
            profile_pic_url: req.body.profile_pic_url,
          });
          user.save();
          // res.status(201).json(result); 
          const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
          return res.status(200).json({
            message: 'logged in',
            user: user,
            token
          });
        } catch(err) {
          return next(err);
        }
      })
      .catch(err => next(err));
    } catch(err) {
      return next(err);
    };
  } 
];

// Login a visitor in the database on POST
// @route   POST api/auth/visitor-login
// @desc    Post a new user as visitor and delete the user later
// @access  Private
// @param   
// @return  { user: User }
exports.visitor_login = [
  async (req, res, next) => {
    // Create a visitorString in the format of visitor-<randomNumber>
    const randomNumber = Math.floor(Math.random() * (1000 - 0 + 1) + 0);
    const visitorString = 'visitor-' + randomNumber;
    bcrypt.hash(visitorString, 10, async (err, hashedPassword) => {
      if (err) {
        return next(err);
      }
      try {
        const user = new User({
          name: visitorString,
          username: visitorString,
          password: hashedPassword,
        });
        await user.save();

        // Add admin as the friend of the visitor
        try {
          const admin = await User.findOne({ username: 'admin' });
          admin.friends.push(user._id);
          user.friends.push(admin._id);
          await user.save();
          await admin.save();
        } catch (err) {
          console.log(err);
          return next(err);
        }

        // Sign JWT back to the user
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
        return res.status(200).json({
          message: 'logged in',
          user: user,
          token
        });
      } catch(err) {
        return next(err);
      }
    });
  }
];

// Log in the user with passport local strategy authentication on POST
exports.user_login = [
  passport.authenticate('local', {
    failureMessage: true,
  }),
  (req, res) => {
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET);
    res.status(200).json({
      message: 'logged in',
      user: req.user,
      token
    });
  }
];

// Log out the user with passport local strategy authentication on POST
exports.user_logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.status(200).json({ message: 'logged out' });
  });
}