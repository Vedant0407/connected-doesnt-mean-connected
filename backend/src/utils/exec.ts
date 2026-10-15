import { spawn } from 'child_process';
import { Logger } from './logger.js';

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
}

/**
 * Safely execute an external binary with explicit argument array and timeout.
 * Does not invoke a shell interpreter to prevent shell injection attacks.
 */
export async function safeExec(
  command: string,
  args: string[],
  timeoutMs: number = 8000
): Promise<ExecResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let finished = false;

    Logger.debug(`Executing safe command: ${command} ${args.join(' ')} (timeout: ${timeoutMs}ms)`);

    let proc: ReturnType<typeof spawn>;
    try {
      proc = spawn(command, args, {
        shell: false,
        windowsHide: true,
      });
    } catch (err: any) {
      Logger.error(`Failed to spawn process ${command}: ${err.message}`);
      return resolve({
        stdout: '',
        stderr: err.message || 'Spawn error',
        exitCode: 1,
        timedOut: false,
        durationMs: Date.now() - startTime,
      });
    }

    const timer = setTimeout(() => {
      if (!finished) {
        timedOut = true;
        finished = true;
        try {
          proc.kill('SIGKILL');
        } catch {
          // ignore kill errors
        }
        resolve({
          stdout,
          stderr: `${stderr}\nProcess timed out after ${timeoutMs}ms`,
          exitCode: null,
          timedOut: true,
          durationMs: Date.now() - startTime,
        });
      }
    }, timeoutMs);

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: `${stderr}\nProcess execution error: ${err.message}`,
          exitCode: 1,
          timedOut: false,
          durationMs: Date.now() - startTime,
        });
      }
    });

    proc.on('close', (code) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: code,
          timedOut: false,
          durationMs: Date.now() - startTime,
        });
      }
    });
  });
}
