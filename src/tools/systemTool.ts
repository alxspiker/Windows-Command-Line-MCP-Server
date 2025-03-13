/**
 * System information tools implementation
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { SystemInfoManager } from "../systemInfoManager.js";

/**
 * Tool schema for system information
 */
export const systemInfoSchema = z.object({
  detail: z.enum(['basic', 'full']).optional().default('basic').describe('Level of detail')
});

/**
 * Tool definition for system information
 */
export const systemInfoDefinition = {
  name: "get_system_info",
  description: "Retrieve system information including OS, hardware, and user details. Can provide basic or full details.",
  inputSchema: zodToJsonSchema(systemInfoSchema)
};

/**
 * Tool schema for network information
 */
export const networkInfoSchema = z.object({
  networkInterface: z.string().optional().describe('Optional interface name to filter results')
});

/**
 * Tool definition for network information
 */
export const networkInfoDefinition = {
  name: "get_network_info",
  description: "Retrieve network configuration information including IP addresses, adapters, and DNS settings. Can be filtered to a specific interface.",
  inputSchema: zodToJsonSchema(networkInfoSchema)
};

/**
 * Tool schema for process listing
 */
export const processListSchema = z.object({
  filter: z.string().optional().describe('Optional filter string to match against process names')
});

/**
 * Tool definition for process listing
 */
export const processListDefinition = {
  name: "list_running_processes",
  description: "List all running processes on the system. Can be filtered by providing an optional filter string that will match against process names.",
  inputSchema: zodToJsonSchema(processListSchema)
};

/**
 * Tool schema for scheduled tasks
 */
export const taskInfoSchema = z.object({
  action: z.enum(['query', 'status']).optional().default('query').describe('Action to perform'),
  taskName: z.string().optional().describe('Name of the specific task (optional)')
});

/**
 * Tool definition for scheduled tasks
 */
export const taskInfoDefinition = {
  name: "get_scheduled_tasks",
  description: "Retrieve information about scheduled tasks on the system. Can query all tasks or get detailed status of a specific task.",
  inputSchema: zodToJsonSchema(taskInfoSchema)
};

/**
 * Tool schema for service information
 */
export const serviceInfoSchema = z.object({
  action: z.enum(['query', 'status']).optional().default('query').describe('Action to perform'),
  serviceName: z.string().optional().describe('Service name to get info about (optional)')
});

/**
 * Tool definition for service information
 */
export const serviceInfoDefinition = {
  name: "get_service_info",
  description: "Retrieve information about Windows services. Can query all services or get detailed status of a specific service.",
  inputSchema: zodToJsonSchema(serviceInfoSchema)
};

/**
 * System info tool handler function
 * @param systemInfoManager System info manager instance
 * @param args Tool arguments
 * @returns Tool execution result
 */
export async function systemInfoHandler(systemInfoManager: SystemInfoManager, args: any) {
  try {
    const { detail } = systemInfoSchema.parse(args);
    const output = await systemInfoManager.getSystemInfo(detail);
    
    return {
      content: [{ 
        type: "text", 
        text: output 
      }]
    };
  } catch (error) {
    return {
      isError: true,
      content: [{ 
        type: "text", 
        text: `Error: ${error instanceof Error ? error.message : String(error)}` 
      }]
    };
  }
}

/**
 * Network info tool handler function
 * @param systemInfoManager System info manager instance
 * @param args Tool arguments
 * @returns Tool execution result
 */
export async function networkInfoHandler(systemInfoManager: SystemInfoManager, args: any) {
  try {
    const { networkInterface } = networkInfoSchema.parse(args);
    const output = await systemInfoManager.getNetworkInfo(networkInterface);
    
    return {
      content: [{ 
        type: "text", 
        text: output 
      }]
    };
  } catch (error) {
    return {
      isError: true,
      content: [{ 
        type: "text", 
        text: `Error: ${error instanceof Error ? error.message : String(error)}` 
      }]
    };
  }
}

/**
 * Process list tool handler function
 * @param systemInfoManager System info manager instance
 * @param args Tool arguments
 * @returns Tool execution result
 */
export async function processListHandler(systemInfoManager: SystemInfoManager, args: any) {
  try {
    const { filter } = processListSchema.parse(args);
    const output = await systemInfoManager.listRunningProcesses(filter);
    
    return {
      content: [{ 
        type: "text", 
        text: output 
      }]
    };
  } catch (error) {
    return {
      isError: true,
      content: [{ 
        type: "text", 
        text: `Error: ${error instanceof Error ? error.message : String(error)}` 
      }]
    };
  }
}

/**
 * Task info tool handler function
 * @param systemInfoManager System info manager instance
 * @param args Tool arguments
 * @returns Tool execution result
 */
export async function taskInfoHandler(systemInfoManager: SystemInfoManager, args: any) {
  try {
    const { action, taskName } = taskInfoSchema.parse(args);
    const output = await systemInfoManager.getScheduledTasks(action, taskName);
    
    return {
      content: [{ 
        type: "text", 
        text: output 
      }]
    };
  } catch (error) {
    return {
      isError: true,
      content: [{ 
        type: "text", 
        text: `Error: ${error instanceof Error ? error.message : String(error)}` 
      }]
    };
  }
}

/**
 * Service info tool handler function
 * @param systemInfoManager System info manager instance
 * @param args Tool arguments
 * @returns Tool execution result
 */
export async function serviceInfoHandler(systemInfoManager: SystemInfoManager, args: any) {
  try {
    const { action, serviceName } = serviceInfoSchema.parse(args);
    const output = await systemInfoManager.getServiceInfo(action, serviceName);
    
    return {
      content: [{ 
        type: "text", 
        text: output 
      }]
    };
  } catch (error) {
    return {
      isError: true,
      content: [{ 
        type: "text", 
        text: `Error: ${error instanceof Error ? error.message : String(error)}` 
      }]
    };
  }
}
