import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import bodyParser from 'body-parser';

// Import configurations
import { testConnection } from './config/database.js';
import { validateYoxaConfig } from './config/yoxa.js';

// Import routes
import authRouter from './routes/auth.js';
import patientsRouter from './routes/patients.js';
import referralsRouter from './routes/referrals.js';
import trackersRouter from './routes/trackers.js';
import hitlRouter from './routes/hitl.js';

// Import utilities
import { captureRawBody } from './utils/hmacVerifier.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost on any port for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Logging
app.use(morgan('dev'));

// CRITICAL: Raw body capture for HITL webhook signature verification
// This must come BEFORE the JSON body parser
app.use('/api/hitl/webhook', bodyParser.json({
  verify: captureRawBody
}));

// Regular JSON body parser for all other routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'MedicoTabs Backend API',
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/referrals', referralsRouter);
app.use('/api/trackers', trackersRouter);
app.use('/api/hitl', hitlRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MedicoTabs EHR Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      patients: '/api/patients',
      referrals: '/api/referrals',
      trackers: '/api/trackers',
      hitl: '/api/hitl',
    },
    yoxaIntegration: {
      triggerWorkflow: 'POST /api/referrals',
      receiveApprovals: 'POST /api/hitl/webhook',
      respondToApproval: 'POST /api/hitl/:requestId/respond',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
async function startServer() {
  console.log('\n🏥 MedicoTabs EHR Backend');
  console.log('━'.repeat(50));
  
  // Test database connection
  console.log('\n📊 Database Connection:');
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.warn('\n⚠ WARNING: Database connection failed!');
    console.warn('The server will start but database operations will fail.');
    console.warn('Please check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n');
  }
  
  // Validate YOXA configuration
  console.log('\n🤖 YOXA Integration:');
  validateYoxaConfig();
  
  // Start listening
  app.listen(PORT, () => {
    console.log('\n✓ Server running');
    console.log(`  Local: http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('\n📡 API Endpoints:');
    console.log(`  Health: http://localhost:${PORT}/health`);
    console.log(`  Patients: http://localhost:${PORT}/api/patients`);
    console.log(`  Referrals: http://localhost:${PORT}/api/referrals`);
    console.log(`  Trackers: http://localhost:${PORT}/api/trackers`);
    console.log(`  HITL: http://localhost:${PORT}/api/hitl`);
    console.log('\n🔗 YOXA Integration Points:');
    console.log(`  Trigger: POST http://localhost:${PORT}/api/referrals`);
    console.log(`  Webhook: POST http://localhost:${PORT}/api/hitl/webhook`);
    console.log(`  Respond: POST http://localhost:${PORT}/api/hitl/:requestId/respond`);
    console.log('\n━'.repeat(50));
    console.log('Ready to accept requests!\n');
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
