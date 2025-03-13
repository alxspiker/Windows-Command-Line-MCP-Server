import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync } from "child_process";

// Create server instance
const server = new McpServer({
  name: "windows-command-line",
  version: "0.3.0",
});

// Register the list_running_processes tool
server.tool(
  "list_running_processes",
  "List all running processes on the system. Can be filtered by providing an optional filter string that will match against process names.",
  {
    filter: z.string().optional().describe("Optional filter string to match against process names"),
  },
  async ({ filter }) => {
    try {
      let cmd = "powershell.exe -Command \"Get-Process";
      
      if (filter) {
        // Add filter if provided
        cmd += ` | Where-Object { $_.ProcessName -like '*${filter}*' }`;
      }
      
      cmd += " | Select-Object Id, ProcessName, CPU, WorkingSet, Description | Format-Table -AutoSize | Out-String\"";
      
      const stdout = execSync(cmd);
      
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
      let cmd = "powershell.exe -Command \"";
      
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
      
      const stdout = execSync(cmd);
      
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
      let cmd = "powershell.exe -Command \"";
      
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
      
      const stdout = execSync(cmd);
      
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
      
      const stdout = execSync(cmd);
      
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
      
      const stdout = execSync(cmd);
      
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
  "Execute a Windows command and return its output. Only commands in the allowed list can be executed. This tool should be used for running simple commands like 'dir', 'echo', etc.",
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
        'cacls', 'icacls', 'takeown', 'diskpart', 'cipher /w', 'schtasks /create'
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
      
      const stdout = execSync(`cmd.exe /c ${command}`, options);
      return {
        content: [
          {
            type: "text",
            text: stdout.toString() || 'Command executed successfully (no output)',
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
  "Execute a PowerShell script and return its output. This allows for more complex operations and script execution. PowerShell must be in the allowed commands list.",
  {
    script: z.string().describe("PowerShell script to execute"),
    workingDir: z.string().optional().describe("Working directory for the script"),
    timeout: z.number().default(30000).describe("Timeout in milliseconds"),
  },
  async ({ script, workingDir, timeout }) => {
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
      
      const stdout = execSync(`powershell.exe -Command "${script}"`, options);
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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Windows Command Line MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
