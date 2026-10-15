import { Request, Response } from 'express';
import { ScenarioService } from '../services/scenarioService.js';
import { DatabaseService } from '../services/databaseService.js';

export class ScenariosController {
  public static getAll(_req: Request, res: Response): Promise<void> {
    const list = ScenarioService.getAllScenarios();
    res.json(list);
    return Promise.resolve();
  }

  public static getById(req: Request, res: Response): Promise<void> {
    const scenario = ScenarioService.getScenarioById(req.params.id);
    if (!scenario) {
      res.status(404).json({ error: `Scenario "${req.params.id}" not found` });
      return Promise.resolve();
    }
    res.json(scenario);
    return Promise.resolve();
  }

  public static async simulate(req: Request, res: Response): Promise<void> {
    const scenario = ScenarioService.getScenarioById(req.params.id);
    if (!scenario) {
      res.status(404).json({ error: `Scenario "${req.params.id}" not found` });
      return;
    }

    // Save simulation run to history so user can inspect or export it
    await DatabaseService.saveRecord(scenario.precomputedDiagnosis, `SIMULATION_${scenario.id}`);

    res.json({
      scenario,
      diagnosis: scenario.precomputedDiagnosis,
      topology: scenario.topologyNodes,
    });
  }
}
