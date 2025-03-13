/**
 * Project creation utilities for creating safe development projects
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { SecurityManager } from './securityManager.js';
import { SAFE_PROJECT_ROOT } from './utils.js';

// Promisify exec for async usage
const execAsync = promisify(exec);
const mkdirAsync = promisify(fs.mkdir);

/**
 * Handles safe project creation with various templates
 */
export class ProjectManager {
  private securityManager: SecurityManager;

  /**
   * Initialize the project manager
   * @param securityManager Security manager for command validation
   */
  constructor(securityManager: SecurityManager) {
    this.securityManager = securityManager;
  }

  /**
   * Create a new development project in a safe location
   * @param type Project type (react, node, python)
   * @param name Project name
   * @param template Optional template to use
   * @returns Path to the created project
   */
  async createProject(type: string, name: string, template?: string): Promise<string> {
    // Validate project name and type
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error('Invalid project name. Use only alphanumeric characters, underscores, and hyphens.');
    }

    // Ensure safe project root exists
    await this.ensureSafeProjectRoot();

    const projectPath = path.join(SAFE_PROJECT_ROOT, name);

    // Prevent overwriting existing projects
    if (fs.existsSync(projectPath)) {
      throw new Error(`Project '${name}' already exists.`);
    }

    try {
      // Create project directory
      await mkdirAsync(projectPath, { recursive: true });

      // Project creation based on type
      switch (type.toLowerCase()) {
        case 'react':
          await this.createReactProject(projectPath, template);
          break;
        case 'node':
          await this.createNodeProject(projectPath, template);
          break;
        case 'python':
          await this.createPythonProject(projectPath, template);
          break;
        default:
          throw new Error(`Unsupported project type: ${type}`);
      }

      return projectPath;
    } catch (error) {
      // Clean up partially created project
      try {
        await fs.promises.rm(projectPath, { recursive: true, force: true });
      } catch {}
      throw error;
    }
  }

  /**
   * Ensure the project root directory exists
   */
  private async ensureSafeProjectRoot() {
    await mkdirAsync(SAFE_PROJECT_ROOT, { recursive: true });
  }

  /**
   * Create a React project using create-react-app
   */
  private async createReactProject(projectPath: string, template?: string) {
    const createCommand = template 
      ? `npx create-react-app ${projectPath} --template ${template}`
      : `npx create-react-app ${projectPath}`;
    
    await this.runSafeCommand(createCommand);
  }

  /**
   * Create a Node.js project with npm init
   */
  private async createNodeProject(projectPath: string, template?: string) {
    // Initialize with npm
    await this.runSafeCommand(`cd ${projectPath} && npm init -y`);
    
    // Add optional template dependencies
    if (template) {
      await this.runSafeCommand(`cd ${projectPath} && npm install ${template}`);
    }
  }

  /**
   * Create a Python project with virtual environment
   */
  private async createPythonProject(projectPath: string, template?: string) {
    // Create virtual environment
    await this.runSafeCommand(`cd ${projectPath} && python -m venv venv`);
    
    // Optional template or initial package
    if (template) {
      await this.runSafeCommand(`cd ${projectPath} && venv/Scripts/pip install ${template}`);
    }
  }

  /**
   * Execute a command after validating it with the security manager
   */
  private async runSafeCommand(command: string) {
    // Validate and execute command
    const validation = this.securityManager.validateCommand(command.split(' ')[0]);
    if (!validation.isValid) {
      throw new Error(validation.reason);
    }

    return execAsync(command);
  }
}
