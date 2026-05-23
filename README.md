# pi-comet

A [Pi](https://pi.dev) extension for controlling Perplexity Comet browser via Chrome DevTools Protocol (CDP). This extension enables Pi agents to automate web browsing, perform research, and interact with web pages in both headed (visible) and headless (background) modes.

## Features

### Phase 1 (MVP - ✅ Complete)
- **Browser Launch**: Launch Comet in headed or headless mode
- **Connection Management**: Connect to running Comet instances
- **Authorization System**: Session-based authorization for security
- **Platform Detection**: Automatic platform detection (macOS, Windows, WSL, Linux)
- **Diagnostics**: Built-in health checks and troubleshooting
- **Tab Management**: List, create, activate, and close browser tabs
- **Navigation**: Navigate to URLs, reload pages, get page info
- **DOM Interaction**: Click elements, type text, scroll pages
- **Screenshot Capture**: Take screenshots in PNG or JPEG format
- **JavaScript Evaluation**: Execute arbitrary JavaScript in browser context
- **Console Monitoring**: Capture and retrieve browser console messages
- **Network Monitoring**: Track network requests and responses

- **DOM Snapshot**: Capture DOM state with stable UIDs
- **Wait for Conditions**: Wait for elements, text, or custom conditions
- **Form Filling**: Fill multiple form fields at once
- **Enhanced Interaction**: Hover elements, send keyboard events
- **Enhanced Observability**: Better console and network filtering

### Phase 3 (Planned)
- **Agentic Browsing**: Delegate tasks to Comet's AI
- **Task Monitoring**: Poll and monitor agentic task progress
- **Task Control**: Cancel or modify running agentic tasks
- **Tab Categorization**: Organize tabs by type (main, agent-browsing, sidecar)

## Installation

### From npm (Coming Soon)

```bash
pi install npm:@your-org/pi-comet
```

### From Git

```bash
pi install git:github.com/your-username/pi-comet
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/pi-comet.git
cd pi-comet

# Install dependencies
npm install

# Copy to Pi extensions directory
cp -r ~/.pi/agent/extensions/pi-comet
# or use symlink for development
ln -s $(pwd) ~/.pi/agent/extensions/pi-comet
```

## Quick Start

1. **Launch Comet Browser**

   ```bash
   pi
   /comet launch
   ```

2. **Authorize Session**

   ```bash
   /comet authorize
   ```

   Authorization expires after 15 minutes by default. Extend with:

   ```bash
   /comet authorize --duration 30  # 30 minutes
   ```

3. **Check Status**

   ```bash
   /comet status
   ```

## Commands

| Command | Description |
|---------|-------------|
| `/comet launch` | Launch Comet in headed mode (visible browser) |
| `/comet launch-headless` | Launch Comet in headless mode (background) |
| `/comet connect` | Connect to running Comet instance |
| `/comet authorize [options]` | Authorize current session (default: 15 min) |
| `/comet revoke` | Revoke authorization |
| `/comet status` | Show connection and authorization status |
| `/comet doctor` | Run diagnostics and health checks |
| `/comet onboard` | Show onboarding guide |

## Tools (LLM-Callable)

### Phase 1 (MVP - ✅ Complete)

| Tool | Description |
|------|-------------|
| `comet_launch` | Launch Comet browser in headed mode |
| `comet_launch_headless` | Launch Comet browser in headless mode |
| `comet_connect` | Connect to running Comet instance |
| `comet_tab` | Manage browser tabs (list, create, activate, close) |
| `comet_navigate` | Navigate to a URL |
| `comet_reload` | Reload the current page |
| `comet_get_title` | Get the current page title |
| `comet_get_url` | Get the current page URL |
| `comet_screenshot` | Capture a screenshot (PNG/JPEG) |
| `comet_evaluate` | Execute JavaScript in browser context |
| `comet_click` | Click an element by CSS selector |
| `comet_type` | Type text into an input field |
| `comet_scroll` | Scroll page or element into view |
| `comet_get_html` | Get page's outer HTML |
| `comet_list_console_messages` | Get browser console logs |
| `comet_list_network_requests` | List network requests |
| `comet_get_network_request` | Get network request details |


| Tool | Description |
|------|-------------|
| `comet_snapshot` | Capture DOM state with stable UIDs |
| `comet_wait_for` | Wait for elements, text, or custom conditions |
| `comet_fill` | Fill multiple form fields at once |
| `comet_key` | Send keyboard events |
| `comet_hover` | Hover over an element |

### Phase 3 (Planned)

| Tool | Description |
|------|-------------|
| `comet_ask` | Delegate browsing task to Comet AI |
| `comet_poll` | Monitor agentic task progress |
| `comet_stop` | Cancel agentic task |

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `COMET_PATH` | Override Comet executable path | Auto-detected |
| `COMET_DEBUG_PORT` | CDP port for connection | 9222 |
| `COMET_HEADLESS` | Default to headless mode | false |
| `COMET_TIMEOUT` | Default operation timeout | 30000 |

### Platform-Specific Setup

#### macOS

Comet is auto-detected in:
- `/Applications/Comet.app/Contents/MacOS/Comet`
- `/Applications/Perplexity Comet.app/Contents/MacOS/Comet`

Or set `COMET_PATH` manually:

```bash
export COMET_PATH="/custom/path/to/Comet"
```

#### Windows

Comet.exe must be in your PATH, or set `COMET_PATH`:

```powershell
set COMET_PATH=C:\Path\To\Comet.exe
```

#### WSL2

Mirrored networking is required for best experience:

```powershell
# In PowerShell (Windows)
wsl --set-version <distro> 2
```

The extension will automatically use PowerShell to launch Windows Comet.

## Examples

### Basic Navigation

```typescript
// Launch and navigate
await pi.sendUserMessage("Launch Comet and navigate to https://example.com");

// Pi will use:
// 1. comet_launch or comet_launch_headless
// 2. comet_navigate
// 3. comet_screenshot to verify
```

### Research Task

```typescript
// Ask Pi to research something
await pi.sendUserMessage("Research the latest AI frameworks and summarize the findings");

// Pi can use:
// 1. comet_navigate to visit documentation pages
// 2. comet_evaluate to extract content
// 3. comet_screenshot to verify state
```

### Form Automation

```typescript
// Future: Form filling
await pi.sendUserMessage("Go to the login page and fill in the credentials");
```

## Architecture

```
Pi Extension (pi-comet)
  ├─ CDP Client Module (chrome-remote-interface)
  ├─ Platform Detection (macOS/Windows/WSL/Linux)
  ├─ Session Management (authorization, timeouts)
  ├─ Tool Registry (TypeBox validation)
  └─ Comet AI Integration (Phase 3)
        ↓
    CDP WebSocket (port 9222)
        ↓
    Perplexity Comet Browser
```

## Security

- **Authorization Required**: Browser commands require explicit authorization via `/comet authorize`
- **Session-Based**: Authorization expires after timeout (default: 15 minutes)
- **Loopback-Only**: CDP connection only to 127.0.0.1
- **No Extension Required**: Unlike pi-chrome, no browser extension needed

## Troubleshooting

### Comet not found

```bash
/comet doctor
```

Check that Comet is installed and in the expected location, or set `COMET_PATH`.

### Port already in use

Change the CDP port:

```bash
export COMET_DEBUG_PORT=9223
/comet launch
```

### WSL networking issues

Ensure WSL2 is configured with mirrored networking:

```powershell
# In PowerShell
wsl --status
```

See [WSL documentation](https://learn.microsoft.com/en-us/windows/wsl/networking) for more.

## Development

### Project Structure

```
pi-comet/
├── package.json          # NPM package configuration
├── README.md             # This file
├── src/
│   ├── index.ts          # Extension entry point
│   └── modules/
│       ├── cdp-client.ts # CDP client implementation (Phase 1)
│       ├── platform.ts   # Platform detection (Phase 1)
│       ├── comet-ai.ts   # Comet AI integration (Phase 3)
│       └── tools.ts      # Tool registry (Phase 1)
└── docs/
    ├── api.md            # API documentation
    └── recipes.md        # Usage examples and recipes
```

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

Note: TypeScript files are loaded directly by [jiti](https://github.com/unjs/jiti) - no compilation required for development.

## Roadmap

See [PRD](/tmp/pi-comet-PRD.md) for detailed plans.

- **Phase 1**: MVP browser control (current)
- **Phase 2**: DOM interaction and observability
- **Phase 3**: Agentic browsing with Comet AI
- **Phase 4**: Headless mode and full platform support
- **Phase 5**: Polish and comprehensive documentation

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

1. Fork and clone the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Install dependencies: `npm install`
4. Link to Pi: `ln -s $(pwd) ~/.pi/agent/extensions/pi-comet`
5. Test with `pi`
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built on [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- Uses [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface)
- Inspired by [pi-chrome](https://github.com/earendil-works/pi-chrome) and [comet-mcp](https://github.com/smol-ai/comet-mcp)

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/pi-comet/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/pi-comet/discussions)
- **Pi Discord**: [Join the community](https://discord.gg/pi)

## See Also

- [Pi Documentation](https://pi.dev)
- [Perplexity Comet](https://www.perplexity.ai/comet)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)