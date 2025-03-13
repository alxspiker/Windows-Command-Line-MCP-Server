#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// Promisify exec and other async operations
const execAsync = promisify(exec);
const mkdirAsync = promisify(fs.mkdir);

// Default allowed commands
const DEFAULT_ALLOWED_COMMANDS = [
  // System information commands
  'dir', 'echo', 'whoami', 'hostname', 'systeminfo', 'ver',
  'ipconfig', 'ping', 'tasklist', 'time', 'date', 'type',
  'find', 'findstr', 'where', 'help', 'netstat', 'sc',
  'schtasks', 'powershell', 'powershell.exe',
  
  // Development tool commands
  'npm', 'yarn', 'node', 'git', 'code', 
  'python', 'pip', 'nvm', 'pnpm'
];

// Load configuration from file if exists
function loadConfiguration(): { allowedCommands?: string[] } {
  const configPath = path.join(process.cwd(), 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      console.error(`Failed to load config file: ${error}`);
    }
  }
  return {};
}

// Security and validation utilities
class SecurityManager {
  private allowedCommands: string[];

  constructor(allowedCommands?: string[]) {
    // Use provided commands, config file commands, or defaults (in that order of priority)
    const config = loadConfiguration();
    this.allowedCommands = allowedCommands || 
                          config.allowedCommands || 
                          DEFAULT_ALLOWED_COMMANDS;
  }

  validateCommand(command: string): { isValid: boolean; reason?: string } {
    // Extract the base command (before any arguments)
    const commandBase = command.split(' ')[0].toLowerCase();
    
    // Check if the command is in the allowed list
    if (!this.allowedCommands.some(cmd => commandBase === cmd.toLowerCase())) {
      return { 
        isValid: false, 
        reason: `Command '${commandBase}' is not in the allowed list` 
      };
    }

    return { isValid: true };
  }

  getAllowedCommands(): string[] {
    return this.allowedCommands;
  }
}

// Project Creation Utility
class ProjectManager {
  private securityManager: SecurityManager;

  constructor(securityManager: SecurityManager) {
    this.securityManager = securityManager;
  }

  async createProject(type: string, name: string, template?: string): Promise<string> {
    // Validate project name and type
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error('Invalid project name. Use only alphanumeric characters, underscores, and hyphens.');
    }

    // Ensure safe project root exists
    await this.ensureSafeProjectRoot();

    const projectPath = path.join(SAFE_PROJECT_ROOT, name);

    // Prevent overwriting existing projects
    if (fs.existsSync(projectPath)) {
      throw new Error(`Project '${name}' already exists.`);
    }

    try {
      // Create project directory
      await mkdirAsync(projectPath, { recursive: true });

      // Project creation based on type
      switch (type.toLowerCase()) {
        case 'react':
          await this.createReactProject(projectPath, template);
          break;
        case 'node':
          await this.createNodeProject(projectPath, template);
          break;
        case 'python':
          await this.createPythonProject(projectPath, template);
          break;
        default:
          throw new Error(`Unsupported project type: ${type}`);
      }

      return projectPath;
    } catch (error) {
      // Clean up partially created project
      try {
        await fs.promises.rm(projectPath, { recursive: true, force: true });
      } catch {}
      throw error;
    }
  }

  private async ensureSafeProjectRoot() {
    await mkdirAsync(SAFE_PROJECT_ROOT, { recursive: true });
  }

  private async createReactProject(projectPath: string, template?: string) {
    const createCommand = template 
      ? `npx create-react-app ${projectPath} --template ${template}`
      : `npx create-react-app ${projectPath}`;
    
    await this.runSafeCommand(createCommand);
  }

  private async createNodeProject(projectPath: string, template?: string) {
    // Initialize with npm
    await this.runSafeCommand(`cd ${projectPath} && npm init -y`);
    
    // Add optional template dependencies
    if (template) {
      await this.runSafeCommand(`cd ${projectPath} && npm install ${template}`);
    }
  }

  private async createPythonProject(projectPath: string, template?: string) {
    // Create virtual environment
    await this.runSafeCommand(`cd ${projectPath} && python -m venv venv`);
    
    // Optional template or initial package
    if (template) {
      await this.runSafeCommand(`cd ${projectPath} && venv/Scripts/pip install ${template}`);
    }
  }

  private async runSafeCommand(command: string) {
    // Validate and execute command
    const validation = this.securityManager.validateCommand(command.split(' ')[0]);
    if (!validation.isValid) {
      throw new Error(validation.reason);
    }

    return execAsync(command);
  }
}

// Safe project creation configuration
const SAFE_PROJECT_ROOT = path.join(os.homedir(), 'AIProjects');

// System Information Utility
class SystemInfoManager {
  private securityManager: SecurityManager;

  constructor(securityManager: SecurityManager) {
    this.securityManager = securityManager;
  }

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

  async executePowerShell(script: string, timeout: number = 30000, workingDir?: string): Promise<string> {
    // Validate PowerShell is allowed
    const validation = this.securityManager.validateCommand('powershell');
    if (!validation.isValid) {
      throw new Error(validation.reason);
    }

    // Create a temporary script file
    const tempScriptPath = path.join(os.tmpdir(), `ps_script_${Date.now()}.ps1`);
    
    try {
      // Skip async file operations that cause TypeScript errors - use sync version instead
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

// Main Server Setup
function createMCPServer() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const customAllowedCommands = args.filter(arg => !arg.startsWith('--'));

  // Initialize security manager with custom allowed commands
  const securityManager = new SecurityManager(
    customAllowedCommands.length > 0 ? customAllowedCommands : undefined
  );

  // Initialize project manager
  const projectManager = new ProjectManager(securityManager);
  
  // Initialize system info manager
  const systemInfoManager = new SystemInfoManager(securityManager);

  // Create MCP Server with correct initialization
  const server = new Server(
    {
      name: "windows-commandline-server",
      version: "0.3.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }