const jwt = require("jsonwebtoken");

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, "motuchotugoonchu_$$##*%#%", { expiresIn: "3d" });
};

module.exports = { generateRefreshToken };
