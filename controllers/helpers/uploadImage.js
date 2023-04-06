const multer = require('multer');

// Set up multer for image upload.
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 16 * 1024 * 1024, // Maximum file size: 16 MB.
  },
  fileFilter (req, file, cb) {
    // Only allow jpeg/jpg files.
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
      console.log('multer ran once');
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
}).single('image');

module.exports = uploadImage;