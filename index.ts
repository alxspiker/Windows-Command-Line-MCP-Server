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
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

// Enhanced allowed commands
const DEFAULT_SAFE_COMMANDS = [
  // Original safe commands
  'dir', 'echo', 'whoami', 'hostname', 'systeminfo', 'ver',
  'ipconfig', 'ping', 'tasklist', 'time', 'date', 'type',
  'find', 'findstr', 'where', 'help', 'netstat', 'sc',
  'schtasks', 'powershell', 'powershell.exe',
  
  // Development tool commands
  'npm', 'yarn', 'node', 'git', 'code', 
  'python', 'pip', 'nvm', 'pnpm'
];

// Dangerous commands that are always blocked
const DANGEROUS_COMMANDS = [
  'format', 'del', 'rm', 'rmdir', 'rd', 'diskpart',
  'net user', 'attrib', 'reg delete', 'shutdown', 'logoff'
];

// Safe project creation configuration
const SAFE_PROJECT_ROOT = path.join(os.homedir(), 'AIProjects');

// Security and validation utilities
class SecurityManager {
  private allowedCommands: string[];
  private allowUnsafeCommands: boolean;

  constructor(allowedCommands?: string[], allowUnsafe = false) {
    this.allowedCommands = allowedCommands || DEFAULT_SAFE_COMMANDS;
    this.allowUnsafeCommands = allowUnsafe;
  }

