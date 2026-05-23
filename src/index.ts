/**
 * pi-comet Extension for Perplexity Comet Browser Automation
 *
 * This extension provides tools for controlling Perplexity Comet browser
 * via Chrome DevTools Protocol (CDP), supporting both headed and headless modes.
 *
 * @module pi-comet
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// ============================================================================
// State Management
// ============================================================================

interface CometState {
  isConnected: boolean;
  cdpClient?: any;
  debugPort: number;
  headless: boolean;
  cometPath?: string;
  authorized: boolean;
  authorizationExpiry?: number;
}

let cometState: CometState = {
  isConnected: false,
  debugPort: 9222,
  headless: false,
  authorized: false,
};

// ============================================================================
// Platform Detection
// ============================================================================

interface PlatformInfo {
  platform: "macos" | "windows" | "wsl" | "linux";
  cometPath?: string;
}

async function detectPlatform(): Promise<PlatformInfo> {
  const platform = process.platform;
  let cometPath: string | undefined;

  if (platform === "darwin") {
    // macOS
    const commonPaths = [
      "/Applications/Comet.app/Contents/MacOS/Comet",
      "/Applications/Perplexity Comet.app/Contents/MacOS/Comet",
    ];
    for (const path of commonPaths) {
      try {
        await import("node:fs/promises").then((fs) => fs.access(path));
        cometPath = path;
        break;
      } catch {
        // Path doesn't exist, continue
      }
    }
    return { platform: "macos", cometPath };
  } else if (platform === "win32") {
    // Windows
    return { platform: "windows" };
  } else {
    // Linux or WSL
    try {
      const { execSync } = await import("node:child_process");
      const isWSL = execSync("uname -r", { encoding: "utf-8" }).includes("microsoft");
      if (isWSL) {
        return { platform: "wsl" };
      }
    } catch {
      // Ignore error
    }
    return { platform: "linux" };
  }
}

// ============================================================================
// Comet Browser Control
// ============================================================================

async function launchComet(options: { headless?: boolean; port?: number } = {}) {
  const { headless = false, port = 9222 } = options;
  const fs = await import("node:fs/promises");
  const { spawn } = await import("node:child_process");

  const platform = await detectPlatform();
  let args: string[] = [];
  let command: string;

  if (platform.platform === "macos") {
    command = platform.cometPath || "open";
    if (command === "open") {
      args = ["-a", "Comet", `--args`, `--remote-debugging-port=${port}`];
    } else {
      args = [`--remote-debugging-port=${port}`];
    }
  } else if (platform.platform === "windows") {
    // Windows implementation
    command = "Comet.exe";
    args = [`--remote-debugging-port=${port}`];
    if (headless) {
      args.push("--headless");
    }
  } else if (platform.platform === "wsl") {
    // WSL implementation - use PowerShell to launch Windows Comet
    command = "powershell.exe";
    const psArgs = [`Start-Process`, `"Comet.exe"`, `-ArgumentList`, `"--remote-debugging-port=${port}"`];
    if (headless) {
      psArgs.push(`"--headless"`);
    }
    args = ["-Command", psArgs.join(" ")];
  } else {
    throw new Error(`Comet browser not supported on platform: ${platform.platform}`);
  }

  const process = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });

  process.unref();

  // Wait for CDP port to be available
  await waitForDebugPort(port);

  cometState.isConnected = true;
  cometState.debugPort = port;
  cometState.headless = headless;
  cometState.cometPath = platform.cometPath;

  return {
    success: true,
    message: headless
      ? `Comet launched in headless mode on port ${port}`
      : `Comet launched on port ${port}`,
    pid: process.pid,
  };
}

async function waitForDebugPort(port: number, timeout = 30000): Promise<void> {
  const net = await import("node:net");
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkConnection = () => {
      const socket = net.createConnection(port, "127.0.0.1", () => {
        socket.destroy();
        resolve();
      });

      socket.on("error", () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for Comet on port ${port}`));
        } else {
          setTimeout(checkConnection, 500);
        }
      });

      socket.on("close", () => {
        // Ignore, will retry if timeout not reached
      });
    };

    checkConnection();
  });
}

// ============================================================================
// Extension Entry Point
// ============================================================================

export default async function (pi: ExtensionAPI) {
  // Register slash commands
  pi.registerCommand("comet", {
    description: "Comet browser automation commands",
    handler: async (args, ctx) => {
      const subCommand = args.split(" ")[0];

      switch (subCommand) {
        case "launch":
          return handleLaunch(ctx);
        case "launch-headless":
          return handleLaunchHeadless(ctx);
        case "connect":
          return handleConnect(args, ctx);
        case "authorize":
          return handleAuthorize(args, ctx);
        case "revoke":
          return handleRevoke(ctx);
        case "status":
          return handleStatus(ctx);
        case "doctor":
          return handleDoctor(ctx);
        case "onboard":
          return handleOnboard(ctx);
        default:
          ctx.ui.notify(
            `Unknown comet command: ${subCommand}\nAvailable: launch, launch-headless, connect, authorize, revoke, status, doctor, onboard`,
            "error"
          );
      }
    },
  });

  // Phase 1: Core Browser Control Tools (MVP)
  registerPhase1Tools(pi);

  // Session management
  pi.on("session_start", async (_event, ctx) => {
    // Restore authorization state from session if persisted
    ctx.ui.notify("pi-comet extension loaded", "info");
  });
}

// ============================================================================
// Command Handlers
// ============================================================================

async function handleLaunch(ctx: any) {
  try {
    ctx.ui.notify("Launching Comet browser...", "info");
    const result = await launchComet({ headless: false });
    ctx.ui.notify(result.message, "success");
    return { success: true, ...result };
  } catch (error: any) {
    ctx.ui.notify(`Failed to launch Comet: ${error.message}`, "error");
    return { success: false, error: error.message };
  }
}

async function handleLaunchHeadless(ctx: any) {
  try {
    ctx.ui.notify("Launching Comet browser in headless mode...", "info");
    const result = await launchComet({ headless: true });
    ctx.ui.notify(result.message, "success");
    return { success: true, ...result };
  } catch (error: any) {
    ctx.ui.notify(`Failed to launch Comet: ${error.message}`, "error");
    return { success: false, error: error.message };
  }
}

async function handleConnect(args: string, ctx: any) {
  const portMatch = args.match(/--port\s+(\d+)/);
  const port = portMatch ? parseInt(portMatch[1]) : 9222;

  try {
    await waitForDebugPort(port);
    cometState.isConnected = true;
    cometState.debugPort = port;
    ctx.ui.notify(`Connected to Comet on port ${port}`, "success");
    return { success: true, port };
  } catch (error: any) {
    ctx.ui.notify(`Failed to connect to Comet: ${error.message}`, "error");
    return { success: false, error: error.message };
  }
}

async function handleAuthorize(args: string, ctx: any) {
  const durationMatch = args.match(/--duration\s+(\d+)/);
  const duration = durationMatch ? parseInt(durationMatch[1]) * 60 * 1000 : 15 * 60 * 1000; // Default 15 minutes

  if (!cometState.isConnected) {
    ctx.ui.notify("Not connected to Comet. Use /comet launch or /comet connect first.", "error");
    return { success: false, error: "Not connected to Comet" };
  }

  cometState.authorized = true;
  cometState.authorizationExpiry = Date.now() + duration;

  const minutes = Math.round(duration / 60 / 1000);
  ctx.ui.notify(`Comet authorized for ${minutes} minutes`, "success");
  return { success: true, authorizedUntil: cometState.authorizationExpiry };
}

async function handleRevoke(ctx: any) {
  cometState.authorized = false;
  cometState.authorizationExpiry = undefined;
  ctx.ui.notify("Comet authorization revoked", "info");
  return { success: true };
}

async function handleStatus(ctx: any) {
  const status = {
    connected: cometState.isConnected,
    port: cometState.debugPort,
    headless: cometState.headless,
    authorized: cometState.authorized,
    authorizedUntil: cometState.authorizationExpiry
      ? new Date(cometState.authorizationExpiry).toISOString()
      : null,
  };

  const statusText = [
    `Connected: ${status.connected}`,
    `Port: ${status.port}`,
    `Mode: ${status.headless ? "headless" : "headed"}`,
    `Authorized: ${status.authorized}`,
    status.authorizedUntil ? `Authorization expires: ${status.authorizedUntil}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  ctx.ui.notify(statusText, "info");
  return { success: true, status };
}

async function handleDoctor(ctx: any) {
  const diagnostics: any[] = [];

  // Platform detection
  const platform = await detectPlatform();
  diagnostics.push({ check: "Platform", result: platform.platform, status: "ok" });

  // Comet path
  if (platform.cometPath) {
    diagnostics.push({ check: "Comet Path", result: platform.cometPath, status: "ok" });
  } else if (platform.platform === "windows" || platform.platform === "wsl") {
    diagnostics.push({
      check: "Comet Path",
      result: "Comet.exe (assumed in PATH)",
      status: "warning",
    });
  } else {
    diagnostics.push({ check: "Comet Path", result: "Not found", status: "error" });
  }

  // Port availability
  try {
    await waitForDebugPort(cometState.debugPort, 2000);
    diagnostics.push({
      check: "CDP Port",
      result: `Port ${cometState.debugPort} is available`,
      status: "ok",
    });
  } catch {
    diagnostics.push({
      check: "CDP Port",
      result: `Port ${cometState.debugPort} not responding`,
      status: "error",
    });
  }

  // Connection status
  diagnostics.push({
    check: "Connection",
    result: cometState.isConnected ? "Connected" : "Not connected",
    status: cometState.isConnected ? "ok" : "warning",
  });

  const diagnosticsText = diagnostics
    .map((d) => `[${d.status.toUpperCase()}] ${d.check}: ${d.result}`)
    .join("\n");

  ctx.ui.notify(`Comet Diagnostics:\n${diagnosticsText}`, "info");
  return { success: true, diagnostics };
}

async function handleOnboard(ctx: any) {
  const onboardingGuide = `
Welcome to pi-comet! This extension helps you control Perplexity Comet browser.

Quick Start:
1. Launch Comet: /comet launch
2. Authorize session: /comet authorize
3. Use browser automation tools

Commands:
  /comet launch         - Launch Comet in headed mode (visible browser)
  /comet launch-headless - Launch Comet in headless mode (background)
  /comet connect         - Connect to running Comet instance
  /comet authorize       - Authorize current session (default: 15 min)
  /comet revoke          - Revoke authorization
  /comet status          - Show connection and authorization status
  /comet doctor          - Run diagnostics and health checks
  /comet onboard         - Show this onboarding guide

Environment Variables:
  COMET_PATH          - Override Comet executable path
  COMET_DEBUG_PORT    - Override default CDP port (default: 9222)
  COMET_HEADLESS      - Default to headless mode (default: false)
  COMET_TIMEOUT       - Default operation timeout (default: 30s)

For more information, visit: https://github.com/your-username/pi-comet
`;

  ctx.ui.notify(onboardingGuide, "info");
  return { success: true };
}

// ============================================================================
// Phase 1 Tools (MVP)
// ============================================================================

function registerPhase1Tools(pi: ExtensionAPI) {
  // Tab Management
  pi.registerTool({
    name: "comet_tab",
    label: "Comet Tab",
    description: "List, create, activate, or close Comet browser tabs",
    promptSnippet: "Manage Comet browser tabs",
    parameters: Type.Object({
      action: Type.String({
        description: "Action to perform: 'list', 'create', 'activate', 'close'",
      }),
      tabId: Type.Optional(
        Type.String({
          description: "Target tab ID (for activate, close actions)",
        })
      ),
      url: Type.Optional(
        Type.String({
          description: "URL to navigate to (for create action)",
        })
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      if (!cometState.authorized) {
        return {
          content: [
            {
              type: "text",
              text: "Comet session not authorized. Use `/comet authorize` first.",
            },
          ],
          details: {},
        };
      }

      if (!cometState.isConnected) {
        return {
          content: [
            {
              type: "text",
              text: "Not connected to Comet. Use `/comet launch` or `/comet connect` first.",
            },
          ],
          details: {},
        };
      }

      // TODO: Implement actual CDP operations
      return {
        content: [
          {
            type: "text",
            text: `Tab action '${params.action}' not yet implemented in Phase 1 MVP.`,
          },
        ],
        details: {},
      };
    },
  });

  // Launch Tool
  pi.registerTool({
    name: "comet_launch",
    label: "Comet Launch",
    description: "Launch Perplexity Comet browser in headed mode (visible)",
    promptSnippet: "Launch Comet browser",
    parameters: Type.Object({
      port: Type.Optional(
        Type.Number({
          description: "CDP port to use (default: 9222)",
        })
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      try {
        onUpdate?.({ content: [{ type: "text", text: "Launching Comet..." }] });
        const result = await launchComet({ headless: false, port: params.port });
        return {
          content: [
            {
              type: "text",
              text: result.message,
            },
          ],
          details: { pid: result.pid, port: cometState.debugPort },
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to launch Comet: ${error.message}`,
            },
          ],
          details: {},
          isError: true,
        };
      }
    },
  });

  // Launch Headless Tool
  pi.registerTool({
    name: "comet_launch_headless",
    label: "Comet Launch Headless",
    description: "Launch Perplexity Comet browser in headless mode (background)",
    promptSnippet: "Launch Comet in headless mode",
    parameters: Type.Object({
      port: Type.Optional(
        Type.Number({
          description: "CDP port to use (default: 9222)",
        })
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      try {
        onUpdate?.({ content: [{ type: "text", text: "Launching Comet in headless mode..." }] });
        const result = await launchComet({ headless: true, port: params.port });
        return {
          content: [
            {
              type: "text",
              text: result.message,
            },
          ],
          details: { pid: result.pid, port: cometState.debugPort },
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to launch Comet: ${error.message}`,
            },
          ],
          details: {},
          isError: true,
        };
      }
    },
  });

  // Connect Tool
  pi.registerTool({
    name: "comet_connect",
    label: "Comet Connect",
    description: "Connect to a running Comet browser instance",
    promptSnippet: "Connect to running Comet instance",
    parameters: Type.Object({
      port: Type.Optional(
        Type.Number({
          description: "CDP port (default: 9222)",
        })
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      try {
        const port = params.port || 9222;
        onUpdate?.({ content: [{ type: "text", text: `Connecting to Comet on port ${port}...` }] });
        await waitForDebugPort(port);
        cometState.isConnected = true;
        cometState.debugPort = port;
        return {
          content: [
            {
              type: "text",
              text: `Connected to Comet on port ${port}`,
            },
          ],
          details: { port },
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to connect to Comet: ${error.message}`,
            },
          ],
          details: {},
          isError: true,
        };
      }
    },
  });

  // Navigate Tool
  pi.registerTool({
    name: "comet_navigate",
    label: "Comet Navigate",
    description: "Navigate to a URL in Comet browser",
    promptSnippet: "Navigate to a URL",
    parameters: Type.Object({
      url: Type.String({
        description: "URL to navigate to",
      }),
      wait: Type.Optional(
        Type.Boolean({
          description: "Wait for page load to complete (default: true)",
        })
      ),
      timeout: Type.Optional(
        Type.Number({
          description: "Maximum wait time in milliseconds (default: 30000)",
        })
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      if (!cometState.authorized) {
        return {
          content: [
            {
              type: "text",
              text: "Comet session not authorized. Use `/comet authorize` first.",
            },
          ],
          details: {},
        };
      }

      // TODO: Implement actual CDP navigation
      return {
        content: [
          {
            type: "text",
            text: `Navigation to ${params.url} not yet implemented in Phase 1 MVP.`,
          },
        ],
        details: {},
      };
    },
  });

  // Screenshot Tool
  pi.registerTool({
    name: "comet_screenshot",
    label: "Comet Screenshot",
    description: "Capture a screenshot of the current Comet browser tab",
    promptSnippet: "Capture browser screenshot",
    parameters: Type.Object({
      format: Type.Optional(
        Type.String({
          description: "Image format: 'png' or 'jpeg' (default: 'png')",
        })
      ),
      quality: Type.Optional(
        Type.Number({
          description: "JPEG quality 0-100 (only for jpeg format)",
        })
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      if (!cometState.authorized) {
        return {
          content: [
            {
              type: "text",
              text: "Comet session not authorized. Use `/comet authorize` first.",
            },
          ],
          details: {},
        };
      }

      // TODO: Implement actual CDP screenshot
      return {
        content: [
          {
            type: "text",
            text: "Screenshot capture not yet implemented in Phase 1 MVP.",
          },
        ],
        details: {},
      };
    },
  });

  // Evaluate JavaScript Tool
  pi.registerTool({
    name: "comet_evaluate",
    label: "Comet Evaluate",
    description: "Execute JavaScript code in the Comet browser context",
    promptSnippet: "Execute JavaScript in browser",
    parameters: Type.Object({
      expression: Type.String({
        description: "JavaScript expression to execute",
      }),
      awaitPromise: Type.Optional(
        Type.Boolean({
          description: "Wait for promise resolution (default: true)",
        })
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      if (!cometState.authorized) {
        return {
          content: [
            {
              type: "text",
              text: "Comet session not authorized. Use `/comet authorize` first.",
            },
          ],
          details: {},
        };
      }

      // TODO: Implement actual CDP evaluate
      return {
        content: [
          {
            type: "text",
            text: "JavaScript evaluation not yet implemented in Phase 1 MVP.",
          },
        ],
        details: {},
      };
    },
  });
}