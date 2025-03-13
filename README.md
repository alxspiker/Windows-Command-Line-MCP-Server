# Windows Command Line MCP Server

## New Enhanced Features for AI Development

### Expanded Developer Tools
- Added support for npm, yarn, and other development package managers
- Enhanced IDE and development environment interactions
- Improved project creation and management capabilities

### Autonomous Development Capabilities
- Screen reading and content extraction
- IDE and text editor integration
- Project scaffolding and boilerplate generation
- Integrated development workflow support

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

#### Screen and Window Interaction
- Screen content reading via PowerShell/CLI tools
- Window management commands
- Screenshot capture

### Screen Reading Capabilities
We've added advanced screen reading functionality:
- Capture entire screen or specific window contents
- Extract text from screen regions
- Analyze window titles and active applications

### Security Enhancements
- Granular permission controls for development tools
- Sandboxed project creation directories
- Logging and audit trails for AI-initiated actions

### Configuration Options
New configuration options in `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "commandline": {
      "developmentMode": true,
      "safeProjectRoot": "C:\\AIProjects",
      "screenReading": true,
      "developmentTools": {
        "npm": true,
        "yarn": true,
        "git": true
      }
    }
  }
}
```

### Example Autonomous Workflows
- Create a new project
- Install dependencies
- Run initial setup
- Launch development server
- Capture and analyze output

### Proposed New Tools

1. **create_project**
   ```
   Parameters:
   - type: String (e.g., "react", "node", "python")
   - name: String
   - template: String (optional)
   ```

2. **read_screen_content**
   ```
   Parameters:
   - method: String ("full", "window", "region")
   - options: Object (region coordinates, window title)
   ```

3. **ide_command**
   ```
   Parameters:
   - ide: String (e.g., "vscode", "intellij")
   - command: String
   - project: String (optional)
   ```

## Roadmap
- [ ] Implement screen reading modules
- [ ] Create safe project scaffolding
- [ ] Develop IDE interaction protocols
- [ ] Enhance security sandbox
- [ ] Add comprehensive logging

## Security Considerations
- All AI-initiated actions are logged
- Strict path restrictions
- No destructive commands allowed
- Explicit user confirmation for critical actions

## Experimental Notice
These features are experimental and require careful implementation and security review.
