const Datastore = require('nedb-promises');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');

const users = Datastore.create({
  filename: path.join(dataDir, 'users.db'),
  autoload: true,
});

const quizzes = Datastore.create({
  filename: path.join(dataDir, 'quizzes.db'),
  autoload: true,
});

const results = Datastore.create({
  filename: path.join(dataDir, 'results.db'),
  autoload: true,
});

// Set up indexes
users.ensureIndex({ fieldName: 'username', unique: true });
quizzes.ensureIndex({ fieldName: 'userId' });
results.ensureIndex({ fieldName: 'userId' });
results.ensureIndex({ fieldName: 'quizId' });

module.exports = { users, quizzes, results };
