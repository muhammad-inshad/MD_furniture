const multer = require('multer');

// Configure storage for multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads'); // Save files in the 'public/uploads' directory
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Use a timestamp + original file name
    },
});

// Set up multer for file uploads
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true); // Allow image files
        } else {
            cb(new Error('Only image files are allowed!'), false); // Reject non-image files
        }
    },
});

// Define fields for multiple file uploads
const uploadFields = upload.fields([
    { name: 'productImages', maxCount: 10 }, // Accept up to 10 files for 'productImages'
]);

const uploadArrayFields = (req, res, next) => {
    const fields = [];
    for (let i = 0; i < 10; i++) {
        fields.push({ name: `productImages${i}`, maxCount: 1 });
    }

    // Use the dynamic fields for multer
    upload.fields(fields)(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
};

module.exports = { uploadFields };