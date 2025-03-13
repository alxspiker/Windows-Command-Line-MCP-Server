/**
 * PowerShell script execution tool implementation
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { SystemInfoManager } from "../systemInfoManager.js";

/**
 * Tool schema for PowerShell execution
 */
export const powershellToolSchema = z.object({
  script: z.string().describe('PowerShell script to execute'),
  timeout: z.number().optional().default(30000).describe('Timeout in milliseconds'),
  workingDir: z.string().optional().describe('Working directory for the script')
});

/**
 * Tool definition for PowerShell execution
 */
export const powershellToolDefinition = {
  name: "execute_powershell",
  description: "Execute a PowerShell script and return its output. This allows for more complex operations and script execution. PowerShell must be in the allowed commands list.",
  inputSchema: zodToJsonSchema(powershellToolSchema)
};

/**
 * PowerShell tool handler function
 * @param systemInfoManager System info manager instance
 * @param args Tool arguments
 * @returns Tool execution result
 */
export async function powershellToolHandler(systemInfoManager: SystemInfoManager, args: any) {
  try {
    const { script, timeout, workingDir } = powershellToolSchema.parse(args);
    const output = await systemInfoManager.executePowerShell(script, timeout, workingDir);
    
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
