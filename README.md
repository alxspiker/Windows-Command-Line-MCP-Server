# Windows Command Line MCP Server

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
      "developmentTools": {
        "npm": true,
        "yarn": true,
        "git": true
      }
    }
  }
}
```

### Implemented Tools

1. **create_project**
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

## Roadmap
- [x] Create safe project scaffolding
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
