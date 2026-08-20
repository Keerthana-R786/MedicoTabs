import crypto from 'crypto';

/**
 * Verify YOXA webhook HMAC signature
 * @param {string} rawBody - Raw request body as string
 * @param {string} timestamp - X-Yoxa-Webhook-Timestamp header
 * @param {string} signature - X-Yoxa-Webhook-Signature header (format: v1=<hmac>)
 * @param {string} secret - YOXA webhook signing secret
 * @returns {boolean} - True if signature is valid
 */
export function verifyWebhookSignature(rawBody, timestamp, signature, secret) {
  if (!rawBody || !timestamp || !signature || !secret) {
    console.error('Missing required parameters for webhook verification');
    return false;
  }
  
  // Extract the signature value (format is "v1=<signature>")
  const signatureMatch = signature.match(/^v1=(.+)$/);
  if (!signatureMatch) {
    console.error('Invalid signature format. Expected: v1=<hmac>');
    return false;
  }
  
  const receivedSignature = signatureMatch[1];
  
  // Construct the signed payload: timestamp + "." + raw_body
  const signedPayload = `${timestamp}.${rawBody}`;
  
  // Calculate expected signature using HMAC-SHA256
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  
  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}

/**
 * Check if webhook timestamp is within acceptable tolerance
 * @param {string} timestamp - ISO 8601 timestamp
 * @param {number} toleranceSeconds - Maximum age in seconds
 * @returns {boolean} - True if timestamp is fresh
 */
export function isTimestampFresh(timestamp, toleranceSeconds = 300) {
  const webhookTime = new Date(timestamp).getTime();
  const currentTime = Date.now();
  const ageSeconds = (currentTime - webhookTime) / 1000;
  
  return ageSeconds <= toleranceSeconds;
}

/**
 * Middleware to capture raw body for HMAC verification
 * Must be used before body-parser JSON middleware
 */
export function captureRawBody(req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}

export default {
  verifyWebhookSignature,
  isTimestampFresh,
  captureRawBody,
};
