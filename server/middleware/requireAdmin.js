const crypto = require('crypto');

function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_KEY;
  const provided = req.get('x-admin-key');

  // If the server has no key configured, refuse everything.
  if (!expected) {
    return res.status(500).json({ error: 'Server is not configured for this action' });
  }
  if (!provided) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = requireAdmin;