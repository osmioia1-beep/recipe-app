import { supabase } from '../config/database.js';

/**
 * Middleware de autenticação.
 * Extrai o token JWT do header Authorization (Bearer token)
 * e verifica-o contra o Supabase Auth.
 *
 * Se válido, anexa o user object a req.user.
 * Se inválido ou ausente, retorna 401.
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token not provided.',
      });
    }

    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error?.message || 'Invalid or expired token.',
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth] Middleware error:', err.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication check failed.',
    });
  }
}

export default authMiddleware;
