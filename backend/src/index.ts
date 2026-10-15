import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';
import { Logger } from './utils/logger.js';
import { detectTshark } from './analyzers/tsharkDetector.js';

const PORT = parseInt(process.env.PORT || '5001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  const tsharkStatus = await detectTshark();
  Logger.info(`Tool Check: ${tsharkStatus.diagnosticNotice}`);

  app.listen(PORT, HOST, () => {
    Logger.info(`Backend Diagnostic Engine listening on http://localhost:${PORT}`);
    Logger.info(`Health check available at http://localhost:${PORT}/api/health`);
    Logger.info(`TShark/Wireshark status: ${tsharkStatus.backendParser}`);
  });
}

bootstrap().catch((err) => {
  Logger.error(`Fatal startup error: ${err.message}`, err.stack);
  process.exit(1);
});
