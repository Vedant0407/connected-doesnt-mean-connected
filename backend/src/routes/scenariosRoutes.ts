import { Router } from 'express';
import { ScenariosController } from '../controllers/scenariosController.js';

export const scenariosRoutes = Router();

scenariosRoutes.get('/scenarios', ScenariosController.getAll);
scenariosRoutes.get('/scenarios/:id', ScenariosController.getById);
scenariosRoutes.post('/scenarios/:id/simulate', ScenariosController.simulate);
