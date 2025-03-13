/**
 * Security manager for validating and controlling command execution
 */

import { loadConfiguration, DEFAULT_ALLOWED_COMMANDS } from './utils.js';

/**
 * Security and validation utilities for command execution
 */
export class SecurityManager {
  private allowedCommands: string[];

  /**
   * Initialize the security manager
   * @param allowedCommands Optional list of allowed commands to override defaults
   */
  constructor(allowedCommands?: string[]) {
    // Use provided commands, config file commands, or defaults (in that order of priority)
    const config = loadConfiguration();
    this.allowedCommands = allowedCommands || 
                          config.allowedCommands || 
                          DEFAULT_ALLOWED_COMMANDS;
  }

  /**
   * Validate if a command is allowed to execute
   * @param command The command to validate
   * @returns Object indicating if the command is valid and optional reason
   */
  validateCommand(command: string): { isValid: boolean; reason?: string } {
    // Extract the base command (before any arguments)
    const commandBase = command.split(' ')[0].toLowerCase();
    
    // Check if the command is in the allowed list
    if (!this.allowedCommands.some(cmd => commandBase === cmd.toLowerCase())) {
      return { 
        isValid: false, 
        reason: `Command '${commandBase}' is not in the allowed list` 
      };
    }

    return { isValid: true };
  }

  /**
   * Get the list of allowed commands
   * @returns Array of allowed command strings
   */
  getAllowedCommands(): string[] {
    return this.allowedCommands;
  }
}