  validateCommand(command: string): { isValid: boolean; reason?: string } {
    // If unsafe mode, only block truly dangerous commands
    if (this.allowUnsafeCommands) {
      for (const dangerous of DANGEROUS_COMMANDS) {
        if (command.toLowerCase().includes(dangerous.toLowerCase())) {
          return { 
            isValid: false, 
            reason: `Blocked dangerous operation: ${dangerous}` 
          };
        }
      }
      return { isValid: true };
    }

    // Check if the command starts with any of the allowed commands
    const commandBase = command.split(' ')[0].toLowerCase();
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
        
        return `
System Information:
Hostname: ${hostname}
OS: ${osType} ${osRelease} (${osArch})
CPU: ${cpuInfo}
Memory: ${freeMemory}GB free of ${totalMemory}GB
Uptime: ${Math.floor(os.uptime() / 3600)} hours ${Math.floor((os.uptime() % 3600) / 60)} minutes
User: ${os.userInfo().username}
        `.trim();
      }
    } catch (error) {
      throw new Error(`Failed to retrieve system information: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getNetworkInfo(networkInterface?: string): Promise<string> {
    try {
      if (networkInterface) {
        // Get info for specific interface
        const { stdout } = await execAsync(`ipconfig /all | find "${networkInterface}" /i`);
        return stdout || `Interface "${networkInterface}" not found`;
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
        ? `tasklist | findstr /i "${filter}"`
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
          ? `sc query "${serviceName}"`
          : `sc query state= all`;
      } else if (action === 'status' && serviceName) {
        command = `sc query "${serviceName}"`;
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
          ? `schtasks /query /tn "${taskName}" /fo list /v`
          : `schtasks /query /fo list /v`;
      } else if (action === 'status' && taskName) {
        command = `schtasks /query /tn "${taskName}" /fo list /v`;
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
      // Write script to temp file
      await writeFileAsync(tempScriptPath, script);
      
      // Execute PowerShell with script file
      const command = `powershell -ExecutionPolicy Bypass -File "${tempScriptPath}"`;
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
  const allowUnsafe = args.includes('--allow-all');
  const customAllowedCommands = args.filter(arg => !arg.startsWith('--'));

  // Initialize security manager
  const securityManager = new SecurityManager(
    customAllowedCommands.length > 0 ? customAllowedCommands : undefined, 
    allowUnsafe
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
  );

  // List of available tools
  const availableTools = [
    {
      name: "create_project",
      description: "Create a new project with safe, predefined templates",
      inputSchema: zodToJsonSchema(
        z.object({
          type: z.string().describe('Project type (react, node, python)'),
          name: z.string().describe('Project name'),
          template: z.string().optional().describe('Optional project template')
        })
      )
    },
    {
      name: "execute_command",
      description: "Execute a Windows command and return its output. Only commands in the allowed list can be executed. This tool should be used for running simple commands like 'dir', 'echo', etc.",
      inputSchema: zodToJsonSchema(
        z.object({
          command: z.string().describe('The command to execute'),
          timeout: z.number().optional().default(30000).describe('Timeout in milliseconds'),
          workingDir: z.string().optional().describe('Working directory for the command')
        })
      )
    },
    {
      name: "execute_powershell",
      description: "Execute a PowerShell script and return its output. This allows for more complex operations and script execution. PowerShell must be in the allowed commands list.",
      inputSchema: zodToJsonSchema(
        z.object({
          script: z.string().describe('PowerShell script to execute'),
          timeout: z.number().optional().default(30000).describe('Timeout in milliseconds'),
          workingDir: z.string().optional().describe('Working directory for the script')
        })
      )
    },
    {
      name: "list_running_processes",
      description: "List all running processes on the system. Can be filtered by providing an optional filter string that will match against process names.",
      inputSchema: zodToJsonSchema(
        z.object({
          filter: z.string().optional().describe('Optional filter string to match against process names')
        })
      )
    },
    {
      name: "get_system_info",
      description: "Retrieve system information including OS, hardware, and user details. Can provide basic or full details.",
      inputSchema: zodToJsonSchema(
        z.object({
          detail: z.enum(['basic', 'full']).optional().default('basic').describe('Level of detail')
        })
      )
    },
    {
      name: "get_network_info",
      description: "Retrieve network configuration information including IP addresses, adapters, and DNS settings. Can be filtered to a specific interface.",
      inputSchema: zodToJsonSchema(
        z.object({
          networkInterface: z.string().optional().describe('Optional interface name to filter results')
        })
      )
    },
    {
      name: "get_scheduled_tasks",
      description: "Retrieve information about scheduled tasks on the system. Can query all tasks or get detailed status of a specific task.",
      inputSchema: zodToJsonSchema(
        z.object({
          action: z.enum(['query', 'status']).optional().default('query').describe('Action to perform'),
          taskName: z.string().optional().describe('Name of the specific task (optional)')
        })
      )
    },
    {
      name: "get_service_info",
      description: "Retrieve information about Windows services. Can query all services or get detailed status of a specific service.",
      inputSchema: zodToJsonSchema(
        z.object({
          action: z.enum(['query', 'status']).optional().default('query').describe('Action to perform'),
          serviceName: z.string().optional().describe('Service name to get info about (optional)')
        })
      )
    },
    {
      name: "list_allowed_commands",
      description: "List all commands that are allowed to be executed by this server. This helps understand what operations are permitted.",
      inputSchema: zodToJsonSchema(
        z.object({})
      )
    }
  ];

  // Set up request handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: availableTools
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "create_project": {
          const parsed = z.object({
            type: z.string(),
            name: z.string(),
            template: z.string().optional()
          }).safeParse(args);

          if (!parsed.success) {
            throw new Error(`Invalid arguments: ${parsed.error}`);
          }
          const { type, name, template } = parsed.data;
          const projectPath = await projectManager.createProject(type, name, template);
          return {
            content: [{ 
              type: "text", 
              text: `Project created successfully at: ${projectPath}` 
            }]
          };
        }

        case "execute_command": {
          const parsed = z.object({
            command: z.string(),
            timeout: z.number().optional().default(30000),
            workingDir: z.string().optional()
          }).safeParse(args);

          if (!parsed.success) {
            throw new Error(`Invalid arguments: ${parsed.error}`);
          }
          
          const { command, timeout, workingDir } = parsed.data;
          const output = await systemInfoManager.executeCommand(command, timeout, workingDir);
          
          return {
            content: [{ 
              type: "text", 
              text: output 
            }]
          };
        }

        case "execute_powershell": {
          const parsed = z.object({
            script: z.string(),
            timeout: z.number().optional().default(30000),
            workingDir: z.string().optional()
          }).safeParse(args);

          if (!parsed.success) {
            throw new Error(`Invalid arguments: ${parsed.error}`);
          }
          
          const { script, timeout, workingDir } = parsed.data;
          const output = await systemInfoManager.executePowerShell(script, timeout, workingDir);
          
          return {
            content: [{ 
              type: "text", 
              text: output 
            }]
          };
        }

        case "list_running_processes": {
          const parsed = z.object({
            filter: z.string().optional()
          }).safeParse(args);

          if (!parsed.success) {
            throw new Error(`Invalid arguments: ${parsed.error}`);
          }
          
          const { filter } = parsed.data;
          const output = await systemInfoManager.listRunningProcesses(filter);
          
          return {
            content: [{ 
              type: "text", 
              text: output 
            }]
          };
        }

        case "get_system_info": {
          const parsed = z.object({
            detail: z.enum(['basic', 'full']).optional().default('basic')
          }).safeParse(args);

          if (!parsed.success) {
            throw new Error(`Invalid arguments: ${parsed.error}`);
          }
          
          const { detail } = parsed.data;
          const output = await systemInfoManager.getSystemInfo(detail);
          
          return {
            content: [{ 
              type: "text", 
              text: output 
            }]
          };
        }

        case "get_network_info": {
          const parsed = z.object({
            networkInterface: z.string().optional()
          }).safeParse(args);

          if (!parsed.success) {
            throw new Error(`Invalid arguments: ${parsed.error}`);
          }
          
          const { networkInterface } = parsed.data;
          const output = await systemInfoManager.getNetworkInfo(networkInterface);
          
          return {
            content: [{ 
              type: "text", 
              text: output 
            }]
          };
        }

        case "get_scheduled_tasks": {
          const parsed = z.object({
            action: z.enum(['query', 'status']).optional().default('query'),
            taskName: z.string().optional()
          }).safeParse(args);

          if (!parsed.success) {
            throw new Error(`Invalid arguments: ${parsed.error}`);
          }
          
          const { action, taskName } = parsed.data;
          const output = await systemInfoManager.getScheduledTasks(action, taskName);
          
          return {
            content: [{ 
              type: "text", 
              text: output 
            }]
          };
        }

        case "get_service_info": {
          const parsed = z.object({
            action: z.enum(['query', 'status']).optional().default('query'),
            serviceName: z.string().optional()
          }).safeParse(args);

          if (!parsed.success) {
            throw new Error(`Invalid arguments: ${parsed.error}`);
          }
          
          const { action, serviceName } = parsed.data;
          const output = await systemInfoManager.getServiceInfo(action, serviceName);
          
          return {
            content: [{ 
              type: "text", 
              text: output 
            }]
          };
        }

        case "list_allowed_commands": {
          const allowedCommands = securityManager.getAllowedCommands();
          
          return {
            content: [{ 
              type: "text", 
              text: `Allowed commands:\n${allowedCommands.join('\n')}` 
            }]
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  });

  return server;
}

// Run the server
async function runServer() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  console.error("Enhanced Windows Command Line Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
