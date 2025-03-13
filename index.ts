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

  // Create MCP Server
  const server = new Server(
    {
      name: "windows-commandline-server",
      version: "0.2.0", // Updated version
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Schema definitions for new tools
  const CreateProjectSchema = z.object({
    type: z.string().describe('Project type (react, node, python)'),
    name: z.string().describe('Project name'),
    template: z.string().optional().describe('Optional project template')
  });

  // Set up request handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const baseTool = (await server.capabilities.tools) || {};
    return {
      tools: [
        ...Object.values(baseTool),
        {
          name: "create_project",
          description: "Create a new project with safe, predefined templates",
          inputSchema: zodToJsonSchema(CreateProjectSchema)
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "create_project": {
          const parsed = CreateProjectSchema.safeParse(args);
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

        default:
          // Fallback to existing tool handlers (from previous implementation)
          // (Previous tool handling code would go here)
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
