const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Book, BorrowRecord, User } = require('../utils/db');
const { authMiddleware, authorizeRoles } = require('../middleware/auth');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const isCosmosOrderByError = (error) => error?.message?.includes('order-by item is excluded');

// GET /api/books - Retrieve/search books with pagination
router.get('/books', async (req, res) => {
    try {
        const { keyword, category, location, sortBy = 'createdAt', sortOrder = 'desc', isHighlighted, page = 1, limit = 6, ...otherFilters } = req.query;

        const query = {};
        if (keyword) {
            query.$or = [
                { title: { $regex: keyword, $options: 'i' } },
                { author: { $regex: keyword, $options: 'i' } },
                { isbn: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } }
            ];
        }
        if (category) query.category = category;
        if (location) query.location = location;
        if (isHighlighted) query.isHighlighted = isHighlighted === 'true';

        // Handle other filters like viewCount[gt] or viewCount.gt
        for (const key in otherFilters) {
            const rawValue = otherFilters[key];

            if (key.includes('[') && key.includes(']')) {
                const field = key.split('[')[0];
                const operatorMatch = key.match(/\[(.*?)\]/);
                if (operatorMatch && operatorMatch[1]) {
                    const numericValue = Number(rawValue);
                    if (!Number.isNaN(numericValue)) {
                        if (!query[field]) {
                            query[field] = {};
                        }
                        query[field][`$${operatorMatch[1]}`] = numericValue;
                    }
                }
            } else if (rawValue && typeof rawValue === 'object') {
                for (const operatorKey in rawValue) {
                    const numericValue = Number(rawValue[operatorKey]);
                    if (!Number.isNaN(numericValue)) {
                        if (!query[key]) {
                            query[key] = {};
                        }
                        query[key][`$${operatorKey}`] = numericValue;
                    }
                }
            }
        }

        const parsedLimit = Number.parseInt(limit, 10) || 6;
        const parsedPage = Number.parseInt(page, 10) || 1;
        const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        const skip = (parsedPage - 1) * parsedLimit;

        let books;
        try {
            books = await Book.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(parsedLimit);
        } catch (dbError) {
            if (isCosmosOrderByError(dbError)) {
                // Cosmos DB may exclude indexes on certain fields; fallback to in-memory sort
                const fallbackBooks = await Book.find(query);
                const sortDirection = sortOrder === 'asc' ? 1 : -1;
                const safeValue = (record) => {
                    const value = record?.[sortBy];
                    if (value === undefined || value === null) {
                        return sortDirection === 1 ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
                    }
                    return value;
                };
                fallbackBooks.sort((a, b) => {
                    const aVal = safeValue(a);
                    const bVal = safeValue(b);
                    if (aVal < bVal) return -1 * sortDirection;
                    if (aVal > bVal) return 1 * sortDirection;
                    return 0;
                });
                books = fallbackBooks.slice(skip, skip + parsedLimit);
            } else {
                throw dbError;
            }
        }

        const total = await Book.countDocuments(query);

        res.json({
            data: books,
            total,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: Math.ceil(total / parsedLimit)
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// GET /api/books/:id - Retrieve a specific book by ID
router.get('/books/:id', async (req, res) => {
    try {
        // Add validation for MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid book ID format' });
        }

        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        // Increment view count ensuring numeric precision
        const currentViews = Number(book.viewCount ?? 0);
        book.viewCount = Number.isNaN(currentViews) ? 1 : currentViews + 1;
        await book.save();

        res.json(book);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// POST /api/books - Create a new book (admin only)
router.post('/books', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    try {
        const { title, description, coverImage, author, isbn, publisher, year, category, location, isHighlighted } = req.body;

        // More robust validation
        const errors = [];
        if (!title) errors.push({ field: 'title', message: 'Title is required.'});
        if (!description) errors.push({ field: 'description', message: 'Description is required.'});
        if (!coverImage) errors.push({ field: 'coverImage', message: 'Cover Image is required.'});
        if (!author) errors.push({ field: 'author', message: 'Author is required.'});
        if (!isbn) errors.push({ field: 'isbn', message: 'ISBN is required.'});
        if (!publisher) errors.push({ field: 'publisher', message: 'Publisher is required.'});
        if (!year) errors.push({ field: 'year', message: 'Year is required.'});
        if (!category) errors.push({ field: 'category', message: 'Category is required.'});
        if (!location) errors.push({ field: 'location', message: 'Location is required.'});

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Validation Error', errors });
        }

        const newBook = new Book({
            title,
            description,
            coverImage,
            author,
            isbn,
            publisher,
            year,
            category,
            location,
            isHighlighted: isHighlighted || false
        });

        const savedBook = await newBook.save();
        res.status(201).json(savedBook);
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error for ISBN
            return res.status(400).json({ message: 'Validation Error', errors: [{ field: 'isbn', message: 'ISBN must be unique.' }] });
        }
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => ({ field: err.path, message: err.message }));
            return res.status(400).json({ message: 'Validation Error', errors: validationErrors });
        }
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// PUT /api/books/:id - Update an existing book (admin only)
router.put('/books/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    try {
        const { title, description, coverImage, author, isbn, publisher, year, category, location } = req.body;

        // Basic Validation to prevent fields from being emptied
        const errors = [];
        if (title === '') errors.push({ field: 'title', message: 'Title cannot be empty.'});
        if (description === '') errors.push({ field: 'description', message: 'Description cannot be empty.'});
        if (coverImage === '') errors.push({ field: 'coverImage', message: 'Cover Image cannot be empty.'});
        if (author === '') errors.push({ field: 'author', message: 'Author cannot be empty.'});
        if (isbn === '') errors.push({ field: 'isbn', message: 'ISBN cannot be empty.'});
        if (publisher === '') errors.push({ field: 'publisher', message: 'Publisher cannot be empty.'});
        if (year === '') errors.push({ field: 'year', message: 'Year cannot be empty.'});
        if (category === '') errors.push({ field: 'category', message: 'Category cannot be empty.'});
        if (location === '') errors.push({ field: 'location', message: 'Location cannot be empty.'});

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Validation Error', errors });
        }

        const updatedBook = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedBook) {
            return res.status(404).json({ message: 'Book not found' });
        }
        res.json(updatedBook);
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error for ISBN
            return res.status(400).json({ message: 'Validation Error', errors: [{ field: 'isbn', message: 'ISBN must be unique.' }] });
        }
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => ({ field: err.path, message: err.message }));
            return res.status(400).json({ message: 'Validation Error', errors: validationErrors });
        }
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// DELETE /api/books/:id - Delete a book (admin only)
router.delete('/books/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    try {
        const deletedBook = await Book.findByIdAndDelete(req.params.id);
        if (!deletedBook) {
            return res.status(404).json({ message: 'Book not found' });
        }
        res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// POST /api/books/:id/borrow - Borrow a book
router.post('/books/:id/borrow', authMiddleware, async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid book ID format' });
    }

    try {
        const book = await Book.findById(id);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const activeBorrow = await BorrowRecord.findOne({
            bookId: id,
            userId: req.user.id,
            status: 'active'
        });

        if (activeBorrow) {
            return res.status(400).json({ message: 'You have already borrowed this book and not returned it yet.' });
        }

        let dueDate;
        if (req.body && req.body.dueDate) {
            const parsed = new Date(req.body.dueDate);
            if (Number.isNaN(parsed.getTime())) {
                return res.status(400).json({ message: 'Invalid dueDate format' });
            }
            dueDate = parsed;
        }

        const borrowRecord = await BorrowRecord.create({
            bookId: id,
            userId: req.user.id,
            dueDate
        });

        book.borrowCount = (book.borrowCount || 0) + 1;
        book.lastBorrowedAt = new Date();
        await book.save();

        const populatedRecord = await borrowRecord.populate('userId', 'email firstName lastName');
        res.status(201).json(populatedRecord);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// POST /api/books/:id/return - Return a borrowed book
router.post('/books/:id/return', authMiddleware, async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid book ID format' });
    }

    try {
        const activeBorrow = await BorrowRecord.findOne({
            bookId: id,
            userId: req.user.id,
            status: 'active'
        });

        if (!activeBorrow) {
            return res.status(400).json({ message: 'You do not have an active borrow for this book.' });
        }

        activeBorrow.status = 'returned';
        activeBorrow.returnDate = new Date();
        if (req.body && req.body.comments) {
            activeBorrow.comments = req.body.comments;
        }
        await activeBorrow.save();

        const populatedRecord = await activeBorrow.populate('userId', 'email firstName lastName');
        res.json(populatedRecord);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// GET /api/books/:id/borrow-status - Check current user's borrow status for a book
router.get('/books/:id/borrow-status', authMiddleware, async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid book ID format' });
    }

    try {
        const activeBorrowPromise = BorrowRecord.findOne({
            bookId: id,
            userId: req.user.id,
            status: 'active'
        });

        const mostRecentPromise = (async () => {
            try {
                return await BorrowRecord.findOne({
                    bookId: id,
                    userId: req.user.id
                }).sort({ createdAt: -1 });
            } catch (dbError) {
                if (!isCosmosOrderByError(dbError)) {
                    throw dbError;
                }
                const fallbackRecords = await BorrowRecord.find({
                    bookId: id,
                    userId: req.user.id
                });
                if (!fallbackRecords.length) {
                    return null;
                }
                fallbackRecords.sort((a, b) => {
                    const aTime = new Date(a.createdAt).getTime();
                    const bTime = new Date(b.createdAt).getTime();
                    return bTime - aTime;
                });
                return fallbackRecords[0] || null;
            }
        })();

        const [activeBorrow, mostRecent] = await Promise.all([
            activeBorrowPromise,
            mostRecentPromise
        ]);

        res.json({
            isBorrowed: Boolean(activeBorrow),
            activeBorrow,
            lastRecord: mostRecent
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// GET /api/borrow/my - List authenticated user's borrow records
router.get('/borrow/my', authMiddleware, async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    const parsedLimit = Number.parseInt(limit, 10) || 10;
    const parsedPage = Number.parseInt(page, 10) || 1;

    const filter = { userId: req.user.id };
    if (status) {
        filter.status = status;
    }

    try {
        const total = await BorrowRecord.countDocuments(filter);
        const records = await BorrowRecord.find(filter)
            .populate('bookId', 'title author coverImage location')
            .sort({ createdAt: -1 })
            .skip((parsedPage - 1) * parsedLimit)
            .limit(parsedLimit);

        res.json({
            data: records,
            total,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: Math.ceil(total / parsedLimit)
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// GET /api/books/:id/borrow-history - Borrowing records (admin only)
router.get('/books/:id/borrow-history', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid book ID format' });
    }

    const { page = 1, limit = 10 } = req.query;
    const parsedLimit = Number.parseInt(limit, 10) || 10;
    const parsedPage = Number.parseInt(page, 10) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    try {
        const query = { bookId: id };
        const total = await BorrowRecord.countDocuments(query);
        let records;
        try {
            records = await BorrowRecord.find(query)
                .populate('userId', 'email firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parsedLimit);
        } catch (dbError) {
            if (!isCosmosOrderByError(dbError)) {
                throw dbError;
            }
            const fallbackRecords = await BorrowRecord.find(query)
                .populate('userId', 'email firstName lastName');
            fallbackRecords.sort((a, b) => {
                const aTime = new Date(a.createdAt).getTime();
                const bTime = new Date(b.createdAt).getTime();
                return bTime - aTime;
            });
            records = fallbackRecords.slice(skip, skip + parsedLimit);
        }

        res.json({
            data: records,
            total,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: Math.ceil(total / parsedLimit)
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

// Admin-only User Management
router.get('/users', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const {
        page = 1,
        limit = 10,
        role,
        keyword,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    const parsedLimit = Number.parseInt(limit, 10) || 10;
    const parsedPage = Number.parseInt(page, 10) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = {};
    if (role) {
        filter.role = role;
    }
    if (keyword) {
        filter.$or = [
            { email: { $regex: keyword, $options: 'i' } },
            { firstName: { $regex: keyword, $options: 'i' } },
            { lastName: { $regex: keyword, $options: 'i' } }
        ];
    }
    if (typeof req.query.isActive !== 'undefined') {
        if (req.query.isActive === 'true' || req.query.isActive === true) {
            filter.isActive = true;
        } else if (req.query.isActive === 'false' || req.query.isActive === false) {
            filter.isActive = false;
        }
    }

    const sortableFields = ['email', 'firstName', 'lastName', 'role', 'createdAt'];
    const safeSortBy = sortableFields.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'asc' ? 1 : -1;

    try {
        const total = await User.countDocuments(filter);
        let users;
        try {
            users = await User.find(filter)
                .select('-password')
                .sort({ [safeSortBy]: safeSortOrder })
                .skip(skip)
                .limit(parsedLimit);
        } catch (dbError) {
            if (dbError.message && dbError.message.includes('order-by item is excluded')) {
                const fallbackUsers = await User.find(filter).select('-password');
                const direction = safeSortOrder;
                const safeValue = (record) => {
                    const value = record?.[safeSortBy];
                    if (value === undefined || value === null) {
                        return direction === 1 ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
                    }
                    return value;
                };
                fallbackUsers.sort((a, b) => {
                    const aVal = safeValue(a);
                    const bVal = safeValue(b);
                    if (aVal < bVal) return -1 * direction;
                    if (aVal > bVal) return 1 * direction;
                    return 0;
                });
                users = fallbackUsers.slice(skip, skip + parsedLimit);
            } else {
                throw dbError;
            }
        }

        res.json({
            data: users,
            total,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: Math.ceil(total / parsedLimit)
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

router.post('/users', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const { email, password, firstName, lastName, role = 'user', isActive = true } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ message: 'Email is already registered.' });
        }

        const newUser = await User.create({
            email: email.toLowerCase(),
            password,
            firstName,
            lastName,
            role,
            isActive
        });

        res.status(201).json(newUser.toJSON());
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

router.get('/users/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid user ID format' });
    }

    try {
        const user = await User.findById(id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

router.put('/users/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const { email, password, firstName, lastName, role, isActive } = req.body;

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (email) user.email = email.toLowerCase();
        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (role) user.role = role;
        if (typeof isActive === 'boolean') user.isActive = isActive;
        if (password) {
            user.password = password; // Will be hashed by mongoose middleware
        }

        await user.save();
        res.json(user.toJSON());
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email must be unique.' });
        }
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

router.delete('/users/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid user ID format' });
    }

    try {
        const deleted = await User.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

router.get('/users/:id/borrow-history', authMiddleware, authorizeRoles('admin'), async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const { page = 1, limit = 5 } = req.query;
    const parsedLimit = Number.parseInt(limit, 10) || 5;
    const parsedPage = Number.parseInt(page, 10) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    const query = { userId: id };

    try {
        const total = await BorrowRecord.countDocuments(query);
        let records;
        try {
            records = await BorrowRecord.find(query)
                .populate('bookId', 'title')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parsedLimit);
        } catch (dbError) {
            if (!isCosmosOrderByError(dbError)) {
                throw dbError;
            }
            const fallbackRecords = await BorrowRecord.find(query)
                .populate('bookId', 'title');
            fallbackRecords.sort((a, b) => {
                const aTime = new Date(a.createdAt).getTime();
                const bTime = new Date(b.createdAt).getTime();
                return bTime - aTime;
            });
            records = fallbackRecords.slice(skip, skip + parsedLimit);
        }

        res.json({
            data: records,
            total,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: Math.ceil(total / parsedLimit)
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

module.exports = router;
