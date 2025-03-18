# Windows Command Line MCP Server

A secure Model Context Protocol (MCP) server that enables AI models to interact with Windows command-line functionality safely and efficiently.

![Version](https://img.shields.io/badge/version-0.3.0-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

## Overview

The Windows Command Line MCP Server provides a robust, secure bridge between AI models and Windows system operations. It allows controlled execution of commands, project creation, and system information retrieval while maintaining strict security protocols.

## Key Features

### 🔒 Enhanced Security
- Comprehensive command allowlist
- Strict input validation
- Prevention of destructive system operations
- Configurable security levels

### 🛠 Development Tools Support
- Project creation for React, Node.js, and Python
- Safe development environment interactions
- Expanded command support for development workflows
- MCP Server bootstrapping with various templates

### 🖥 System Interaction Capabilities
- Execute Windows CLI commands
- Run PowerShell scripts
- Retrieve system and network information
- Manage processes and services

## New Enhanced Features for AI Development

### Expanded Developer Tools
- Added support for npm, yarn, and other development package managers
- Enhanced IDE and development environment interactions
- Improved project creation and management capabilities

### Autonomous Development Capabilities
- Project scaffolding and boilerplate generation with the `create_project` tool
- Integrated development workflow support
- MCP Server bootstrapping with various templates

### New Allowed Commands

#### Development Package Managers
- `npm`
- `yarn`
- `pnpm`
- `nvm`

#### Project Management
- `mkdir`
- `touch`
- `cp`
- `mv`

#### Development Environment
- `code` (Visual Studio Code)
- `git`
- `node`
- `python`
- `pip`

### Project Creation Capabilities
The new `create_project` tool allows AI models to:
- Create MCP server projects with proper scaffolding
- Select from various templates (basic, tools-only, resources-only, full)
- Generate all necessary configuration files
- Initialize npm and install dependencies
- Set up a proper development environment

## Installation

### Prerequisites
- Node.js 16 or later
- npm or yarn
- Windows operating system

### Setup
```bash
git clone https://github.com/alxspiker/Windows-Command-Line-MCP-Server.git
cd Windows-Command-Line-MCP-Server
npm install
npm run build
```

## Usage

### Command Line Options
- Default mode: Uses predefined safe commands
- `--allow-all`: Run in extended mode (with additional precautions)
- Custom command lists can be specified as arguments

### Project Creation
Create new projects safely with the built-in project creation tool:
- Supported project types: basic, tools-only, resources-only, full
- Projects created in a sandboxed `~/AIProjects` directory

### Available Tools
1. **execute_command**: Run Windows CLI commands
2. **execute_powershell**: Execute PowerShell scripts
3. **create_project**: Safely create new development projects
4. **list_running_processes**: Retrieve active system processes
5. **get_system_info**: Collect system configuration details
6. **get_network_info**: Retrieve network adapter information
7. **get_scheduled_tasks**: List and query system tasks
8. **get_service_info**: Manage and query Windows services
9. **list_allowed_commands**: List all commands that can be executed by the server

### Implemented Tools

#### create_project
```
Parameters:
- type: String (e.g., "basic", "tools-only", "resources-only", "full")
- name: String (project name)
- path: String (optional, custom path to create the project)
- initializeNpm: Boolean (optional, whether to initialize npm in the project)
- installDependencies: Boolean (optional, whether to install dependencies)
```

### Example Usage

Creating a basic MCP server project:
```
create_project({
  type: "basic",
  name: "my-mcp-server",
  initializeNpm: true,
  installDependencies: true
})
```

Creating a tools-focused project in a custom location:
```
create_project({
  type: "tools-only",
  name: "tools-server",
  path: "C:/Projects/mcp-tools-server",
  initializeNpm: true,
  installDependencies: false
})
```

## Using with Claude for Desktop

To use this server with Claude for Desktop:

1. Build the server using the setup instructions above
2. Add it to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "windows-cmd": {
      "command": "node",
      "args": ["/path/to/dist/index.js"]
    }
  }
}
```

Replace `/path/to/dist/index.js` with the absolute path to the built `index.js` file in the `dist` directory.

For development mode and enhanced features, you can use the expanded configuration:

```json
{
  "mcpServers": {
    "commandline": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "developmentMode": true,
      "safeProjectRoot": "C:\\AIProjects",
      "developmentTools": {
        "npm": true,
        "yarn": true,
        "git": true
      }
    }
  }
}
```

3. Restart Claude for Desktop
4. You can now use the tools by asking Claude to perform Windows system operations

## Security Considerations

### Allowed Commands
By default, only safe commands are permitted:
- System information retrieval
- Network configuration
- Process management
- Development tool interactions

### Blocked Operations
Dangerous commands are always blocked, including:
- Disk formatting
- User management
- System shutdown
- Critical registry modifications

### Additional Security Features
- All AI-initiated actions are logged
- Strict path restrictions
- No destructive commands allowed
- Explicit user confirmation for critical actions
- Sandboxed project creation directories

## Configuration

Customize the server's behavior by specifying allowed commands or using configuration flags.

### Example
```bash
# Run with default safe commands
node dist/index.js

# Run with specific allowed commands
node dist/index.js dir echo npm git

# Run in extended mode (use with caution)
node dist/index.js --allow-all
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Inspired by the Model Context Protocol specification
- Developed with security and flexibility in mind

## Version History

- **0.3.0**: Implemented all tools mentioned in README (system info, network info, process management, service info)
- **0.2.0**: Added project creation, expanded development tools
- **0.1.0**: Initial release with basic command execution capabilities

## Roadmap
- [x] Create safe project scaffolding
- [ ] Develop IDE interaction protocols
- [ ] Enhance security sandbox
- [ ] Add comprehensive logging

## Support

For issues, questions, or suggestions, please [open an issue](https://github.com/alxspiker/Windows-Command-Line-MCP-Server/issues) on GitHub.

## Experimental Notice
Some features are experimental and require careful implementation and security review.
