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
import path from 'path';

// Promisify exec
const execAsync = promisify(exec);

// Get allowed commands from command line args
const args = process.argv.slice(2);
let allowedCommands: string[] = [];
let allowUnsafeCommands = false;

// Process command line arguments
if (args.includes('--allow-all')) {
  allowUnsafeCommands = true;
  console.error('WARNING: Running in unsafe mode. All commands are allowed.');
} else if (args.length === 0) {
  // Default safe commands
  allowedCommands = [
    'dir', 'echo', 'whoami', 'hostname', 'systeminfo', 'ver',
    'ipconfig', 'ping', 'tasklist', 'time', 'date', 'type',
    'find', 'findstr', 'where', 'help', 'netstat', 'sc',
    'schtasks', 'powershell', 'powershell.exe'
  ];
  console.error('No commands specified. Using default safe commands list.');
} else {
  // Use the provided list of allowed commands
  allowedCommands = args;
  console.error('Using provided list of allowed commands:', allowedCommands);
}

// Unsafe commands that should never be allowed
const dangerousCommands = [
  'format', 'del', 'rm', 'rmdir', 'rd', 'diskpart',
  'net user', 'attrib', 'reg delete', 'shutdown', 'logoff'
];

// Security utility to validate a command
function validateCommand(command: string): { isValid: boolean; reason?: string } {
  // If unsafe commands are allowed, only block dangerous commands
  if (allowUnsafeCommands) {
    for (const dangerous of dangerousCommands) {
      if (command.toLowerCase().includes(dangerous.toLowerCase())) {
        return { isValid: false, reason: `Command contains dangerous operation: ${dangerous}` };
      }
    }
    return { isValid: true };
  }

  // Check if the command starts with any of the allowed commands
  const commandBase = command.split(' ')[0].toLowerCase();
  if (!allowedCommands.some(cmd => commandBase === cmd.toLowerCase())) {
    return { isValid: false, reason: `Command '${commandBase}' is not in the allowed list` };
  }

  return { isValid: true };
}

// Schema definitions
const ExecuteCommandArgsSchema = z.object({
  command: z.string().describe('The command to execute'),
  workingDir: z.string().optional().describe('Working directory for the command'),
  timeout: z.number().optional().default(30000).describe('Timeout in milliseconds'),
});

const ExecutePowerShellArgsSchema = z.object({
  script: z.string().describe('PowerShell script to execute'),
  workingDir: z.string().optional().describe('Working directory for the script'),
  timeout: z.number().optional().default(30000).describe('Timeout in milliseconds'),
});

const ListRunningProcessesArgsSchema = z.object({
  filter: z.string().optional().describe('Optional filter string to match against process names'),
});

const GetSystemInfoArgsSchema = z.object({
  detail: z.enum(['basic', 'full']).optional().default('basic').describe('Level of detail'),
});

const NetworkInfoArgsSchema = z.object({
  interface: z.string().optional().describe('Optional interface name to filter results'),
});

const ScheduledTasksArgsSchema = z.object({
  action: z.enum(['query', 'status']).optional().default('query').describe('Action to perform'),
  taskName: z.string().optional().describe('Name of the specific task (optional)'),
});

const ServiceInfoArgsSchema = z.object({
  serviceName: z.string().optional().describe('Service name to get info about (optional)'),
  action: z.enum(['query', 'status']).optional().default('query').describe('Action to perform'),
});

// Tool implementation handlers
async function executeCommand(command: string, workingDir?: string, timeout: number = 30000): Promise<string> {
  const validation = validateCommand(command);
  if (!validation.isValid) {
    throw new Error(`Command validation failed: ${validation.reason}`);
  }

  try {
    const options: any = { timeout };
    if (workingDir) {
      options.cwd = workingDir;
    }

    const { stdout, stderr } = await execAsync(command, options);
    if (stderr) {
      return `Command output:\n${stdout.toString()}\n\nErrors/Warnings:\n${stderr.toString()}`;
    }
    return stdout.toString();
  } catch (error: any) {
    if (error.code === 'ETIMEDOUT') {
      throw new Error(`Command timed out after ${timeout}ms`);
    }
    throw new Error(`Command failed: ${error.message}`);
  }
}

