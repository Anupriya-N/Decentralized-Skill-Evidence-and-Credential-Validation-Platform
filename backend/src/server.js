import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';

async function bootstrap() {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 CertiTrust Backend Server running in ${env.NODE_ENV} mode`);
    console.log(`📡 Base API URL: http://localhost:${env.PORT}/api/v1`);
    console.log(`🩺 Health check: http://localhost:${env.PORT}/health`);
  });

  const handleShutdown = () => {
    console.log('\nGracefully shutting down CertiTrust server...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}

bootstrap().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
