#!/usr/bin/env node

/**
 * Windows Command Line MCP Server entry point
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import managers
import { SecurityManager } from './securityManager.js';
import { ProjectManager } from './projectManager.js';
import { SystemInfoManager } from './systemInfoManager.js';

// Import tool definitions and handlers
import { 
  toolDefinitions,
  commandToolHandler,
  powershellToolHandler,
  projectToolHandler,
  systemInfoHandler,
  networkInfoHandler,
  processListHandler,
  taskInfoHandler,
  serviceInfoHandler,
  allowedCommandsHandler
} from './tools/index.js';

/**
 * Create and configure the MCP server instance
 */
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
      version: "0.4.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Setup request handlers for tools listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: toolDefinitions
    };
  });

  // Setup request handler for tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "create_project":
          return await projectToolHandler(projectManager, args);

        case "execute_command":
          return await commandToolHandler(systemInfoManager, args);

        case "execute_powershell":
          return await powershellToolHandler(systemInfoManager, args);

        case "list_running_processes":
          return await processListHandler(systemInfoManager, args);

        case "get_system_info":
          return await systemInfoHandler(systemInfoManager, args);

        case "get_network_info":
          return await networkInfoHandler(systemInfoManager, args);

        case "get_scheduled_tasks":
          return await taskInfoHandler(systemInfoManager, args);

        case "get_service_info":
          return await serviceInfoHandler(systemInfoManager, args);

        case "list_allowed_commands":
          return allowedCommandsHandler(securityManager);

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

/**
 * Main function to run the server
 */
async function runServer() {
  console.error("Starting Windows Command Line MCP Server...");
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  console.error("Windows Command Line MCP Server running on stdio");
}

// Execute the server
runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
