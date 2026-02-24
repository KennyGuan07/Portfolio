const jwt = require('jsonwebtoken');
const { User } = require('../utils/db');

const JWT_SECRET = process.env.JWT_SECRET || 'library-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

async function attachUserToRequest(decodedToken, req, res) {
    const user = await User.findById(decodedToken.id);
    if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
    };
}

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing authentication token' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        await attachUserToRequest(decoded, req, res);
        if (!req.user) {
            return; // Response already handled in attachUserToRequest
        }
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    next();
};

const generateToken = (user) => {
    return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

module.exports = {
    authMiddleware,
    authorizeRoles,
    generateToken
};
