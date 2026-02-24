const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoClient, ObjectId } = require('mongodb');
// process.env.MONGODB_URI = 'xxx';


if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/libraryDB';
}

// Connect to MongoDB using Mongoose
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define the Book schema
const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    coverImage: { type: String, required: true },
    author: { type: String, required: true },
    isbn: { type: String, required: true, unique: true },
    publisher: { type: String, required: true },
    year: { type: Number, required: true },
    category: { 
        type: String, 
        required: true,
        enum: ['Science', 'Technology', 'Engineering', 'Mathematics', 'Arts', 'Literature', 'History', 'Geography', 'Philosophy', 'Psychology', 'Sociology', 'Economics', 'Business', 'Law', 'Medicine', 'Health', 'Education', 'Politics', 'Religion', 'Environment']
    },
    location: { 
        type: String, 
        required: true,
        enum: ['Shelf A1', 'Shelf A2', 'Shelf A3', 'Shelf B1', 'Shelf B2', 'Shelf B3', 'Shelf C1', 'Shelf C2', 'Shelf C3']
    },
    isHighlighted: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    borrowCount: { type: Number, default: 0 },
    lastBorrowedAt: { type: Date, default: null }
}, { timestamps: true }); // timestamps will automatically add createdAt and updatedAt fields

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

userSchema.pre('findOneAndUpdate', async function(next) {
    const update = this.getUpdate();
    if (update && update.password) {
        try {
            const salt = await bcrypt.genSalt(10);
            update.password = await bcrypt.hash(update.password, salt);
            this.setUpdate(update);
        } catch (err) {
            return next(err);
        }
    }
    next();
});

userSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

const borrowRecordSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    borrowDate: { type: Date, default: Date.now },
    dueDate: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    returnDate: { type: Date },
    comments: { type: String },
    status: { type: String, enum: ['active', 'returned'], default: 'active' }
}, { timestamps: true });

const Book = mongoose.model('Book', bookSchema);
const User = mongoose.model('User', userSchema);
const BorrowRecord = mongoose.model('BorrowRecord', borrowRecordSchema);

// Legacy MongoDB client support for server-rendered routes
async function connectToDB() {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    db.client = client;
    return db;
}

async function seedDefaultUsers() {
    const defaults = [
        { email: 'admin@library.com', password: 'Admin123!', firstName: 'Admin', lastName: 'User', role: 'admin' },
        { email: 'user@library.com', password: 'User123!', firstName: 'Normal', lastName: 'User', role: 'user' }
    ];

    for (const userData of defaults) {
        const existing = await User.findOne({ email: userData.email });
        if (!existing) {
            await User.create(userData);
            console.log(`Seeded default account: ${userData.email}`);
        }
    }
}

mongoose.connection.once('open', () => {
    seedDefaultUsers().catch((err) => console.error('Failed seeding default users', err));
});

module.exports = { Book, User, BorrowRecord, connectToDB, ObjectId };