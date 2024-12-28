const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id }, "motuchotugoonchu_$$##*%#%", { expiresIn: "1d" });
};

module.exports = { generateToken };
