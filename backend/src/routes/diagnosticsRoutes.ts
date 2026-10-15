import { Router } from 'express';
import { DiagnosticsController } from '../controllers/diagnosticsController.js';

export const diagnosticsRoutes = Router();

diagnosticsRoutes.post('/diagnostics/run', DiagnosticsController.runDiagnostics);
diagnosticsRoutes.get('/diagnostics/history', DiagnosticsController.getHistory);
diagnosticsRoutes.post('/diagnostics/compare', DiagnosticsController.compareRuns);
diagnosticsRoutes.get('/diagnostics/:id', DiagnosticsController.getById);
diagnosticsRoutes.delete('/diagnostics/:id', DiagnosticsController.deleteById);
