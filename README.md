# Windows Command Line MCP Server

A secure Model Context Protocol (MCP) server that enables AI models to interact with Windows command-line functionality safely and efficiently.

![Version](https://img.shields.io/badge/version-0.2.0-blue)
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
- `--allow-all`: Run in extended mode (with additional precautions)
- Custom command lists can be specified as arguments

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

- **0.2.0**: Added project creation, expanded development tools
- **0.1.0**: Initial release with basic command execution capabilities

## Support

For issues, questions, or suggestions, please [open an issue](https://github.com/alxspiker/Windows-Command-Line-MCP-Server/issues) on GitHub.
