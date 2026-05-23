# pi-comet API Documentation

This document describes the API for the pi-comet extension, including slash commands and tools.

## Slash Commands

### `/comet launch`

Launch Perplexity Comet browser in headed mode (visible browser).

**Usage:**
```
/comet launch
```

**Environment Variables:**
- `COMET_DEBUG_PORT` - Override default CDP port (default: 9222)

**Response:**
```typescript
{
  success: boolean;
  message: string;
  pid?: number;
}
```

### `/comet launch-headless`

Launch Perplexity Comet browser in headless mode (background process).

**Usage:**
```
/comet launch-headless
```

**Environment Variables:**
- `COMET_DEBUG_PORT` - Override default CDP port (default: 9222)

**Response:**
```typescript
{
  success: boolean;
  message: string;
  pid?: number;
}
```

### `/comet connect`

Connect to a running Comet browser instance.

**Usage:**
```
/comet connect
/comet connect --port 9223
```

**Parameters:**
- `--port <number>` - CDP port (default: 9222)

**Response:**
```typescript
{
  success: boolean;
  port?: number;
  error?: string;
}
```

### `/comet authorize`

Authorize the current session for browser automation.

**Usage:**
```
/comet authorize
/comet authorize --duration 30
```

**Parameters:**
- `--duration <minutes>` - Authorization duration in minutes (default: 15)

**Response:**
```typescript
{
  success: boolean;
  authorizedUntil?: number;  // Unix timestamp
  error?: string;
}
```

**Security:** Authorization is required for browser automation tools. Commands are blocked without authorization.

### `/comet revoke`

Revoke session authorization.

**Usage:**
```
/comet revoke
```

**Response:**
```typescript
{
  success: boolean;
}
```

### `/comet status`

Display current connection and authorization status.

**Usage:**
```
/comet status
```

**Response:**
```typescript
{
  success: boolean;
  status: {
    connected: boolean;
    port: number;
    headless: boolean;
    authorized: boolean;
    authorizedUntil?: string;  // ISO 8601 timestamp
  };
}
```

### `/comet doctor`

Run diagnostics and health checks.

**Usage:**
```
/comet doctor
```

**Checks Performed:**
- Platform detection
- Comet path availability
- CDP port availability
- Connection status

**Response:**
```typescript
{
  success: boolean;
  diagnostics: Array<{
    check: string;
    result: string;
    status: "ok" | "warning" | "error";
  }>;
}
```

### `/comet onboard`

Display onboarding guide.

**Usage:**
```
/comet onboard
```

**Response:**
```typescript
{
  success: boolean;
}
```

---

## Tools (LLM-Callable)

### comet_launch

Launch Perplexity Comet browser in headed mode.

**Parameters:**
```typescript
{
  port?: number;  // CDP port (default: 9222)
}
```

**Returns:**
```typescript
{
  content: Array<{ type: "text"; text: string }>;
  details: {
    pid?: number;
    port: number;
  };
  isError?: boolean;
}
```

### comet_launch_headless

Launch Perplexity Comet browser in headless mode.

**Parameters:**
```typescript
{
  port?: number;  // CDP port (default: 9222)
}
```

**Returns:**
```typescript
{
  content: Array<{ type: "text"; text: string }>;
  details: {
    pid?: number;
    port: number;
  };
  isError?: boolean;
}
```

### comet_connect

Connect to a running Comet browser instance.

**Parameters:**
```typescript
{
  port?: number;  // CDP port (default: 9222)
}
```

**Returns:**
```typescript
{
  content: Array<{ type: "text"; text: string }>;
  details: {
    port: number;
  };
  isError?: boolean;
}
```

### comet_navigate

Navigate to a URL in the active Comet browser tab.

**Parameters:**
```typescript
{
  url: string;          // URL to navigate to
  wait?: boolean;       // Wait for page load (default: true)
  timeout?: number;     // Maximum wait time in ms (default: 30000)
}
```

**Returns:**
```typescript
{
  content: Array<{ type: "text"; text: string }>;
  details: {
    url: string;
    loaded: boolean;
  };
  isError?: boolean;
}
```

**Phase:** 1 (MVP) - skeleton implemented, full CDP integration in progress

### comet_screenshot

Capture a screenshot of the current Comet browser tab.

**Parameters:**
```typescript
{
  format?: "png" | "jpeg";  // Image format (default: "png")
  quality?: number;         // JPEG quality 0-100 (only for jpeg)
}
```

**Returns:**
```typescript
{
  content: Array<{
    type: "image";
    source: {
      type: "base64";
      mediaType: "image/png" | "image/jpeg";
      data: string;
    };
  }>;
  details: {
    format: string;
    size?: { width: number; height: number };
  };
  isError?: boolean;
}
```

**Phase:** 1 (MVP) - skeleton implemented, full CDP integration in progress

