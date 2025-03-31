import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync } from "child_process";
import { platform } from "os";
import * as fs from 'fs';
import * as path from 'path';

// Detect operating system
const isWindows = platform() === 'win32';
// Check if we're in a container
const isContainer = checkIfInContainer();

// Log environment info at startup
console.error(`Starting server on platform: ${platform()}, container: ${isContainer ? 'yes' : 'no'}`);

// Constants for container-to-host communication
const BRIDGE_SERVER_HOST = process.env.WINDOWS_BRIDGE_HOST || '127.0.0.1';
const BRIDGE_SERVER_PORT = process.env.WINDOWS_BRIDGE_PORT || '3099';
const BRIDGE_ENABLED = process.env.ENABLE_WINDOWS_BRIDGE === 'true';

// Function to check if running in a container
function checkIfInContainer() {
  try {
    // Check for container-specific files
    if (fs.existsSync('/.dockerenv')) return true;
    if (fs.existsSync('/fly/init')) return true;
    
    // Check cgroup info
    if (fs.existsSync('/proc/1/cgroup')) {
      const cgroupContent = fs.readFileSync('/proc/1/cgroup', 'utf8');
      if (cgroupContent.includes('docker') || cgroupContent.includes('kubepods')) return true;
    }
    
    return false;
  } catch (error) {
    // If we can't check (e.g., on Windows), assume not in container
    return false;
  }
}

// Create server instance
const server = new McpServer({
  name: "windows-command-line",
  version: "0.3.1",
});

// Helper function for HTTP requests to bridge server (if available)
async function requestWindowsCommand(command: string, options: any = {}) {
  if (!BRIDGE_ENABLED) {
    return null;
  }
  
  try {
    // Simple HTTP request for command execution
    // This is a simplified version - in practice, you'd want to use proper HTTP libraries
    const postData = JSON.stringify({
      command,
      options
    });
    
    // Using curl as it's commonly available in containers
    const curlCommand = `curl -s -X POST -H "Content-Type: application/json" -d '${postData}' http://${BRIDGE_SERVER_HOST}:${BRIDGE_SERVER_PORT}/execute`;
    const result = execSync(curlCommand).toString();
    
    try {
      return JSON.parse(result);
    } catch {
      return { output: result, error: null };
    }
  } catch (error) {
    console.error('Failed to connect to Windows bridge server:', error);
    return null;
  }
}

