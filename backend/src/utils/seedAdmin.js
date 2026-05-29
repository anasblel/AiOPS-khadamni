import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      console.log('No admin user found. Seeding default admin account...');
      const hashedPassword = await bcrypt.hash('adminpassword123', 10);
      await User.create({
        name: 'System Admin',
        email: 'admin@aiops.com',
        password: hashedPassword,
        role: 'admin',
        phone: '+21699999999',
        address: 'Tunis, Tunisia'
      });
      console.log('Default admin account seeded successfully: admin@aiops.com / adminpassword123');
    } else {
      console.log('Admin user already exists in database.');
    }
  } catch (err) {
    console.error('Failed to seed default admin:', err.message);
  }
};
