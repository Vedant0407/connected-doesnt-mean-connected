import { Router } from 'express';
import { LabController } from '../controllers/labController.js';

export const labRoutes = Router();

labRoutes.post('/lab/vlsm', LabController.calculateVlsm);
labRoutes.get('/lab/configs', LabController.listConfigs);
labRoutes.get('/lab/configs/:filename', LabController.getConfigContent);
labRoutes.post('/lab/compare', LabController.compareLabEvidence);
