# Windows Command Line MCP Server

A Model Context Protocol (MCP) server that allows LLMs like Claude to securely execute Windows commands and retrieve system information.

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

## Overview

This MCP server provides secure access to Windows command-line functionality through a standardized protocol. It enables AI models to execute commands, gather system information, and interact with Windows services while maintaining strong security controls.

## Features

- **Execute Command Line Instructions**: Run CMD commands with appropriate safeguards
- **Execute PowerShell Scripts**: Run more complex operations via PowerShell
- **System Information**: Retrieve hardware details, OS info, and user data
- **Process Management**: List and filter running processes
- **Network Configuration**: Get detailed network adapter information
- **Service Management**: Query Windows service status and details
- **Task Scheduling**: Access information about scheduled tasks
- **Security Controls**: Command allowlists, validation, and timeout controls

## Installation

### Prerequisites

- Node.js 16 or later
- npm or yarn
- Windows operating system

### Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/mcp-server-commandline.git
   cd mcp-server-commandline
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Usage with Claude for Desktop

1. Edit your Claude for Desktop configuration file located at:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. Add the commandline server to your configuration:
   ```json
   {
     "mcpServers": {
       "commandline": {
         "command": "node",
         "args": [
           "C:\\path\\to\\mcp-server-commandline\\dist\\index.js"
         ]
       }
     }
   }
   ```

3. Restart Claude for Desktop

4. When chatting with Claude, you can now ask questions about your system, and Claude will use the server to retrieve information when appropriate (after asking for your permission).

## Security

### Command Validation

By default, only these safe commands are allowed:
- `dir`, `echo`, `whoami`, `hostname`, `systeminfo`, `ver`
- `ipconfig`, `ping`, `tasklist`, `time`, `date`, `type`
- `find`, `findstr`, `where`, `help`, `netstat`, `sc`
- `schtasks`, `powershell`, `powershell.exe`

### Dangerous Operations

The following operations are explicitly blocked, even in unsafe mode:
- `format`, `del`, `rm`, `rmdir`, `rd`, `diskpart`
- `net user`, `attrib`, `reg delete`, `shutdown`, `logoff`

### Running with Custom Command Allowlist

You can specify which commands to allow:

```bash
node dist/index.js cmd1 cmd2 cmd3
```

### Unsafe Mode (Not Recommended)

For testing or specialized scenarios, you can run in unsafe mode:

```bash
node dist/index.js --allow-all
```

Even in unsafe mode, dangerous commands remain blocked.

## Available Tools

The server exposes these primary tools:

1. **execute_command**: Runs Windows commands
   ```
   Parameters:
   - command: String (required)
   - workingDir: String (optional)
   - timeout: Number (optional, default: 30000)
   ```

2. **execute_powershell**: Executes PowerShell scripts
   ```
   Parameters:
   - script: String (required)
   - workingDir: String (optional)
   - timeout: Number (optional, default: 30000)
   ```

3. **list_running_processes**: Shows active processes
   ```
   Parameters:
   - filter: String (optional)
   ```

4. **get_system_info**: Retrieves system details
   ```
   Parameters:
   - detail: String (optional, "basic" or "full", default: "basic")
   ```

5. **get_network_info**: Shows network configuration
   ```
   Parameters:
   - interface: String (optional)
   ```

6. **get_scheduled_tasks**: Lists scheduled tasks
   ```
   Parameters:
   - action: String (optional, "query" or "status", default: "query")
   - taskName: String (optional)
   ```

7. **get_service_info**: Provides service information
   ```
   Parameters:
   - action: String (optional, "query" or "status", default: "query")
   - serviceName: String (optional)
   ```

8. **list_allowed_commands**: Shows permitted commands
   ```
   No parameters
   ```

## Examples

Here are examples of what you can ask Claude when using this server:

- "What are all the processes running on my computer?"
- "Check if the Windows Update service is running"
- "Show me my current network configuration"
- "What's my computer's system information?"
- "List all scheduled tasks"
- "Run a PowerShell script to get disk space usage"

## Troubleshooting

### Claude doesn't see the tools

1. Verify the path in your `claude_desktop_config.json` is correct
2. Restart Claude for Desktop completely
3. Check your Claude log files for errors:
   - Windows: `%APPDATA%\Claude\logs\mcp*.log`
   - macOS: `~/Library/Logs/Claude/mcp*.log`

### Command execution errors

1. Check that the command is in the allowed list
2. Verify you have appropriate permissions
3. Ensure the command exists on your system

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Based on the Model Context Protocol specification by Anthropic
- Inspired by the mcp-filesystem reference implementation