// Helper function to handle command execution based on platform
async function executeCommand(command: string, options: any = {}) {
  // First, try executing through a bridge if we're in a container but need Windows commands
  if (!isWindows && isContainer && BRIDGE_ENABLED) {
    console.error('Running in Linux container, attempting to use Windows bridge...');
    const bridgeResult = await requestWindowsCommand(command, options);
    if (bridgeResult) {
      return Buffer.from(bridgeResult.output || 'Command executed with no output');
    }
  }
  
  // If we're on Windows, execute directly
  if (isWindows) {
    return execSync(command, options);
  } else {
    // For Linux/MacOS, we'll adapt the commands where possible
    console.error(`Running in a ${isContainer ? 'containerized ' : ''}non-Windows environment (${platform()}). Adapting commands...`);
    
    try {
      // Map of common Windows commands to Linux equivalents
      const commandMappings: {[key: string]: string | null} = {
        'dir': 'ls -la',
        'type': 'cat',
        'copy': 'cp',
        'move': 'mv',
        'del': 'rm',
        'md': 'mkdir',
        'rd': 'rmdir',
        'echo': 'echo',
        'cls': 'clear',
        'ipconfig': 'ip addr',
        'tasklist': 'ps aux',
        'systeminfo': 'uname -a && lscpu && free -h',
        'net user': null, // Block potentially dangerous commands
        'reg': null,      // Block potentially dangerous commands
      };
      
      // Parse the original command to attempt translation
      let modifiedCmd = command;
      
      // Replace cmd.exe /c with empty string
      modifiedCmd = modifiedCmd.replace(/cmd\.exe\s+\/c\s+/i, '');
      
      // Replace powershell.exe -Command with empty string
      modifiedCmd = modifiedCmd.replace(/powershell\.exe\s+-Command\s+("|')/i, '');
      if (modifiedCmd !== command) {
        // Remove trailing quotes if we removed powershell -Command
        modifiedCmd = modifiedCmd.replace(/("|')$/, '');
      }
      
      // Try to map Windows commands to Linux equivalents
      for (const [winCmd, linuxCmd] of Object.entries(commandMappings)) {
        if (linuxCmd === null && modifiedCmd.toLowerCase().includes(winCmd.toLowerCase())) {
          throw new Error(`The command '${winCmd}' is not supported in Linux environment`);
        }
        
        // Replace the Windows command with Linux equivalent
        // Use regex to match the command at the start of the string or after && or ||
        const cmdRegex = new RegExp(`(^|&&|\\|\\|)\\s*${winCmd}\\b`, 'i');
        if (cmdRegex.test(modifiedCmd)) {
          modifiedCmd = modifiedCmd.replace(cmdRegex, `$1 ${linuxCmd}`);
        }
      }
      
      console.error(`Translated command: ${modifiedCmd}`);
      return execSync(modifiedCmd, options);
    } catch (error) {
      console.error(`Error executing command: ${error}`);
      return Buffer.from(`Command execution failed: ${error}\n\nNote: This server is designed for Windows environments but is running in ${platform()}. Some commands may not be compatible.`);
    }
  }
}

// Register the list_running_processes tool
server.tool(
  "list_running_processes",
  "List all running processes on the system. Can be filtered by providing an optional filter string that will match against process names.",
  {
    filter: z.string().optional().describe("Optional filter string to match against process names"),
  },
  async ({ filter }) => {
    try {
      let cmd;
      
      if (isWindows) {
        cmd = "powershell.exe -Command \"Get-Process";
        
        if (filter) {
          // Add filter if provided
          cmd += ` | Where-Object { $_.ProcessName -like '*${filter}*' }`;
        }
        
        cmd += " | Select-Object Id, ProcessName, CPU, WorkingSet, Description | Format-Table -AutoSize | Out-String\"";
      } else {
        // Fallback for Unix systems
        cmd = "ps aux";
        
        if (filter) {
          cmd += ` | grep -i ${filter}`;
        }
      }
      
      const stdout = await executeCommand(cmd);
      
      return {
        content: [
          {
            type: "text",
            text: stdout.toString(),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error listing processes: ${error}`,
          },
        ],
      };
    }
  }
);

// Register the get_system_info tool
server.tool(
  "get_system_info",
  "Retrieve system information including OS, hardware, and user details. Can provide basic or full details.",
  {
    detail: z.enum(["basic", "full"]).default("basic").describe("Level of detail"),
  },
  async ({ detail }) => {
    try {
      let cmd;
      
      if (isWindows) {
        cmd = "powershell.exe -Command \"";
        
        if (detail === "basic") {
          cmd += "$OS = Get-CimInstance Win32_OperatingSystem; " +
                "$CS = Get-CimInstance Win32_ComputerSystem; " +
                "$Processor = Get-CimInstance Win32_Processor; " +
                "Write-Output 'OS: ' $OS.Caption $OS.Version; " +
                "Write-Output 'Computer: ' $CS.Manufacturer $CS.Model; " +
                "Write-Output 'CPU: ' $Processor.Name; " +
                "Write-Output 'Memory: ' [math]::Round($OS.TotalVisibleMemorySize/1MB, 2) 'GB'";
        } else {
          cmd += "$OS = Get-CimInstance Win32_OperatingSystem; " +
                "$CS = Get-CimInstance Win32_ComputerSystem; " +
                "$Processor = Get-CimInstance Win32_Processor; " +
                "$Disk = Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3'; " +
                "$Network = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object {$_.IPAddress -ne $null}; " +
                "Write-Output '=== OPERATING SYSTEM ==='; " +
                "Write-Output ('OS: ' + $OS.Caption + ' ' + $OS.Version); " +
                "Write-Output ('Architecture: ' + $OS.OSArchitecture); " +
                "Write-Output ('Install Date: ' + $OS.InstallDate); " +
                "Write-Output ('Last Boot: ' + $OS.LastBootUpTime); " +
                "Write-Output (''; '=== HARDWARE ==='); " +
                "Write-Output ('Manufacturer: ' + $CS.Manufacturer); " +
                "Write-Output ('Model: ' + $CS.Model); " +
                "Write-Output ('Serial Number: ' + (Get-CimInstance Win32_BIOS).SerialNumber); " +
                "Write-Output ('Processor: ' + $Processor.Name); " +
                "Write-Output ('Cores: ' + $Processor.NumberOfCores); " +
                "Write-Output ('Logical Processors: ' + $Processor.NumberOfLogicalProcessors); " +
                "Write-Output ('Memory: ' + [math]::Round($OS.TotalVisibleMemorySize/1MB, 2) + ' GB'); " +
                "Write-Output (''; '=== STORAGE ==='); " +
                "foreach($drive in $Disk) { " +
                "Write-Output ('Drive ' + $drive.DeviceID + ' - ' + [math]::Round($drive.Size/1GB, 2) + ' GB (Free: ' + [math]::Round($drive.FreeSpace/1GB, 2) + ' GB)') " +
                "}; " +
                "Write-Output (''; '=== NETWORK ==='); " +
                "foreach($adapter in $Network) { " +
                "Write-Output ('Adapter: ' + $adapter.Description); " +
                "Write-Output ('  IP Address: ' + ($adapter.IPAddress[0])); " +
                "Write-Output ('  MAC Address: ' + $adapter.MACAddress); " +
                "Write-Output ('  Gateway: ' + ($adapter.DefaultIPGateway -join ', ')); " +
                "}";
        }
        
        cmd += "\"";
      } else {
        // Fallback for Unix systems
        if (detail === "basic") {
          cmd = "uname -a && echo 'CPU:' && lscpu | grep 'Model name' && echo 'Memory:' && free -h | head -n 2";
        } else {
          cmd = "echo '=== OPERATING SYSTEM ===' && uname -a && echo && echo '=== HARDWARE ===' && lscpu && echo && echo '=== MEMORY ===' && free -h && echo && echo '=== STORAGE ===' && df -h && echo && echo '=== NETWORK ===' && ip addr";
        }
      }
      
      const stdout = await executeCommand(cmd);
      
      if (!isWindows && isContainer) {
        return {
          content: [
            {
              type: "text",
              text: stdout.toString() + "\n\nNote: This information is from the Linux container, not your Windows host. To access Windows system information, you need to set up the Windows bridge or run this server directly on Windows.",
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: "text",
            text: stdout.toString(),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error retrieving system info: ${error}`,
          },
        ],
      };
    }
  }
);

// Register the get_network_info tool
server.tool(
  "get_network_info",
  "Retrieve network configuration information including IP addresses, adapters, and DNS settings. Can be filtered to a specific interface.",
  {
    networkInterface: z.string().optional().describe("Optional interface name to filter results"),
  },
  async ({ networkInterface }) => {
    try {
      let cmd;
      
      if (isWindows) {
        cmd = "powershell.exe -Command \"";
        
        if (networkInterface) {
          cmd += "$adapters = Get-NetAdapter | Where-Object { $_.Name -like '*" + networkInterface + "*' }; ";
        } else {
          cmd += "$adapters = Get-NetAdapter; ";
        }
        
        cmd += "foreach($adapter in $adapters) { " +
              "Write-Output ('======== ' + $adapter.Name + ' (' + $adapter.Status + ') ========'); " +
              "Write-Output ('Interface Description: ' + $adapter.InterfaceDescription); " +
              "Write-Output ('MAC Address: ' + $adapter.MacAddress); " +
              "Write-Output ('Link Speed: ' + $adapter.LinkSpeed); " +
              "$ipconfig = Get-NetIPConfiguration -InterfaceIndex $adapter.ifIndex; " +
              "Write-Output ('IP Address: ' + ($ipconfig.IPv4Address.IPAddress -join ', ')); " +
              "Write-Output ('Subnet: ' + ($ipconfig.IPv4Address.PrefixLength -join ', ')); " +
              "Write-Output ('Gateway: ' + ($ipconfig.IPv4DefaultGateway.NextHop -join ', ')); " +
              "Write-Output ('DNS Servers: ' + ($ipconfig.DNSServer.ServerAddresses -join ', ')); " +
              "Write-Output ''; " +
              "}\"";
      } else {
        // Fallback for Unix systems
        if (networkInterface) {
          cmd = `ip addr show ${networkInterface}`;
        } else {
          cmd = "ip addr";
        }
      }
      
      const stdout = await executeCommand(cmd);
      
      if (!isWindows && isContainer) {
        return {
          content: [
            {
              type: "text",
              text: stdout.toString() + "\n\nNote: This information is from the Linux container, not your Windows host. To access Windows network information, you need to set up the Windows bridge or run this server directly on Windows.",
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: "text",
            text: stdout.toString(),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error retrieving network info: ${error}`,
          },
        ],
      };
    }
  }
);

// Register the get_scheduled_tasks tool
server.tool(
  "get_scheduled_tasks",
  "Retrieve information about scheduled tasks on the system. Can query all tasks or get detailed status of a specific task.",
  {
    action: z.enum(["query", "status"]).default("query").describe("Action to perform"),
    taskName: z.string().optional().describe("Name of the specific task (optional)"),
  },
  async ({ action, taskName }) => {
    if (!isWindows && !BRIDGE_ENABLED) {
      return {
        content: [
          {
            type: "text",
            text: "The scheduled tasks tool is only available on Windows. Current platform: " + platform() + 
                 "\n\nTo use this feature in a container, you need to set up the Windows bridge server.",
          },
        ],
      };
    }
    
    try {
      let cmd = "powershell.exe -Command \"";
      
      if (action === "query") {
        if (taskName) {
          cmd += "Get-ScheduledTask -TaskName '" + taskName + "' | Format-List TaskName, State, Description, Author, LastRunTime, NextRunTime, LastTaskResult";
        } else {
          cmd += "Get-ScheduledTask | Select-Object TaskName, State, Description | Format-Table -AutoSize | Out-String";
        }
      } else if (action === "status" && taskName) {
        cmd += "Get-ScheduledTask -TaskName '" + taskName + "' | Format-List *; " +
              "Get-ScheduledTaskInfo -TaskName '" + taskName + "' | Format-List *";
      } else {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "For 'status' action, taskName parameter is required",
            },
          ],
        };
      }
      
      cmd += "\"";
      
      const stdout = await executeCommand(cmd);
      
      return {
        content: [
          {
            type: "text",
            text: stdout.toString(),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error retrieving scheduled tasks: ${error}`,
          },
        ],
      };
    }
  }
);

// Register the get_service_info tool
server.tool(
  "get_service_info",
  "Retrieve information about Windows services. Can query all services or get detailed status of a specific service.",
  {
    action: z.enum(["query", "status"]).default("query").describe("Action to perform"),
    serviceName: z.string().optional().describe("Service name to get info about (optional)"),
  },
  async ({ action, serviceName }) => {
    if (!isWindows && !BRIDGE_ENABLED) {
      return {
        content: [
          {
            type: "text",
            text: "The service info tool is only available on Windows. Current platform: " + platform() +
                 "\n\nTo use this feature in a container, you need to set up the Windows bridge server.",
          },
        ],
      };
    }
    
    try {
      let cmd = "powershell.exe -Command \"";
      
      if (action === "query") {
        if (serviceName) {
          cmd += "Get-Service -Name '" + serviceName + "' | Format-List Name, DisplayName, Status, StartType, Description";
        } else {
          cmd += "Get-Service | Select-Object Name, DisplayName, Status, StartType | Format-Table -AutoSize | Out-String";
        }
      } else if (action === "status" && serviceName) {
        cmd += "Get-Service -Name '" + serviceName + "' | Format-List *; " +
              "Get-CimInstance -ClassName Win32_Service -Filter \"Name='" + serviceName + "'\" | Format-List *";
      } else {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "For 'status' action, serviceName parameter is required",
            },
          ],
        };
      }
      
      cmd += "\"";
      
      const stdout = await executeCommand(cmd);
      
      return {
        content: [
          {
            type: "text",
            text: stdout.toString(),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error retrieving service info: ${error}`,
          },
        ],
      };
    }
  }
);

// Register the list_allowed_commands tool
server.tool(
  "list_allowed_commands",
  "List all commands that are allowed to be executed by this server. This helps understand what operations are permitted.",
  {},
  async () => {
    try {
      if (isWindows) {
        return {
          content: [
            {
              type: "text",
              text: "The following commands are allowed to be executed by this server:\n\n" +
                    "- powershell.exe: Used for most system operations\n" +
                    "- cmd.exe: Used for simple command execution\n\n" +
                    "Note: All commands are executed with the same privileges as the user running this server."
            },
          ],
        };
      } else if (isContainer) {
        return {
          content: [
            {
              type: "text",
              text: "Running in a Linux container environment.\n\n" +
                    (BRIDGE_ENABLED ? 
                      "Windows Bridge enabled: Commands will be sent to the Windows host when possible.\n\n" :
                      "Windows Bridge not enabled: Windows-specific commands will be adapted for Linux or may not work.\n\n") +
                    "Available Linux commands:\n" +
                    "- ls: List directory contents\n" +
                    "- ps: List processes\n" +
                    "- uname: Print system information\n" +
                    "- ip: Show network information\n" +
                    "- cat: Display file contents\n" +
                    "- grep: Search text patterns\n" +
                    "- find: Search for files\n\n" +
                    "Command translation active:\n" +
                    "- dir → ls -la\n" +
                    "- ipconfig → ip addr\n" +
                    "- tasklist → ps aux\n" +
                    "- systeminfo → uname -a && lscpu && free -h\n\n" +
                    "Note: All commands are executed with the same privileges as the user running this container."
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: "Running on non-Windows platform: " + platform() + "\n\n" +
                    "Standard Unix/Linux commands are available, but Windows-specific commands like powershell.exe and cmd.exe are not available in this environment.\n\n" +
                    "The following commands should work:\n" +
                    "- ls: List directory contents\n" +
                    "- ps: List processes\n" +
                    "- uname: Print system information\n" +
                    "- ip: Show network information\n\n" +
                    "Note: All commands are executed with the same privileges as the user running this server."
            },
          ],
        };
      }
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error listing allowed commands: ${error}`,
          },
        ],
      };
    }
  }
);

// Register the execute_command tool
server.tool(
  "execute_command",
  "Execute a command and return its output. When running in a container, commands will be adapted for the container environment or sent to the Windows host if bridge is enabled.",
  {
    command: z.string().describe("The command to execute"),
    workingDir: z.string().optional().describe("Working directory for the command"),
    timeout: z.number().default(30000).describe("Timeout in milliseconds"),
  },
  async ({ command, workingDir, timeout }) => {
    try {
      // Security check: Ensure only allowed commands are executed
      const commandLower = command.toLowerCase();
      
      // Block potentially dangerous commands
      const dangerousPatterns = [
        'net user', 'net localgroup', 'netsh', 'format', 'rd /s', 'rmdir /s', 
        'del /f', 'reg delete', 'shutdown', 'taskkill', 'sc delete', 'bcdedit',
        'cacls', 'icacls', 'takeown', 'diskpart', 'cipher /w', 'schtasks /create',
        'rm -rf', 'sudo', 'chmod 777', 'chown', 'passwd', 'mkfs', 'dd if=/dev/zero'
      ];
      
      // Check for dangerous patterns
      if (dangerousPatterns.some(pattern => commandLower.includes(pattern.toLowerCase()))) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Command contains potentially dangerous operations and cannot be executed.",
            },
          ],
        };
      }
      
      const options: any = { timeout };
      if (workingDir) {
        options.cwd = workingDir;
      }
      
      let cmdToExecute;
      if (isWindows) {
        cmdToExecute = `cmd.exe /c ${command}`;
      } else {
        // For non-Windows, try to execute the command directly or through bridge
        cmdToExecute = command;
      }
      
      const stdout = await executeCommand(cmdToExecute, options);
      
      // Add extra context if running in container
      let resultText = stdout.toString() || 'Command executed successfully (no output)';
      if (!isWindows && isContainer && !command.startsWith('find ') && !command.includes('grep')) {
        resultText += '\n\nNote: This command was executed in a Linux container. Results may differ from your Windows host environment.';
        if (BRIDGE_ENABLED) {
          resultText += ' Command was attempted to be sent to Windows host via bridge server.';
        } else {
          resultText += ' To execute directly on Windows, enable the Windows bridge server.';
        }
      }
      
      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error executing command: ${error}`,
          },
        ],
      };
    }
  }
);

// Register the execute_powershell tool
server.tool(
  "execute_powershell",
  "Execute a PowerShell script and return its output. This allows for more complex operations and script execution.",
  {
    script: z.string().describe("PowerShell script to execute"),
    workingDir: z.string().optional().describe("Working directory for the script"),
    timeout: z.number().default(30000).describe("Timeout in milliseconds"),
  },
  async ({ script, workingDir, timeout }) => {
    if (!isWindows && !BRIDGE_ENABLED) {
      return {
        content: [
          {
            type: "text",
            text: "The PowerShell execution tool is only available on Windows or when Windows bridge is enabled. Current platform: " + platform(),
          },
        ],
      };
    }
    
    try {
      // Security check: Ensure no dangerous operations
      const scriptLower = script.toLowerCase();
      
      // Block potentially dangerous commands
      const dangerousPatterns = [
        'new-user', 'add-user', 'remove-item -recurse -force', 'format-volume', 
        'reset-computer', 'stop-computer', 'restart-computer', 'stop-process -force',
        'remove-item -force', 'set-executionpolicy', 'invoke-webrequest',
        'start-bitstransfer', 'set-location', 'invoke-expression', 'iex', '& {',
        'invoke-command', 'new-psdrive', 'remove-psdrive', 'enable-psremoting',
        'new-service', 'remove-service', 'set-service'
      ];
      
      // Check for dangerous patterns
      if (dangerousPatterns.some(pattern => scriptLower.includes(pattern.toLowerCase()))) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Script contains potentially dangerous operations and cannot be executed.",
            },
          ],
        };
      }
      
      const options: any = { timeout };
      if (workingDir) {
        options.cwd = workingDir;
      }
      
      const stdout = await executeCommand(`powershell.exe -Command "${script}"`, options);
      return {
        content: [
          {
            type: "text",
            text: stdout.toString() || 'PowerShell script executed successfully (no output)',
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error executing PowerShell script: ${error}`,
          },
        ],
      };
    }
  }
);

