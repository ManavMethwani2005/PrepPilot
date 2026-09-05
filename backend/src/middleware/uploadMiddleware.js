const multer = require('multer');

// Store files strictly in-memory as Buffers (never persisted to disk)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = file.originalname && file.originalname.toLowerCase().endsWith('.pdf');

  if (isPdfMime || isPdfExt) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF documents (.pdf) are supported.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max limit
    files: 1,
  },
  fileFilter,
});

/**
 * Middleware wrapper to handle Multer errors cleanly as 400 Bad Request
 */
const handlePdfUpload = (req, res, next) => {
  const singleUpload = upload.single('syllabusPdf');

  singleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'PDF file is too large. Maximum allowed size is 5MB.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `File upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Error processing uploaded file.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select a syllabus PDF file to upload.',
      });
    }

    next();
  });
};

module.exports = { handlePdfUpload };
