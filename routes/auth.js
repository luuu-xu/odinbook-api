const express = require('express');

const router = express.Router();

const auth_controller = require('../controllers/authController');

// POST signup route for local username and password authentication
router.post('/signup', auth_controller.user_signup);

// // GET login route for authentication
// router.get('/login', (req, res) => {
//   res.send('login form');
// });

// POST login route for local username and password authentication
router.post('/login', auth_controller.user_login);

// POST logout route for local username and password authentication
router.post('/logout', auth_controller.user_logout);

module.exports = router;