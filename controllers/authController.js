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

// Log in the user with passport local strategy authentication on POST
exports.user_login = [
  // passport.authenticate('local', {
  //   failureMessage: true,
  //   // failureRedirect: '/api/auth/login',
  // }), 
  // (req, res) => {
  //   res.status(200).json({ 
  //     message: 'logged in', 
  //     user: req.user 
  //   });
  // },
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