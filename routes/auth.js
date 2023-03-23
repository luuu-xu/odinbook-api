const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcryptjs');
const User = require('../models/user');

const router = express.Router();

// POST signup route for local username and password authentication
router.post('/signup', async (req, res, next) => {
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
});

// GET login route for authentication
router.get('/login', (req, res) => {
  res.send('login form');
});

// POST login route for local username and password authentication
router.post('/login/password', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/auth/login',
}));

// POST logout route for local username and password authentication
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

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
      id: user._id,
      username: user.username,
    });
  });
});

passport.deserializeUser((user, done) => {
  process.nextTick(() => {
    done(null, user);
  });
});

module.exports = router;