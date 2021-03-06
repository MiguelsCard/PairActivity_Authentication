const express = require('express');
const app = express();
app.use(express.json());
const {
  models: { User, Note },
} = require('./db');
const path = require('path');

const requireToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    console.log('TOKEN:', req.headers);
    const user = await User.byToken(token);

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/auth', async (req, res, next) => {
  try {
    res.send({ token: await User.authenticate(req.body) });
  } catch (ex) {
    next(ex);
  }
});

app.get('/api/auth', async (req, res, next) => {
  try {
    console.log('FROM API');
    res.send(await User.byToken(req.headers.authorization));
  } catch (ex) {
    next(ex);
  }
});

app.get('/api/user/:userId/notes', requireToken, async (req, res, next) => {
  try {
    const id = req.user.id;
    console.log('First', id);
    const user = await User.findAll({
      where: { id: id },
      include: [{ model: Note }],
    });

    res.send(user[0].notes);
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
