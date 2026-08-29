import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import axios from 'axios';

// Import configurations
import { testConnection } from './config/database.js';
import { validateYoxaConfig } from './config/yoxa.js';

// Import routes
import authRouter from './routes/auth.js';
import patientsRouter from './routes/patients.js';
import referralsRouter from './routes/referrals.js';
import trackersRouter from './routes/trackers.js';
import hitlRouter from './routes/hitl.js';
import yoxaRouter from './routes/yoxa.js';
import statsRouter from './routes/stats.js';
import patientAuthRouter from './routes/patientAuth.js';
import patientPortalRouter from './routes/patientPortal.js';
import notificationsRouter from './routes/notifications.js';
import documentsRouter from './routes/documents.js';
import doctorsRouter from './routes/doctors.js';
import messagesRouter from './routes/messages.js';

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
      // Deny without throwing — an Error here becomes an unhandled 500 on
      // every request (including the CORS preflight) from a disallowed
      // origin, instead of a clean CORS rejection the browser can report
      // normally.
      callback(null, false);
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

// YOXA verification endpoint
app.post('/api/yoxa-verify', async (req, res) => {
  try {
    const challenge = req.headers['x-yoxa-verification-challenge'];
    const deploymentId = req.body.deploymentId || process.env.YOXA_DEPLOYMENT_ID;
    const secret = process.env.YOXA_DEPLOYMENT_SECRET;
    
    if (!challenge || !deploymentId || !secret) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        challenge: !!challenge,
        deploymentId: !!deploymentId,
        secret: !!secret
      });
    }
    
    const verifyUrl = `https://yoxa.ai/api/v1/public/workflow-deployments/${deploymentId}/verify`;
    
    const response = await axios.post(verifyUrl, {}, {
      headers: {
        'X-Yoxa-Verification-Challenge': challenge,
        'X-Yoxa-Deployment-Secret': secret,
      }
    });
    
    res.json({ 
      success: true, 
      message: 'YOXA verification successful',
      response: response.data 
    });
  } catch (error) {
    console.error('YOXA verification error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Verification failed', 
      details: error.response?.data || error.message 
    });
  }
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/referrals', referralsRouter);
app.use('/api/trackers', trackersRouter);
app.use('/api/hitl', hitlRouter);
// YOXA tool endpoints - called back by YOXA agents during workflow runs
app.use('/api/yoxa', yoxaRouter);
app.use('/api/stats', statsRouter);
// Patient portal - separate low-privilege identity space, patients only ever see their own data
app.use('/api/patient-auth', patientAuthRouter);
app.use('/api/patient-portal', patientPortalRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/doctors', doctorsRouter);
app.use('/api/messages', messagesRouter);

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
      yoxa: '/api/yoxa',
      stats: '/api/stats',
      patientAuth: '/api/patient-auth',
      patientPortal: '/api/patient-portal',
      notifications: '/api/notifications',
    },
    yoxaIntegration: {
      triggerWorkflow: 'POST /api/referrals',
      receiveApprovals: 'POST /api/hitl/webhook',
      respondToApproval: 'POST /api/hitl/:requestId/respond',
      toolEndpoints: '/api/yoxa/*',
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
  const server = app.listen(PORT, () => {
    console.log('\n✓ Server running');
    console.log(`  Local: http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('\n📡 API Endpoints:');
    console.log(`  Health: http://localhost:${PORT}/health`);
    console.log(`  Patients: http://localhost:${PORT}/api/patients`);
    console.log(`  Referrals: http://localhost:${PORT}/api/referrals`);
    console.log(`  Trackers: http://localhost:${PORT}/api/trackers`);
    console.log(`  HITL: http://localhost:${PORT}/api/hitl`);
    console.log(`  YOXA Tools: http://localhost:${PORT}/api/yoxa/*`);
    console.log('\n🔗 YOXA Integration Points:');
    console.log(`  Trigger: POST http://localhost:${PORT}/api/referrals`);
    console.log(`  Webhook: POST http://localhost:${PORT}/api/hitl/webhook`);
    console.log(`  Respond: POST http://localhost:${PORT}/api/hitl/:requestId/respond`);
    console.log('\n━'.repeat(50));
    console.log('Ready to accept requests!\n');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n✗ Port ${PORT} is already in use.`);
      console.error('  A previous instance of this server is still running (that is OK).');
      console.error('  To stop it and restart fresh, run:');
      console.error('    Get-Process -Id (Get-NetTCPConnection -LocalPort 5000 -State Listen).OwningProcess | Stop-Process -Force');
      process.exit(1);
    }
    throw err;
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
