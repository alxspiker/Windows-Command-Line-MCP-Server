/**
 * Tool for listing allowed commands
 */

import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import { SecurityManager } from "../securityManager.js";

/**
 * Tool schema for allowed commands listing
 */
export const allowedCommandsSchema = z.object({});

/**
 * Tool definition for allowed commands listing
 */
export const allowedCommandsDefinition = {
  name: "list_allowed_commands",
  description: "List all commands that are allowed to be executed by this server. This helps understand what operations are permitted.",
  inputSchema: zodToJsonSchema(allowedCommandsSchema)
};

/**
 * Allowed commands tool handler function
 * @param securityManager Security manager instance
 * @returns Tool execution result 
 */
export function allowedCommandsHandler(securityManager: SecurityManager) {
  try {
    const allowedCommands = securityManager.getAllowedCommands();
    
    return {
      content: [{ 
        type: "text", 
        text: `Allowed commands:\n${allowedCommands.join('\n')}` 
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
