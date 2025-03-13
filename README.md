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

### 🖥 System Interaction Capabilities
- Execute Windows CLI commands
- Run PowerShell scripts
- Retrieve system and network information
- Manage processes and services

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
- Custom command lists can be specified as arguments

### Configuration

#### Command Whitelisting

You can customize which commands are allowed to be executed in three ways:

1. **Config File**: Create a `config.json` file in the same directory as the server with your allowed commands:

```json
{
  "allowedCommands": [
    "dir",
    "echo",
    "type",
    "findstr",
    "systeminfo",
    "tasklist",
    "ipconfig",
    "netstat",
    "hostname"
    // Add your own allowed commands here
  ]
}
```

2. **Command-line Arguments**: Specify commands directly as arguments:

```bash
node dist/index.js dir echo npm git
```

3. **Default List**: If no custom list is provided, the server uses a default set of safe commands.

The server follows this priority order:
1. Command-line arguments (highest priority)
2. Configuration file settings
3. Default safe commands (lowest priority)

### Project Creation
Create new projects safely with the built-in project creation tool:
- Supported project types: React, Node.js, Python
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

### Custom Command Configuration with Claude

You can also specify your allowed commands when configuring the server in Claude:

```json
{
  "mcpServers": {
    "windows-cmd": {
      "command": "node",
      "args": [
        "/path/to/dist/index.js",
        "dir", "echo", "type", "findstr", "systeminfo"
      ]
    }
  }
}
```

Alternatively, create a config.json file and reference the directory in your configuration:

```json
{
  "mcpServers": {
    "windows-cmd": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "cwd": "/path/to/config/directory"
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

- **0.4.0**: Added user-configurable command whitelist through config.json
- **0.3.0**: Implemented all tools mentioned in README (system info, network info, process management, service info)
- **0.2.0**: Added project creation, expanded development tools
- **0.1.0**: Initial release with basic command execution capabilities

## Support

For issues, questions, or suggestions, please [open an issue](https://github.com/alxspiker/Windows-Command-Line-MCP-Server/issues) on GitHub.