// Register a new tool for setting up the Windows bridge
server.tool(
  "setup_windows_bridge",
  "Set up a bridge server on Windows to execute commands from a container. This must be run on your Windows host, not in the container.",
  {
    port: z.number().default(3099).describe("Port to run the bridge server on"),
    allowedCommands: z.array(z.string()).default(['cmd.exe', 'powershell.exe']).describe("List of allowed commands"),
  },
  async ({ port, allowedCommands }) => {
    if (isContainer) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "This tool must be run on your Windows host, not inside the container. Copy the provided script and run it on your Windows machine.",
          },
        ],
      };
    }
    
    if (!isWindows) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "This tool is designed to create a Windows bridge server and can only be run on Windows.",
          },
        ],
      };
    }
    
    // Generate a NodeJS server script that can be saved and run on Windows
    const bridgeServerScript = `
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = ${port};
const ALLOWED_COMMANDS = ${JSON.stringify(allowedCommands)};
const LOG_FILE = path.join(__dirname, 'windows-bridge.log');

// Create server
const server = http.createServer((req, res) => {
  // Only allow POST requests to /execute
  if (req.method !== 'POST' || req.url !== '/execute') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  
  // Read request body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      const { command, options } = JSON.parse(body);
      
      // Security check: Only allow whitelisted commands
      const isAllowed = ALLOWED_COMMANDS.some(cmd => command.toLowerCase().startsWith(cmd.toLowerCase()));
      
      if (!isAllowed) {
        log(\`Blocked command: \${command}\`);
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Command not allowed' }));
        return;
      }
      
      // Execute command
      log(\`Executing: \${command}\`);
      exec(command, options || {}, (error, stdout, stderr) => {
        if (error) {
          log(\`Error: \${error.message}\`);
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ output: stdout, stderr }));
      });
    } catch (error) {
      log(\`Parse error: \${error.message}\`);
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid request format' }));
    }
  });
});

// Helper for logging
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = \`[\${timestamp}] \${message}\\n\`;
  
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

// Start server
server.listen(PORT, () => {
  log(\`Windows Bridge Server running on port \${PORT}\`);
  log(\`Allowed commands: \${ALLOWED_COMMANDS.join(', ')}\`);
});
    `;
    
    try {
      // In a real Windows execution, we'd save this script to a file
      // For now, just return the script to the user
      return {
        content: [
          {
            type: "text",
            text: "Windows Bridge Server Script:\n\n" + 
                 "Save this code to a file named 'windows-bridge-server.js' on your Windows host machine " +
                 "and run it with Node.js by executing: node windows-bridge-server.js\n\n" +
                 "Then, set the following environment variables when running the MCP server in Smithery:\n" +
                 "- ENABLE_WINDOWS_BRIDGE=true\n" +
                 "- WINDOWS_BRIDGE_HOST=your-windows-ip-address\n" +
                 "- WINDOWS_BRIDGE_PORT=" + port + "\n\n" +
                 "Code for windows-bridge-server.js:\n\n" + bridgeServerScript,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error generating bridge server: ${error}`,
          },
        ],
      };
    }
  }
);

// Add instructions for Smithery to enable bridge
server.tool(
  "configure_smithery_bridge",
  "Generate Smithery configuration that enables the Windows bridge for cross-environment command execution.",
  {
    windowsHost: z.string().default("127.0.0.1").describe("IP address of your Windows host"),
    windowsPort: z.number().default(3099).describe("Port of the Windows bridge server"),
  },
  async ({ windowsHost, windowsPort }) => {
    try {
      // Generate Smithery configuration
      const smitheryConfig = {
        startCommand: {
          type: "stdio",
          configSchema: {
            windowsHost: {
              type: "string",
              default: windowsHost,
              description: "IP address of your Windows host"
            },
            windowsPort: {
              type: "number",
              default: windowsPort,
              description: "Port of the Windows bridge server"
            },
            enableBridge: {
              type: "boolean",
              default: true,
              description: "Enable Windows bridge"
            }
          },
          commandFunction: `(config) => ({
  command: 'node',
  args: ['dist/index.js'],
  env: {
    'ENABLE_WINDOWS_BRIDGE': config.enableBridge ? 'true' : 'false',
    'WINDOWS_BRIDGE_HOST': config.windowsHost,
    'WINDOWS_BRIDGE_PORT': config.windowsPort.toString()
  }
})`,
          exampleConfig: {
            windowsHost: windowsHost,
            windowsPort: windowsPort,
            enableBridge: true
          }
        }
      };
      
      return {
        content: [
          {
            type: "text",
            text: "Smithery Configuration for Windows Bridge\n\n" +
                 "Update your smithery.yaml file with this content:\n\n" +
                 "```yaml\n" +
                 "# Smithery configuration file: https://smithery.ai/docs/config#smitheryyaml\n\n" +
                 "startCommand:\n" +
                 "  type: stdio\n" +
                 "  configSchema:\n" +
                 "    windowsHost:\n" +
                 "      type: string\n" +
                 "      default: \"" + windowsHost + "\"\n" +
                 "      description: IP address of your Windows host\n" +
                 "    windowsPort:\n" +
                 "      type: number\n" +
                 "      default: " + windowsPort + "\n" +
                 "      description: Port of the Windows bridge server\n" +
                 "    enableBridge:\n" +
                 "      type: boolean\n" +
                 "      default: true\n" +
                 "      description: Enable Windows bridge\n" +
                 "  commandFunction: |\n" +
                 "    (config) => ({\n" +
                 "      command: 'node',\n" +
                 "      args: ['dist/index.js'],\n" +
                 "      env: {\n" +
                 "        'ENABLE_WINDOWS_BRIDGE': config.enableBridge ? 'true' : 'false',\n" +
                 "        'WINDOWS_BRIDGE_HOST': config.windowsHost,\n" +
                 "        'WINDOWS_BRIDGE_PORT': config.windowsPort.toString()\n" +
                 "      }\n" +
                 "    })\n" +
                 "  exampleConfig:\n" +
                 "    windowsHost: \"" + windowsHost + "\"\n" +
                 "    windowsPort: " + windowsPort + "\n" +
                 "    enableBridge: true\n" +
                 "```\n\n" +
                 "After updating, publish your changes and reinstall via Smithery."
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error generating Smithery configuration: ${error}`,
          },
        ],
      };
    }
  }
);

// Start the server
async function main() {
  // Log platform information on startup
  console.error(`Starting Windows Command Line MCP Server on platform: ${platform()}, container: ${isContainer}`);
  
  if (!isWindows) {
    console.error("Warning: This server is designed for Windows environments. Running in cross-platform mode.");
    if (BRIDGE_ENABLED) {
      console.error(`Windows Bridge enabled: ${BRIDGE_SERVER_HOST}:${BRIDGE_SERVER_PORT}`);
    } else {
      console.error("Windows Bridge not enabled. Some Windows-specific commands will not work.");
    }
  }
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Windows Command Line MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
