import { User, validateUser } from '../models/user.js';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcrypt';

async function seedDatabase() {
  try {
    // Sync Sequelize models with the database
    await sequelize.sync({ force: true }); // Use { force: true } carefully in development

    console.log('db connected');
    const passwordHash = await bcrypt.hash('admin@123', 10);
    const seedData = [
      {
        firstName: 'Admin',
        lastName: '',
        email: 'admin@gmail.com',
        password: passwordHash,
        isAdmin: true,
        isVerified: true
      },
    ];

    for (const data of seedData) {
      const { error, value } = validateUser(data);
      if (error) {
        console.error('validationError', error.details[0].message);
      } else {
        await User.create(value);
        console.log('user added successfully!');
      }
    }
  } catch (error) {
    console.error('db connection error', error);
  }
}

seedDatabase();
