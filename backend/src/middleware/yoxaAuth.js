import { yoxaConfig } from '../config/yoxa.js';

/**
 * Gates the /api/yoxa/* tool endpoints behind a shared secret so only the
 * configured YOXA deployment can invoke them (previously these were fully
 * open — anyone who could reach the backend could call any tool).
 *
 * Configure the SAME value as YOXA_TOOLS_API_KEY in this backend's .env and
 * as the Bearer token for every connector in the YOXA platform UI.
 */
export function requireYoxaAuth(req, res, next) {
  if (!yoxaConfig.toolsApiKey) {
    console.warn('⚠ YOXA_TOOLS_API_KEY is not set — /api/yoxa/* is running UNAUTHENTICATED.');
    return next();
  }

  // Accept the token whether the caller sends "Bearer <token>" or just the
  // raw token as the whole header — different platforms' "Bearer token"
  // fields disagree on whether they add the prefix themselves. Trim to
  // tolerate stray whitespace/newlines from a pasted credential.
  const header = (req.headers.authorization || '').trim();
  const token = (header.startsWith('Bearer ') ? header.slice(7) : header).trim();

  if (!token || token !== yoxaConfig.toolsApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