### comet_evaluate

Execute JavaScript code in the Comet browser context.

**Parameters:**
```typescript
{
  expression: string;     // JavaScript expression to execute
  awaitPromise?: boolean; // Wait for promise resolution (default: true)
}
```

**Returns:**
```typescript
{
  content: Array<{ type: "text"; text: string }>;
  details: {
    result: any;
    type: string;
  };
  isError?: boolean;
}
```

**Phase:** 1 (MVP) - skeleton implemented, full CDP integration in progress

### comet_tab

Manage Comet browser tabs.

**Parameters:**
```typescript
{
  action: "list" | "create" | "activate" | "close";
  tabId?: string;      // Target tab ID (for activate, close)
  url?: string;        // URL to navigate to (for create)
}
```

**Returns:**

For `list`:
```typescript
{
  content: Array<{ type: "text"; text: string }>;
  details: {
    tabs: Array<{
      id: string;
      url: string;
      title: string;
      active: boolean;
    }>;
  };
}
```

For `create`:
```typescript
{
  content: Array<{ type: "text"; text: string }>;
  details: {
    tabId: string;
    url: string;
  };
}
```

For `activate` / `close`:
```typescript
{
  content: Array<{ type: "text"; text: string }>;
  details: {
    tabId: string;
  };
}
```

**Phase:** 1 (MVP) - skeleton implemented, full CDP integration in progress

---

## Planned Tools (Phase 2-5)

### Phase 2 - DOM Interaction

- `comet_click` - Click an element by selector or UID
- `comet_type` - Type text into an input field
- `comet_fill` - Fill form fields
- `comet_key` - Send keyboard events
- `comet_hover` - Hover over an element
- `comet_scroll` - Scroll the page
- `comet_snapshot` - Capture DOM state with stable UIDs
- `comet_wait_for` - Wait for conditions (selector, text, timeout)
- `comet_reload` - Reload the current page
- `comet_list_console_messages` - Get browser console logs
- `comet_list_network_requests` - List network activity
- `comet_get_network_request` - Get request/response details

### Phase 3 - Agentic Browsing

- `comet_ask` - Delegate browsing task to Comet AI
- `comet_poll` - Monitor agentic task progress
- `comet_stop` - Cancel agentic task

---

## Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `COMET_PATH` | string | auto-detected | Path to Comet executable |
| `COMET_DEBUG_PORT` | number | 9222 | CDP port for connection |
| `COMET_HEADLESS` | boolean | false | Default to headless mode |
| `COMET_TIMEOUT` | number | 30000 | Default operation timeout (ms) |

---

## Error Handling

All tools and commands may return errors in the following format:

```typescript
{
  success: false;
  error: string;  // Human-readable error message
  // ... additional context
}
```

Common errors:

- `"Not connected to Comet"` - Use `/comet launch` or `/comet connect` first
- `"Comet session not authorized"` - Use `/comet authorize` first
- `"Timeout waiting for Comet"` - Comet did not start in time
- `"Comet browser not supported on platform"` - Platform not yet supported
- `"Comet not found"` - Comet executable not found

---

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS | ✅ Supported | Auto-detects common installation paths |
| Windows | ✅ Supported | Requires Comet.exe in PATH or `COMET_PATH` |
| WSL2 | ⚠️ Partial | Requires mirrored networking |
| Linux | ❌ Not Supported | Comet not available for Linux |

---

## Security Model

### Authorization Flow

1. User must explicitly authorize session: `/comet authorize`
2. Authorization expires after timeout (default: 15 minutes)
3. Browser commands blocked without authorization
4. Revoke anytime: `/comet revoke`

### Security Features

- Loopback-only connection (127.0.0.1:9222)
- No network exposure in default configuration
- Session-based tokens (not persistent)
- User confirmation for destructive actions (planned)

### Limitations

- Requires Comet browser installation
- User must trust the extension
- Headless mode requires Comet executable in path
- WSL requires mirrored networking configuration

---

## Type Definitions

```typescript
// Comet state
interface CometState {
  isConnected: boolean;
  cdpClient?: any;
  debugPort: number;
  headless: boolean;
  cometPath?: string;
  authorized: boolean;
  authorizationExpiry?: number;
}

// Platform info
interface PlatformInfo {
  platform: "macos" | "windows" | "wsl" | "linux";
  cometPath?: string;
}

// Tool result
interface ToolResult {
  content: Array<{
    type: "text" | "image";
    text?: string;
    source?: {
      type: "base64";
      mediaType: string;
      data: string;
    };
  }>;
  details: Record<string, any>;
  isError?: boolean;
}
```

---

## See Also

- [README](../README.md) - User documentation
- [PRD](/tmp/pi-comet-PRD.md) - Product Requirements Document
- [CHANGELOG](../CHANGELOG.md) - Version history