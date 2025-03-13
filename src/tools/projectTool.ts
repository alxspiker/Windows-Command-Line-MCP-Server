/**
 * Project creation tool implementation
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ProjectManager } from "../projectManager.js";

/**
 * Tool schema for project creation
 */
export const projectToolSchema = z.object({
  type: z.string().describe('Project type (react, node, python)'),
  name: z.string().describe('Project name'),
  template: z.string().optional().describe('Optional project template')
});

/**
 * Tool definition for project creation
 */
export const projectToolDefinition = {
  name: "create_project",
  description: "Create a new project with safe, predefined templates",
  inputSchema: zodToJsonSchema(projectToolSchema)
};

/**
 * Project tool handler function
 * @param projectManager Project manager instance
 * @param args Tool arguments
 * @returns Tool execution result
 */
export async function projectToolHandler(projectManager: ProjectManager, args: any) {
  try {
    const { type, name, template } = projectToolSchema.parse(args);
    const projectPath = await projectManager.createProject(type, name, template);
    
    return {
      content: [{ 
        type: "text", 
        text: `Project created successfully at: ${projectPath}` 
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
