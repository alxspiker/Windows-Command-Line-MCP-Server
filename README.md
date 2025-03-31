# Windows Command Line MCP Server

A secure Model Context Protocol (MCP) server that enables AI models to interact with Windows command-line functionality safely and efficiently.

![Version](https://img.shields.io/badge/version-0.3.1-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
[![smithery badge](https://smithery.ai/badge/@alxspiker/Windows-Command-Line-MCP-Server)](https://smithery.ai/server/@alxspiker/Windows-Command-Line-MCP-Server)

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

### 🌉 Cross-Platform Bridge (New!)
- Run in any environment, including Linux containers
- Automatically adapt commands for the current platform
- Optional Windows Bridge Server for true Windows command execution from any environment
- Command translation between Windows and Linux syntax

## Installation

### Installing via Smithery

To install Windows Command Line MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@alxspiker/Windows-Command-Line-MCP-Server):

```bash
npx -y @smithery/cli install @alxspiker/Windows-Command-Line-MCP-Server --client claude
```

### Prerequisites
- Node.js 16 or later
- npm or yarn
- Windows operating system (for full functionality)
- Any OS with Node.js (for basic functionality with cross-platform adaptation)

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
1. **execute_command**: Run Windows CLI or adapted commands
2. **execute_powershell**: Execute PowerShell scripts (Windows only)
3. **list_running_processes**: Retrieve active system processes
4. **get_system_info**: Collect system configuration details
5. **get_network_info**: Retrieve network adapter information
6. **get_scheduled_tasks**: List and query system tasks (Windows only)
7. **get_service_info**: Manage and query Windows services (Windows only)
8. **list_allowed_commands**: List all commands that can be executed by the server
9. **setup_windows_bridge**: Create a bridge server to execute Windows commands from any environment
10. **configure_smithery_bridge**: Generate updated Smithery configuration for cross-platform use

## Cross-Platform Support

### Command Translation
When running in a non-Windows environment, the server automatically translates common Windows commands:

| Windows Command | Linux/Unix Equivalent |
|-----------------|------------------------|
| dir             | ls -la                 |
| type            | cat                    |
| copy            | cp                     |
| move            | mv                     |
| del             | rm                     |
| ipconfig        | ip addr                |
| tasklist        | ps aux                 |
| systeminfo      | uname -a && lscpu && free -h |

### Windows Bridge Server
For true Windows command execution from any environment, you can set up the Windows Bridge Server:

1. Use the `setup_windows_bridge` tool to generate the bridge server code
2. Run the generated script on your Windows machine
3. Configure Smithery to use the bridge by setting:
   - `enableBridge: true`
   - `windowsHost: "your-windows-ip"`
   - `windowsPort: 3099`

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

3. Restart Claude for Desktop
4. You can now use the tools by asking Claude to perform Windows system operations

## Using with Smithery

When installing via Smithery, you can enable cross-platform capabilities:

```bash
# Install with default settings
npx -y @smithery/cli install @alxspiker/Windows-Command-Line-MCP-Server --client claude

# Configure for cross-platform use
npx -y @smithery/cli config @alxspiker/Windows-Command-Line-MCP-Server \
  --set enableBridge=true \
  --set windowsHost=192.168.1.100 \
  --set windowsPort=3099
```

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

# Run with Windows bridge enabled
ENABLE_WINDOWS_BRIDGE=true WINDOWS_BRIDGE_HOST=192.168.1.100 WINDOWS_BRIDGE_PORT=3099 node dist/index.js
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

- **0.3.1**: Added cross-platform support and Windows bridge capability
- **0.3.0**: Implemented all tools mentioned in README (system info, network info, process management, service info)
- **0.2.0**: Added project creation, expanded development tools
- **0.1.0**: Initial release with basic command execution capabilities

## Support

For issues, questions, or suggestions, please [open an issue](https://github.com/alxspiker/Windows-Command-Line-MCP-Server/issues) on GitHub.
