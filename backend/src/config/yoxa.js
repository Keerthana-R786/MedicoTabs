import dotenv from 'dotenv';

dotenv.config();

export const yoxaConfig = {
  // Trigger configuration
  triggerUrl: process.env.YOXA_TRIGGER_URL,
  deploymentSecret: process.env.YOXA_DEPLOYMENT_SECRET,
  deploymentId: process.env.YOXA_DEPLOYMENT_ID,
  
  // API base URL - derived from trigger URL if not set
  apiBase: process.env.YOXA_API_BASE || (
    process.env.YOXA_TRIGGER_URL 
      ? new URL(process.env.YOXA_TRIGGER_URL).origin 
      : null
  ),
  
  // HITL configuration
  hitl: {
    webhookSigningSecret: process.env.YOXA_HITL_WEBHOOK_SIGNING_SECRET,
    responseSecret: process.env.YOXA_HITL_RESPONSE_SECRET,
    timestampTolerance: parseInt(process.env.WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS || '300'),
  },
};

// Validate critical configuration
export function validateYoxaConfig() {
  const errors = [];
  
  if (!yoxaConfig.triggerUrl) {
    errors.push('YOXA_TRIGGER_URL is not set');
  }
  
  if (!yoxaConfig.deploymentSecret) {
    errors.push('YOXA_DEPLOYMENT_SECRET is not set');
  }
  
  if (!yoxaConfig.deploymentId) {
    errors.push('YOXA_DEPLOYMENT_ID is not set');
  }
  
  if (!yoxaConfig.hitl.webhookSigningSecret) {
    errors.push('YOXA_HITL_WEBHOOK_SIGNING_SECRET is not set');
  }
  
  if (!yoxaConfig.hitl.responseSecret) {
    errors.push('YOXA_HITL_RESPONSE_SECRET is not set');
  }
  
  if (errors.length > 0) {
    console.warn('⚠ YOXA Configuration Warnings:');
    errors.forEach(err => console.warn(`  - ${err}`));
    console.warn('  The server will start but YOXA integration will not work.');
    console.warn('  Please configure these in your .env file.');
    return false;
  }
  
  console.log('✓ YOXA configuration validated');
  return true;
}

export default yoxaConfig;
