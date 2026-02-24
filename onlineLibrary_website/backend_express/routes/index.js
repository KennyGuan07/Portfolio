var express = require('express');
var router = express.Router();
const { connectToDB } = require('../utils/db');

// Get home page
router.get('/', async function(req, res, next) {
  const db = await connectToDB();
  try {
    // Get highlighted books
    const highlightedBooks = await db.collection("books").find({ isHighlighted: true }).toArray();

    // Get latestBooks books
    const latestBooks = await db.collection("books").find({}).sort({ createdAt: -1 }).limit(6).toArray();

    // 3. Get trending & hot books 
    const trendingBooks = await db.collection("books").aggregate([{ $sample: { size: 6 } }]).toArray();
    const hotBooks = await db.collection("books").aggregate([{ $sample: { size: 6 } }]).toArray();

    res.render('index', { 
      title: 'Online Library',
      highlightedBooks: highlightedBooks,
      latestBooks: latestBooks,
      trendingBooks: trendingBooks,
      hotBooks: hotBooks,
      breadcrumb: '' 
    });

  } catch (err) {
    next(err); 
  } finally {
    if (db && db.client) {
      await db.client.close();
    }
  }
});

module.exports = router;