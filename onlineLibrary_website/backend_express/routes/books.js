const express = require('express');
const router = express.Router();
const { connectToDB, ObjectId } = require('../utils/db');

// Display all books
router.get('/', async function(req, res, next) { // 
    const ITEMS_PER_PAGE = 6; 

    const page = parseInt(req.query.page) || 1;

    const db = await connectToDB();
    try {
        const totalBooks = await db.collection("books").countDocuments();
        const totalPages = Math.ceil(totalBooks / ITEMS_PER_PAGE);

        const books = await db.collection("books")
            .find({})
            .sort({ createdAt: -1 })
            .skip((page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE)
            .toArray();

        res.render('books', { 
            title: 'All Books', 
            books: books,
            breadcrumb: '<li class="breadcrumb-item active" aria-current="page">Books</li>',

            currentPage: page,
            totalPages: totalPages,
            hasNextPage: ITEMS_PER_PAGE * page < totalBooks,
            hasPreviousPage: page > 1
        });
    } catch (err) {

        return next(err); 
    } finally {
        if (db && db.client) {
          await db.client.close();
        }
    }
});

// Show form to add a new book
router.get('/add', function(req, res) {
    res.render('add', { 
        title: 'Add New Book',
        breadcrumb: '<li class="breadcrumb-item"><a href="/books">Books</a></li><li class="breadcrumb-item active" aria-current="page">Add</li>'
    });
});

// Handle submission of new book form
router.post('/add', async function(req, res, next) {
    const db = await connectToDB();
    try {
        let book = {
            title: req.body.title,
            description: req.body.description,
            coverImage: req.body.coverImage,
            author: req.body.author,
            isbn: req.body.isbn,
            publisher: req.body.publisher,
            year: req.body.year ? parseInt(req.body.year) : null,
            category: req.body.category,
            location: req.body.location,
            isHighlighted: req.body.isHighlighted ? true : false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await db.collection("books").insertOne(book);
        res.redirect('/books'); 
    } catch (err) {
        return next(err);
    } finally {
        if (db && db.client) {
            await db.client.close();
        }
    }
});

// Show details of a single book
router.get('/detail/:id', async function(req, res, next) {
    const db = await connectToDB();
    try {
        const book = await db.collection("books").findOne({ _id: new ObjectId(req.params.id) });
        if (book) {
            res.render('detail', { 
                title: book.title, 
                book: book,
                breadcrumb: `<li class="breadcrumb-item"><a href="/books">Books</a></li><li class="breadcrumb-item active" aria-current="page">${book.title}</li>`
            });
        } else {
            res.status(404).send("Book not found");
        }
    } catch (err) {
        return next(err);
    } finally {
        if (db && db.client) {
            await db.client.close();
        }
    }
});

// Show edit form
router.get('/edit/:id', async function(req, res, next) {
    const db = await connectToDB();
    try {
        const book = await db.collection("books").findOne({ _id: new ObjectId(req.params.id) });
        if (book) {
            res.render('edit', { 
                title: 'Edit Book', 
                book: book,
                breadcrumb: `<li class="breadcrumb-item"><a href="/books">Books</a></li><li class="breadcrumb-item"><a href="/books/detail/${book._id}">${book.title}</a></li><li class="breadcrumb-item active" aria-current="page">Edit</li>`
            });
        } else {
            res.status(404).send("Book not found");
        }
    } catch (err) {
        return next(err);
    } finally {
        if (db && db.client) {
            await db.client.close();
        }
    }
});

// Handle edit form submission
router.post('/edit/:id', async function(req, res, next) {
    const db = await connectToDB();
    try {
        const updatedBook = {
            title: req.body.title,
            description: req.body.description,
            coverImage: req.body.coverImage,
            author: req.body.author,
            isbn: req.body.isbn,
            publisher: req.body.publisher,
            year: req.body.year ? parseInt(req.body.year) : null,
            category: req.body.category,
            location: req.body.location,
            isHighlighted: req.body.isHighlighted ? true : false,
            updatedAt: new Date()
        };
        await db.collection("books").updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updatedBook }
        );
        res.redirect(`/books/detail/${req.params.id}`);
    } catch (err) {
        return next(err);
    } finally {
        if (db && db.client) {
            await db.client.close();
        }
    }
});

// Handle delete request
router.post('/delete/:id', async function(req, res, next) {
    const db = await connectToDB();
    try {
        await db.collection("books").deleteOne({ _id: new ObjectId(req.params.id) });
        res.redirect('/books');
    } catch (err) {
        return next(err);
    } finally {
        if (db && db.client) {
            await db.client.close();
        }
    }
});

module.exports = router;