// server/src/index.js - Customer Portal Server for dmbrands.co.uk
import './config/firebase.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import routes
import customerRoutes from './routes/customers.js';
import authRoutes from './routes/auth.js';
import signupRoutes from './routes/signup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3002;
const API_VERSION = '1.0.0';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://dmbrands.co.uk',
  'http://dmbrands.co.uk',
  'https://www.dmbrands.co.uk',
  'http://www.dmbrands.co.uk',
  'https://splitfin.co.uk',
  'http://splitfin.co.uk'
];

// Initialize Firebase Admin SDK
const db = admin.firestore();
const auth = admin.auth();

// Express Setup
const app = express();

app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: (incomingOrigin, callback) => {
    if (!incomingOrigin || ALLOWED_ORIGINS.includes(incomingOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${incomingOrigin}`));
    }
  },
  credentials: true
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes per IP
  message: { error: 'Too many requests, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
});

app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/customers', customerRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', signupRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'DMBrands Customer Portal API',
    version: API_VERSION,
    status: 'running',
    environment: IS_PRODUCTION ? 'production' : 'development',
    documentation: {
      base_url: `${req.protocol}://${req.get('host')}`,
      endpoints: {
        health: '/health',
        api: {
          customers: '/api/customers/*',
          auth: '/api/auth/*'
        }
      }
    },
    features: [
      'Customer Authentication',
      'Order Management', 
      'Invoice Management',
      'Product Catalog Access',
      'Messaging Integration',
      'Firebase Integration'
    ],
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Basic health check
    await db.collection('_health').doc('check').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      service: 'dmbrands-customer-portal'
    });

    res.json({
      status: 'healthy',
      version: API_VERSION,
      environment: IS_PRODUCTION ? 'production' : 'development',
      timestamp: new Date().toISOString(),
      database: 'connected',
      services: {
        firebase: 'connected'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error Handling
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Unhandled error:', err);

  if (err.message && err.message.includes('CORS blocked')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      timestamp: new Date().toISOString()
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    }),
    timestamp: new Date().toISOString()
  });
});

// Server Startup
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              DMBrands Customer Portal API                 ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Version    : ${API_VERSION.padEnd(46)}║`);
  console.log(`║ Environment: ${(IS_PRODUCTION ? 'production' : 'development').padEnd(46)}║`);
  console.log(`║ Port       : ${PORT.toString().padEnd(46)}║`);
  console.log(`║ Base URL   : http://localhost:${PORT.toString().padEnd(29)}║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║ Features:                                                  ║');
  console.log('║ • Customer Authentication                                   ║');
  console.log('║ • Order Management                                         ║');
  console.log('║ • Invoice Management                                       ║');
  console.log('║ • Product Catalog Access                                   ║');
  console.log('║ • Messaging Integration                                    ║');
  console.log('║ • Firebase Integration                                     ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║ Main Endpoints:                                            ║');
  console.log(`║ • Health     : http://localhost:${PORT}/health              ║`);
  console.log(`║ • API Docs   : http://localhost:${PORT}/                    ║`);
  console.log(`║ • Customers  : /api/customers/*                            ║`);
  console.log(`║ • Auth       : /api/auth/*                                 ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (IS_PRODUCTION) {
    console.log('\n✅ Production mode: Customer portal API ready');
  } else {
    console.log('\n🔧 Development mode: All debugging endpoints available');
  }
});

// Graceful Shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received, starting graceful shutdown...`);

  server.close(() => {
    console.log('✅ HTTP server closed');
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('⚠️ Forcefully shutting down after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;