const express = require('express');

const router = express.Router();

const auth_controller = require('../controllers/authController');

// POST signup route for local username and password authentication
router.post('/signup', auth_controller.user_signup);

// POST login route for oauth login authentication
router.post('/oauth-login', auth_controller.oauth_user_login);

// POST login route for local username and password authentication
router.post('/login', auth_controller.user_login);

// POST logout route for local username and password authentication
router.post('/logout', auth_controller.user_logout);

module.exports = router;