/**
 * System information utilities for retrieving system data
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SecurityManager } from './securityManager.js';

// Promisify exec for async usage
const execAsync = promisify(exec);

/**
 * Handles system information retrieval and command execution
 */
export class SystemInfoManager {
  private securityManager: SecurityManager;

  /**
   * Initialize the system info manager
   * @param securityManager Security manager for command validation
   */
  constructor(securityManager: SecurityManager) {
    this.securityManager = securityManager;
  }

  /**
   * Get system information
   * @param detail Level of detail (basic or full)
   * @returns System information as formatted string
   */
  async getSystemInfo(detail: string = 'basic'): Promise<string> {
    try {
      if (detail === 'full') {
        const { stdout } = await execAsync('systeminfo');
        return stdout;
      } else {
        // Basic system info
        const hostname = os.hostname();
        const osType = os.type();
        const osRelease = os.release();
        const osArch = os.arch();
        const cpuInfo = os.cpus()[0]?.model || 'Unknown CPU';
        const totalMemory = Math.round(os.totalmem() / (1024 * 1024 * 1024));
        const freeMemory = Math.round(os.freemem() / (1024 * 1024 * 1024));
        
        return `\nSystem Information:\nHostname: ${hostname}\nOS: ${osType} ${osRelease} (${osArch})\nCPU: ${cpuInfo}\nMemory: ${freeMemory}GB free of ${totalMemory}GB\nUptime: ${Math.floor(os.uptime() / 3600)} hours ${Math.floor((os.uptime() % 3600) / 60)} minutes\nUser: ${os.userInfo().username}\n        `.trim();
      }
    } catch (error) {
      throw new Error(`Failed to retrieve system information: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get network information
   * @param networkInterface Optional interface name to filter results
   * @returns Network information as formatted string
   */
  async getNetworkInfo(networkInterface?: string): Promise<string> {
    try {
      if (networkInterface) {
        // Get info for specific interface
        const { stdout } = await execAsync(`ipconfig /all | find \"${networkInterface}\" /i`);
        return stdout || `Interface \"${networkInterface}\" not found`;
      } else {
        // Get basic network info
        const { stdout } = await execAsync('ipconfig');
        return stdout;
      }
    } catch (error) {
      throw new Error(`Failed to retrieve network information: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List running processes
   * @param filter Optional filter string to match process names
   * @returns Process list as string
   */
  async listRunningProcesses(filter?: string): Promise<string> {
    try {
      const command = filter 
        ? `tasklist | findstr /i \"${filter}\"`
        : 'tasklist';
        
      const { stdout } = await execAsync(command);
      return stdout || 'No matching processes found';
    } catch (error) {
      throw new Error(`Failed to list processes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get information about Windows services
   * @param action Action to perform (query or status)
   * @param serviceName Optional service name to filter
   * @returns Service information as string
   */
  async getServiceInfo(action: string = 'query', serviceName?: string): Promise<string> {
    try {
      let command: string;
      
      if (action === 'query') {
        command = serviceName 
          ? `sc query \"${serviceName}\"`
          : `sc query state= all`;
      } else if (action === 'status' && serviceName) {
        command = `sc query \"${serviceName}\"`;
      } else {
        throw new Error('Invalid service action or missing service name');
      }
      
      const { stdout } = await execAsync(command);
      return stdout || 'No service information found';
    } catch (error) {
      throw new Error(`Failed to get service info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get information about scheduled tasks
   * @param action Action to perform (query or status)
   * @param taskName Optional task name to filter
   * @returns Task information as string
   */
  async getScheduledTasks(action: string = 'query', taskName?: string): Promise<string> {
    try {
      let command: string;
      
      if (action === 'query') {
        command = taskName 
          ? `schtasks /query /tn \"${taskName}\" /fo list /v`
          : `schtasks /query /fo list /v`;
      } else if (action === 'status' && taskName) {
        command = `schtasks /query /tn \"${taskName}\" /fo list /v`;
      } else {
        throw new Error('Invalid task action or missing task name');
      }
      
      const { stdout } = await execAsync(command);
      return stdout || 'No scheduled task information found';
    } catch (error) {
      throw new Error(`Failed to get scheduled task info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a Windows command
   * @param command Command to execute
   * @param timeout Timeout in milliseconds
   * @param workingDir Optional working directory
   * @returns Command output as string
   */
  async executeCommand(command: string, timeout: number = 30000, workingDir?: string): Promise<string> {
    // Validate command
    const validation = this.securityManager.validateCommand(command);
    if (!validation.isValid) {
      throw new Error(validation.reason);
    }

    try {
      // Execute with optional working directory
      const options: any = { timeout };
      if (workingDir) {
        options.cwd = workingDir;
      }
      
      const { stdout, stderr } = await execAsync(command, options);
      if (stderr) {
        console.error(`Command stderr: ${stderr}`);
      }
      return stdout || 'Command executed successfully (no output)';
    } catch (error) {
      throw new Error(`Command execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a PowerShell script
   * @param script PowerShell script content
   * @param timeout Timeout in milliseconds
   * @param workingDir Optional working directory
   * @returns Script output as string
   */
  async executePowerShell(script: string, timeout: number = 30000, workingDir?: string): Promise<string> {
    // Validate PowerShell is allowed
    const validation = this.securityManager.validateCommand('powershell');
    if (!validation.isValid) {
      throw new Error(validation.reason);
    }

    // Create a temporary script file
    const tempScriptPath = path.join(os.tmpdir(), `ps_script_${Date.now()}.ps1`);
    
    try {
      // Use synchronous file writing to avoid TypeScript Buffer issues
      fs.writeFileSync(tempScriptPath, script, 'utf8');
      
      // Execute PowerShell with script file
      const command = `powershell -ExecutionPolicy Bypass -File \"${tempScriptPath}\"`;
      const options: any = { timeout };
      if (workingDir) {
        options.cwd = workingDir;
      }
      
      const { stdout, stderr } = await execAsync(command, options);
      if (stderr) {
        console.error(`PowerShell stderr: ${stderr}`);
      }
      return stdout || 'PowerShell script executed successfully (no output)';
    } catch (error) {
      throw new Error(`PowerShell execution failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Clean up temporary file
      try {
        fs.unlinkSync(tempScriptPath);
      } catch (e) {
        console.error(`Failed to remove temp script: ${e}`);
      }
    }
  }
}
