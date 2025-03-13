/**
 * Command execution tool implementation
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { SystemInfoManager } from "../systemInfoManager.js";

/**
 * Tool schema for command execution
 */
export const commandToolSchema = z.object({
  command: z.string().describe('The command to execute'),
  timeout: z.number().optional().default(30000).describe('Timeout in milliseconds'),
  workingDir: z.string().optional().describe('Working directory for the command')
});

/**
 * Tool definition for command execution
 */
export const commandToolDefinition = {
  name: "execute_command",
  description: "Execute a Windows command and return its output. Only commands in the allowed list can be executed. This tool should be used for running simple commands like 'dir', 'echo', etc.",
  inputSchema: zodToJsonSchema(commandToolSchema)
};

/**
 * Command tool handler function
 * @param systemInfoManager System info manager instance
 * @param args Tool arguments
 * @returns Tool execution result
 */
export async function commandToolHandler(systemInfoManager: SystemInfoManager, args: any) {
  try {
    const { command, timeout, workingDir } = commandToolSchema.parse(args);
    const output = await systemInfoManager.executeCommand(command, timeout, workingDir);
    
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
