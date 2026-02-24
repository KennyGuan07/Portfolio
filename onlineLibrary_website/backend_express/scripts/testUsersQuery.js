const mongoose = require('mongoose');
const { User } = require('../utils/db');

(async () => {
  try {
    const filter = {};
    const sortBy = 'createdAt';
    const sortOrder = -1;
    const users = await User.find(filter)
      .select('-password')
      .sort({ [sortBy]: sortOrder })
      .limit(10);
    console.log('Fetched', users.length, 'users');
  } catch (err) {
    console.error('Query error:', err);
  } finally {
    await mongoose.connection.close();
  }
})();
