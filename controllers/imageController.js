const Image = require('../models/image');

// @route   GET api/images/:imageid
// @desc    Get a single image with imageid
// @access  Public
// @param   req.params.imageid: String, required, the imageid of the image to get
// @return  { image: Image }
exports.get_a_image = async (req, res, next) => {
  await Image.findById(req.params.imageid)
    .then(image => {
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }
      res.status(200).json({ 
        image: image
      });
    })
    .catch(err => {
      res.status(502).json({
        error: err,
      });
    });
}