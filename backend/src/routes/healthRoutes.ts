import { Router } from 'express';
import { HealthController } from '../controllers/healthController.js';

export const healthRoutes = Router();

healthRoutes.get('/health', HealthController.getHealth);
healthRoutes.get('/tools/status', HealthController.getToolsStatus);
