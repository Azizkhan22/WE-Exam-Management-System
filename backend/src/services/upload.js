const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // Temporary folder for uploaded CSV
module.exports = upload;
