const express = require('express');
const router = express.Router();

const image_controller = require('../controllers/imageController');

// GET a image by imageid
router.get('/:imageid', image_controller.get_a_image);

module.exports = router;