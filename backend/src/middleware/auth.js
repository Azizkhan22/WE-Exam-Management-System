const jwt = require('jsonwebtoken');

const authMiddleware =
  (allowedRoles = []) =>
    (req, res, next) => {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.substring(7) : null;

      if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (
          Array.isArray(allowedRoles) &&
          allowedRoles.length > 0 &&
          !allowedRoles.includes(decoded.role)
        ) {
          return res.status(403).json({ message: 'Insufficient permissions' });
        }
        req.user = decoded;
        return next();
      } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
    };

module.exports = {
  authMiddleware,
};

