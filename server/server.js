import dotenv from 'dotenv';

// Load environment variables first, before any other imports
dotenv.config();

// Debug: Verify Twilio credentials are loaded
console.log('🔍 Environment Check:');
console.log('   TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✓ Loaded' : '✗ Missing');
console.log('   TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✓ Loaded' : '✗ Missing');
console.log('   TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? '✓ Loaded' : '✗ Missing');
console.log('');

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import os from 'node:os';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import donorRoutes from './routes/donorRoutes.js';
import campRoutes from './routes/campRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import donationRoutes from './routes/donationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import liveUpdatesRoutes from './routes/liveUpdatesRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'PORT'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Please create a .env file with the required variables.');
  console.error('   See .env.example for reference.\n');
  process.exit(1);
}

connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.get('/api/config/public', (req, res) => {
  const configuredOrigin = process.env.CLIENT_URL || process.env.PUBLIC_APP_URL;
  const networkInterfaces = os.networkInterfaces();
  const interfaceNames = Object.keys(networkInterfaces);
  const preferredInterfaces = [
    ...interfaceNames.filter((name) => /wi.?fi|wireless|wlan/i.test(name)),
    ...interfaceNames.filter((name) => !/wi.?fi|wireless|wlan/i.test(name)),
  ];
  const localAddress = preferredInterfaces
    .filter((name) => !/virtual|zerotier|vpn|bluetooth|loopback/i.test(name))
    .flatMap((name) => networkInterfaces[name] || [])
    .find((address) => address && address.family === 'IPv4' && !address.internal);

  res.json({
    frontendOrigin: configuredOrigin
      ? configuredOrigin.replace(/\/+$/, '')
      : localAddress
        ? `http://${localAddress.address}:3000`
        : 'http://localhost:3000',
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Blood Donation Camp Management System API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/camps', campRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/live-updates', liveUpdatesRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
