/**
 * Utility functions for the Windows Command Line MCP Server
 */

import * as fs from 'fs';
import * as path from 'path';
import { ServerConfig } from './types.js';

// Default allowed commands
export const DEFAULT_ALLOWED_COMMANDS = [
  // System information commands
  'dir', 'echo', 'whoami', 'hostname', 'systeminfo', 'ver',
  'ipconfig', 'ping', 'tasklist', 'time', 'date', 'type',
  'find', 'findstr', 'where', 'help', 'netstat', 'sc',
  'schtasks', 'powershell', 'powershell.exe',
  
  // Development tool commands
  'npm', 'yarn', 'node', 'git', 'code', 
  'python', 'pip', 'nvm', 'pnpm'
];

// Safe project creation configuration
export const SAFE_PROJECT_ROOT = path.join(process.env.HOME || process.env.USERPROFILE || '', 'AIProjects');

/**
 * Load configuration from file if it exists
 */
export function loadConfiguration(): ServerConfig {
  const configPath = path.join(process.cwd(), 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      console.error(`Failed to load config file: ${error}`);
    }
  }
  return {};
}