async function executePowerShell(script: string, workingDir?: string, timeout: number = 30000): Promise<string> {
  const validation = validateCommand('powershell');
  if (!validation.isValid) {
    throw new Error(`PowerShell execution failed: ${validation.reason}`);
  }

  // Replace smart quotes with straight quotes if present
  script = script.replace(/[""]/g, '"').replace(/['']/g, "'");

  try {
    const options: any = { timeout };
    if (workingDir) {
      options.cwd = workingDir;
    }

    // Escape script properly for PowerShell execution
    const escapedScript = script.replace(/"/g, '\\"');
    const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${escapedScript}"`;
    
    const { stdout, stderr } = await execAsync(command, options);
    if (stderr) {
      return `PowerShell output:\n${stdout.toString()}\n\nErrors/Warnings:\n${stderr.toString()}`;
    }
    return stdout.toString();
  } catch (error: any) {
    if (error.code === 'ETIMEDOUT') {
      throw new Error(`PowerShell script timed out after ${timeout}ms`);
    }
    throw new Error(`PowerShell execution failed: ${error.message}`);
  }
}

async function getRunningProcesses(filter?: string): Promise<string> {
  try {
    let command = 'tasklist /FO LIST';
    if (filter) {
      // Add filter using findstr
      command += ` | findstr /i "${filter}"`;
    }
    
    const { stdout } = await execAsync(command);
    return stdout.toString();
  } catch (error: any) {
    throw new Error(`Failed to get process list: ${error.message}`);
  }
}

async function getSystemInfo(detail: 'basic' | 'full' = 'basic'): Promise<string> {
  try {
    if (detail === 'basic') {
      const { stdout: sysInfo } = await execAsync('systeminfo /FO LIST | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Manufacturer" /C:"System Model" /C:"System Type" /C:"Processor(s)" /C:"Total Physical Memory"');
      const { stdout: computerName } = await execAsync('hostname');
      const { stdout: username } = await execAsync('whoami');
      
      return `System Information:\n${sysInfo.toString()}\nComputer Name: ${computerName.toString().trim()}\nCurrent User: ${username.toString().trim()}`;
    } else {
      const { stdout } = await execAsync('systeminfo /FO LIST');
      return stdout.toString();
    }
  } catch (error: any) {
    throw new Error(`Failed to get system information: ${error.message}`);
  }
}

async function getNetworkInfo(interfaceName?: string): Promise<string> {
  try {
    let command = 'ipconfig /all';
    
    if (interfaceName) {
      // We'll get all info and filter it
      const { stdout } = await execAsync(command);
      const stdoutStr = stdout.toString();
      
      // Split by double newline to get each interface section
      const sections = stdoutStr.split('\r\n\r\n');
      const matchedSections = sections.filter(section => 
        section.toLowerCase().includes(interfaceName.toLowerCase())
      );
      
      if (matchedSections.length === 0) {
        return `No network interface found matching "${interfaceName}"`;
      }
      
      return matchedSections.join('\r\n\r\n');
    } else {
      const { stdout } = await execAsync(command);
      return stdout.toString();
    }
  } catch (error: any) {
    throw new Error(`Failed to get network information: ${error.message}`);
  }
}

async function getScheduledTasksInfo(action: 'query' | 'status' = 'query', taskName?: string): Promise<string> {
  try {
    let command: string;
    
    if (action === 'query') {
      if (taskName) {
        command = `schtasks /Query /FO LIST /V /TN "${taskName}"`;
      } else {
        command = 'schtasks /Query /FO TABLE';
      }
    } else { // status
      if (!taskName) {
        throw new Error('Task name is required for status action');
      }
      command = `schtasks /Query /FO LIST /V /TN "${taskName}"`;
    }
    
    const { stdout } = await execAsync(command);
    return stdout.toString();
  } catch (error: any) {
    throw new Error(`Failed to get scheduled tasks information: ${error.message}`);
  }
}

async function getServiceInfo(action: 'query' | 'status' = 'query', serviceName?: string): Promise<string> {
  try {
    let command: string;
    
    if (action === 'query') {
      if (serviceName) {
        command = `sc query "${serviceName}"`;
      } else {
        command = 'sc query state= all';
      }
    } else { // status
      if (!serviceName) {
        throw new Error('Service name is required for status action');
      }
      command = `sc query "${serviceName}"`;
    }
    
    const { stdout } = await execAsync(command);
    return stdout.toString();
  } catch (error: any) {
    throw new Error(`Failed to get service information: ${error.message}`);
  }
}

async function getAllowedCommands(): Promise<string> {
  if (allowUnsafeCommands) {
    return "Running in unsafe mode. All commands are allowed except: " + dangerousCommands.join(', ');
  } else {
    return "Allowed commands:\n" + allowedCommands.join('\n');
  }
}

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Server setup
const server = new Server(
  {
    name: "windows-commandline-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Tool request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "execute_command",
        description:
          "Execute a Windows command and return its output. Only commands in the allowed list can be executed. " +
          "This tool should be used for running simple commands like 'dir', 'echo', etc.",
        inputSchema: zodToJsonSchema(ExecuteCommandArgsSchema) as ToolInput,
      },
      {
        name: "execute_powershell",
        description:
          "Execute a PowerShell script and return its output. This allows for more complex operations " +
          "and script execution. PowerShell must be in the allowed commands list.",
        inputSchema: zodToJsonSchema(ExecutePowerShellArgsSchema) as ToolInput,
      },
      {
        name: "list_running_processes",
        description:
          "List all running processes on the system. Can be filtered by providing an optional filter string " +
          "that will match against process names.",
        inputSchema: zodToJsonSchema(ListRunningProcessesArgsSchema) as ToolInput,
      },
      {
        name: "get_system_info",
        description:
          "Retrieve system information including OS, hardware, and user details. " +
          "Can provide basic or full details.",
        inputSchema: zodToJsonSchema(GetSystemInfoArgsSchema) as ToolInput,
      },
      {
        name: "get_network_info",
        description:
          "Retrieve network configuration information including IP addresses, adapters, and DNS settings. " +
          "Can be filtered to a specific interface.",
        inputSchema: zodToJsonSchema(NetworkInfoArgsSchema) as ToolInput,
      },
      {
        name: "get_scheduled_tasks",
        description:
          "Retrieve information about scheduled tasks on the system. " +
          "Can query all tasks or get detailed status of a specific task.",
        inputSchema: zodToJsonSchema(ScheduledTasksArgsSchema) as ToolInput,
      },
      {
        name: "get_service_info",
        description:
          "Retrieve information about Windows services. " +
          "Can query all services or get detailed status of a specific service.",
        inputSchema: zodToJsonSchema(ServiceInfoArgsSchema) as ToolInput,
      },
      {
        name: "list_allowed_commands",
        description:
          "List all commands that are allowed to be executed by this server. " +
          "This helps understand what operations are permitted.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "execute_command": {
        const parsed = ExecuteCommandArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for execute_command: ${parsed.error}`);
        }
        const { command, workingDir, timeout } = parsed.data;
        const result = await executeCommand(command, workingDir, timeout);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "execute_powershell": {
        const parsed = ExecutePowerShellArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for execute_powershell: ${parsed.error}`);
        }
        const { script, workingDir, timeout } = parsed.data;
        const result = await executePowerShell(script, workingDir, timeout);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "list_running_processes": {
        const parsed = ListRunningProcessesArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for list_running_processes: ${parsed.error}`);
        }
        const { filter } = parsed.data;
        const result = await getRunningProcesses(filter);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_system_info": {
        const parsed = GetSystemInfoArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for get_system_info: ${parsed.error}`);
        }
        const { detail } = parsed.data;
        const result = await getSystemInfo(detail);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_network_info": {
        const parsed = NetworkInfoArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for get_network_info: ${parsed.error}`);
        }
        const { interface: interfaceName } = parsed.data;
        const result = await getNetworkInfo(interfaceName);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_scheduled_tasks": {
        const parsed = ScheduledTasksArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for get_scheduled_tasks: ${parsed.error}`);
        }
        const { action, taskName } = parsed.data;
        const result = await getScheduledTasksInfo(action, taskName);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_service_info": {
        const parsed = ServiceInfoArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for get_service_info: ${parsed.error}`);
        }
        const { action, serviceName } = parsed.data;
        const result = await getServiceInfo(action, serviceName);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "list_allowed_commands": {
        const result = await getAllowedCommands();
        return {
          content: [{ type: "text", text: result }],
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

// Start server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Windows Command Line Server running on stdio");
  if (allowUnsafeCommands) {
    console.error("WARNING: Running in unsafe mode. All commands are allowed except dangerous ones.");
  } else {
    console.error("Allowed commands:", allowedCommands);
  }
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});