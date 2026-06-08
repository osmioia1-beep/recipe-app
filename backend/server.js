import express from 'express';
import cors from 'cors';
import { resolvePoolerIPv4 } from './config/database.js';
import recipesRouter from './routes/recipes.js';
import pantryRouter from './routes/pantry.js';
import mealplansRouter from './routes/mealplans.js';
import matchingRouter from './routes/matching.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ─────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request logging ───────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ─── Health check (public) ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'recipe-app-backend',
  });
});

// ─── Register route modules ────────────────────────────────────────────
// Each module receives `app` and registers its own routes with appropriate auth
recipesRouter(app);
pantryRouter(app);
mealplansRouter(app);
matchingRouter(app);

// ─── 404 handler ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ─── Global error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Start server ─────────────────────────────────────────────────────
async function start() {
  // Pre-resolve IPv4 for the pooler
  await resolvePoolerIPv4();

  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║        🍳 Recipe App Backend v1.0.0          ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Server running on http://0.0.0.0:${PORT}      ║`);
    console.log(`║  Environment: ${process.env.NODE_ENV || 'development'}                  ║`);
    console.log('║                                              ║');
    console.log('║  Endpoints:                                  ║');
    console.log('║    GET    /api/health                        ║');
    console.log('║    GET    /api/recipes          (public)     ║');
    console.log('║    GET    /api/recipes/:id      (public)     ║');
    console.log('║    POST   /api/recipes          (auth)       ║');
    console.log('║    PUT    /api/recipes/:id      (auth)       ║');
    console.log('║    DELETE /api/recipes/:id      (auth)       ║');
    console.log('║    GET    /api/pantry           (auth)       ║');
    console.log('║    POST   /api/pantry           (auth)       ║');
    console.log('║    PUT    /api/pantry/:id       (auth)       ║');
    console.log('║    DELETE /api/pantry/:id       (auth)       ║');
    console.log('║    GET    /api/mealplans        (auth)       ║');
    console.log('║    POST   /api/mealplans        (auth)       ║');
    console.log('║    DELETE /api/mealplans/:id    (auth)       ║');
    console.log('║    GET    /api/matching         (auth)       ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
  });
}

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});

export default app;
