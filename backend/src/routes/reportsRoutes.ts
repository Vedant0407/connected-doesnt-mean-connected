import { Router } from 'express';
import { ReportsController } from '../controllers/reportsController.js';

export const reportsRoutes = Router();

reportsRoutes.post('/reports/export', ReportsController.exportReport);
