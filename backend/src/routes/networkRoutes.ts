import { Router } from 'express';
import { NetworkController } from '../controllers/networkController.js';

export const networkRoutes = Router();

networkRoutes.get('/network/interfaces', NetworkController.getInterfaces);
