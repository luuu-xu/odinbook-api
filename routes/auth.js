const express = require('express');

const router = express.Router();

const auth_controller = require('../controllers/authController');

// POST signup route for local username and password authentication
router.post('/signup', auth_controller.user_signup);

// POST login route for oauth login authentication
router.post('/facebook-login', auth_controller.facebook_login);

// POST visitor login route
router.post('/visitor-login', auth_controller.visitor_login);

// POST general visitor login
router.post('/general-visitor-login', auth_controller.general_visitor_login);

// POST login route for local username and password authentication
router.post('/login', auth_controller.user_login);

// POST logout route for local username and password authentication
router.post('/logout', auth_controller.user_logout);

module.exports = router;