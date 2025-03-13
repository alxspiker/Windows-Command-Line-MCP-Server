/**
 * Export all tool definitions and handlers
 */

// Command execution tools
export { 
  commandToolDefinition, 
  commandToolHandler, 
  commandToolSchema 
} from './commandTool.js';

// PowerShell execution tools
export { 
  powershellToolDefinition, 
  powershellToolHandler, 
  powershellToolSchema 
} from './powershellTool.js';

// Project creation tools
export { 
  projectToolDefinition, 
  projectToolHandler, 
  projectToolSchema 
} from './projectTool.js';

// System information tools
export { 
  systemInfoDefinition,
  networkInfoDefinition,
  processListDefinition,
  taskInfoDefinition,
  serviceInfoDefinition,
  systemInfoHandler,
  networkInfoHandler,
  processListHandler,
  taskInfoHandler,
  serviceInfoHandler,
  systemInfoSchema,
  networkInfoSchema,
  processListSchema,
  taskInfoSchema,
  serviceInfoSchema
} from './systemTool.js';

// Allowed commands tools
export {
  allowedCommandsDefinition,
  allowedCommandsHandler,
  allowedCommandsSchema
} from './allowedCommandsTool.js';

/**
 * Full list of all tool definitions
 */
export const toolDefinitions = [
  // Command tools
  commandToolDefinition,
  powershellToolDefinition,
  
  // Project tools
  projectToolDefinition,
  
  // System tools
  systemInfoDefinition,
  networkInfoDefinition,
  processListDefinition,
  taskInfoDefinition,
  serviceInfoDefinition,
  
  // Utility tools
  allowedCommandsDefinition
];
