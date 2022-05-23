const Sequelize = require('sequelize');
const { STRING } = Sequelize;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const config = {
  logging: false,
};

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || 'postgres://localhost/acme_db',
  config
);

const User = conn.define('user', {
  username: STRING,
  password: STRING,
});

const Note = conn.define('note', {
  text: {
    type: STRING,
  },
});

Note.belongsTo(User);
User.hasMany(Note);

const saltRounds = 10;
User.beforeCreate(async (user) => {
  user.password = await bcrypt.hash(user.password, saltRounds);
});

User.byToken = async (token) => {
  try {
    token = await jwt.verify(token, process.env.JWT);
    console.log(token);
    const user = await User.findByPk(token.userId);
    if (user) {
      return user;
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });
  const authenticated = await bcrypt.compare(password, user.password);
  if (authenticated) {
    ////////
    const token = await jwt.sign({ userId: user.id }, process.env.JWT);
    return token;
  }

  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw' },
    { username: 'moe', password: 'moe_pw' },
    { username: 'larry', password: 'larry_pw' },
  ];
  const notes = [
    { text: 'Random text' },
    { text: 'Hello World' },
    { text: 'Hello there' },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  const [one, two, three] = await Promise.all(
    notes.map((note) => Note.create(note))
  );
  await lucy.setNotes(one);
  await moe.setNotes([two, three]);
  return {
    users: {
      lucy,
      moe,
      larry,
    },
    notes: {
      one,
      two,
      three,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
