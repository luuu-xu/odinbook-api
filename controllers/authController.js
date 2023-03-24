const User = require('../models/user');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local');

// Passport local strategy setup
passport.use(new LocalStrategy(
  function verify(username, password, done) {
    User.findOne({ username })
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
exports.user_signup = async (req, res, next) => {
  try {
    User.findOne({ username: req.body.username })
    .then(user => {
      if (user) {
        return res.status(400).json({ message: 'Username already taken' });
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

// Log in the user with passport local strategy authentication on POST
exports.user_login = [
  passport.authenticate('local', {
    failureMessage: true,
  }), 
  (req, res) => {
    res.status(200).json({ message: 'logged in' });
  },
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