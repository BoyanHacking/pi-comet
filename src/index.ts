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
import {
  getTargets,
  connectToTarget,
  connectToFirstTarget,
  navigate,
  reload,
  screenshot,
  evaluate,
  getTitle,
  getURL,
  getSnapshot,
  getDocumentHTML,
  click,
  type as typeText,
  scroll,
  closeClient,
  createTab,
  closeTab,
  activateTab,
  startConsoleLogging,
  getConsoleMessages,
  clearConsoleMessages,
  startNetworkMonitoring,
  getNetworkRequests,
  getNetworkRequest,
  clearNetworkRequests,
  type CDPTab,
  type CDPClient,
  type ConsoleMessage,
  type NetworkRequest,
} from "./modules/cdp-client.js";

// ============================================================================
// State Management
// ============================================================================

interface CometState {
  isConnected: boolean;
  cdpClient: CDPClient | null;
  debugPort: number;
  headless: boolean;
  cometPath?: string;
  authorized: boolean;
  authorizationExpiry?: number;
  targets: CDPTab[];
  activeTargetId?: string;
  consoleLogging: boolean;
  networkMonitoring: boolean;
}

let cometState: CometState = {
  isConnected: false,
  cdpClient: null,
  debugPort: 9222,
  headless: false,
  authorized: false,
  targets: [],
  activeTargetId: undefined,
  consoleLogging: false,
  networkMonitoring: false,
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
        const fs = await import("node:fs/promises");
        await fs.access(path);
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
  const { spawn, execSync } = await import("node:child_process");

  const platform = await detectPlatform();
  
  // Check if Comet is installed
  if (platform.platform === "wsl" || platform.platform === "windows") {
    try {
      // Try to find Comet.exe
      const comPath = platform.platform === "wsl" 
        ? "/mnt/c/Program Files/Perplexity Comet/Comet.exe"
        : "C:\\Program Files\\Perplexity Comet\\Comet.exe";
      
      // Check for common installation paths
      const commonPaths = [
        "/mnt/c/Program Files/Perplexity Comet/Comet.exe",
        "/mnt/c/Program Files (x86)/Perplexity Comet/Comet.exe",
        "/mnt/c/Users/*/AppData/Local/Programs/Perplexity Comet/Comet.exe",
      ];
      
      let cometExePath: string | undefined;
      
      for (const path of commonPaths) {
        try {
          execSync(`test -f "${path}"`, { stdio: "ignore" });
          cometExePath = path;
          break;
        } catch {
          // Path doesn't exist, continue
        }
      }
      
      if (!cometExePath) {
        throw new Error(
          "Comet browser not found. Please install Perplexity Comet from https://www.perplexity.ai/comet\n" +
          "Expected locations:\n" +
          "  - C:\\Program Files\\Perplexity Comet\\Comet.exe\n" +
          "  - C:\\Program Files (x86)\\Perplexity Comet\\Comet.exe\n" +
          "  - %LOCALAPPDATA%\\Programs\\Perplexity Comet\\Comet.exe"
        );
      }
      
      platform.cometPath = cometExePath;
    } catch (error: any) {
      if (error.message.includes("Comet browser not found")) {
        throw error;
      }
      // Continue with default path if error is something else
    }
  }
  
  let args: string[] = [];
  let command: string;

  if (platform.platform === "macos") {
    command = platform.cometPath || "open";
    if (command === "open") {
      args = ["-a", "Comet", "--args", `--remote-debugging-port=${port}`];
    } else {
      args = [`--remote-debugging-port=${port}`];
    }
  } else if (platform.platform === "windows") {
    // Windows implementation
    command = platform.cometPath || "Comet.exe";
    args = [`--remote-debugging-port=${port}`];
    if (headless) {
      args.push("--headless");
    }
  } else if (platform.platform === "wsl") {
    // WSL implementation - use cmd.exe to launch Windows Comet
    command = "cmd.exe";
    const comPath = platform.cometPath || "C:\\Program Files\\Perplexity Comet\\Comet.exe";
    const comArgs = [`--remote-debugging-port=${port}`];
    if (headless) {
      comArgs.push("--headless");
    }
    // Use /c flag and wrap the path in quotes
    args = ["/c", `start "" "${comPath}" ${comArgs.join(" ")}`];
  } else {
    throw new Error(`Comet browser not supported on platform: ${platform.platform}`);
  }

  console.log(`Launching Comet: ${command} ${args.join(" ")}`);

  const process = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    shell: platform.platform === "wsl" || platform.platform === "windows",
  });

  process.unref();

  // Wait longer for CDP port to be available (Comet takes time to start)
  console.log(`Waiting for Comet to start on port ${port}...`);
  try {
    await waitForDebugPort(port, 60000); // 60 second timeout
  } catch (error: any) {
    throw new Error(
      `Failed to connect to Comet CDP port ${port}.\n` +
      `This could mean:\n` +
      `  - Comet did not start successfully\n` +
      `  - Comet doesn't support Chrome DevTools Protocol\n` +
      `  - Port ${port} is blocked by firewall or another application\n` +
      `  - Comet is already running with a different instance\n\n` +
      `Try launching Comet manually first to verify installation.`
    );
  }

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
  const checkInterval = 1000; // Check every second

  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkConnection = () => {
      attempts++;
      const elapsed = Date.now() - startTime;
      
      if (elapsed > timeout) {
        reject(new Error(`Timeout waiting for Comet on port ${port} after ${elapsed}ms`));
        return;
      }
      
      const socket = net.createConnection(port, "127.0.0.1", () => {
        console.log(`Connected to Comet on port ${port} after ${elapsed}ms`);
        socket.destroy();
        resolve();
      });

      socket.on("error", () => {
        socket.destroy();
        if (elapsed < timeout) {
          // Log progress periodically
          if (attempts % 5 === 0) {
            console.log(`Still waiting for Comet... (${elapsed}ms elapsed)`);
          }
          setTimeout(checkConnection, checkInterval);
        } else {
          reject(new Error(`Timeout waiting for Comet on port ${port} after ${elapsed}ms`));
        }
      });

      socket.on("close", () => {
        // Connection closed, retry
        if (elapsed < timeout) {
          setTimeout(checkConnection, checkInterval);
        }
      });
    };

    checkConnection();
  });
}

async function refreshTargets(): Promise<void> {
  cometState.targets = await getTargets(cometState.debugPort);
  if (!cometState.activeTargetId && cometState.targets.length > 0) {
    cometState.activeTargetId = cometState.targets[0].id;
  }
}

async function ensureConnected(): Promise<CDPClient> {
  if (!cometState.isConnected) {
    throw new Error("Not connected to Comet. Use `/comet launch` or `/comet connect` first.");
  }

  if (!cometState.authorized) {
    throw new Error("Comet session not authorized. Use `/comet authorize` first.");
  }

  if (!cometState.cdpClient || !cometState.activeTargetId) {
    await refreshTargets();
    if (cometState.targets.length === 0) {
      throw new Error("No targets available. Is Comet running?");
    }
    
    cometState.activeTargetId = cometState.targets[0].id;
    cometState.cdpClient = await connectToTarget(
      cometState.activeTargetId,
      cometState.debugPort
    );
    
    // Start monitoring if not already started
    if (!cometState.consoleLogging) {
      await startConsoleLogging(cometState.cdpClient.client);
      cometState.consoleLogging = true;
    }
    if (!cometState.networkMonitoring) {
      await startNetworkMonitoring(cometState.cdpClient.client);
      cometState.networkMonitoring = true;
    }
  }

  return cometState.cdpClient;
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

  // Register all tools
  registerCoreTools(pi);
  registerNavigationTools(pi);
  registerInteractionTools(pi);
  registerObservabilityTools(pi);

  // Session management
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("pi-comet extension loaded", "info");
  });

  pi.on("session_shutdown", async (_event, _ctx) => {
    // Cleanup CDP connection
    if (cometState.cdpClient) {
      await closeClient(cometState.cdpClient);
      cometState.cdpClient = null;
    }
  });
}

// ============================================================================
// Command Handlers
// ============================================================================

async function handleLaunch(ctx: any) {
  try {
    ctx.ui.notify("Launching Comet browser...", "info");
    const result = await launchComet({ headless: false });
    
    // Wait a bit for Comet to fully start, then refresh targets
    setTimeout(async () => {
      await refreshTargets();
    }, 2000);
    
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
    
    // Wait for Comet to fully start
    setTimeout(async () => {
      await refreshTargets();
    }, 2000);
    
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
    ctx.ui.notify(`Connecting to Comet on port ${port}...`, "info");
    
    // Check if we can connect immediately (Comet already running)
    try {
      await waitForDebugPort(port, 5000); // Quick check first
    } catch {
      ctx.ui.notify(
        `Comet not running on port ${port}. Please launch Comet first using:\n` +
        `  /comet launch\n` +
        `  /comet launch-headless\n\n` +
        `Or start Comet manually with remote debugging enabled.`,
        "warning"
      );
      return { success: false, error: `Comet not running on port ${port}` };
    }
    
    cometState.debugPort = port;
    await refreshTargets();
    
    cometState.isConnected = true;
    ctx.ui.notify(`Connected to Comet on port ${port} with ${cometState.targets.length} tab(s)`, "success");
    return { success: true, port, tabs: cometState.targets.length };
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
  await refreshTargets();
  
  const status = {
    connected: cometState.isConnected,
    port: cometState.debugPort,
    headless: cometState.headless,
    authorized: cometState.authorized,
    authorizedUntil: cometState.authorizationExpiry
      ? new Date(cometState.authorizationExpiry).toISOString()
      : null,
    tabs: cometState.targets.length,
    activeTab: cometState.activeTargetId,
    consoleLogging: cometState.consoleLogging,
    networkMonitoring: cometState.networkMonitoring,
  };

  const statusText = [
    `Connected: ${status.connected}`,
    `Port: ${status.port}`,
    `Mode: ${status.headless ? "headless" : "headed"}`,
    `Authorized: ${status.authorized}`,
    status.authorizedUntil ? `Authorization expires: ${status.authorizedUntil}` : "",
    `Tabs: ${status.tabs}`,
    status.activeTab ? `Active tab: ${status.activeTab.substring(0, 8)}...` : "",
    `Console logging: ${status.consoleLogging ? "enabled" : "disabled"}`,
    `Network monitoring: ${status.networkMonitoring ? "enabled" : "disabled"}`,
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

  // Authorization status
  diagnostics.push({
    check: "Authorization",
    result: cometState.authorized ? "Authorized" : "Not authorized",
    status: cometState.authorized ? "ok" : "warning",
  });

  // Target count
  if (cometState.isConnected) {
    try {
      await refreshTargets();
      diagnostics.push({
        check: "Targets",
        result: `${cometState.targets.length} tab(s) available`,
        status: "ok",
      });
    } catch (error: any) {
      diagnostics.push({
        check: "Targets",
        result: `Failed to list targets: ${error.message}`,
        status: "error",
      });
    }
  }

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

For more information, visit: https://github.com/BoyanHacking/pi-comet
`;

  ctx.ui.notify(onboardingGuide, "info");
  return { success: true };
}

// ============================================================================
// Core Tools
// ============================================================================

function registerCoreTools(pi: ExtensionAPI) {
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
        
        // Wait for Comet to fully start
        setTimeout(async () => {
          await refreshTargets();
        }, 2000);
        
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
        
        setTimeout(async () => {
          await refreshTargets();
        }, 2000);
        
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
        cometState.debugPort = port;
        await refreshTargets();
        
        cometState.isConnected = true;
        
        return {
          content: [
            {
              type: "text",
              text: `Connected to Comet on port ${port} with ${cometState.targets.length} tab(s)`,
            },
          ],
          details: { port, tabs: cometState.targets.length },
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

  // Tab Management Tool
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
      try {
        const client = await ensureConnected();
        
        switch (params.action) {
          case "list": {
            await refreshTargets();
            const tabs = cometState.targets.map((t) => ({
              id: t.id,
              title: t.title,
              url: t.url,
              active: t.id === cometState.activeTargetId,
            }));
            
            const text = tabs
              .map((t, i) => `${i + 1}. [${t.active ? "ACTIVE" : "      "}] ${t.title}`)
              .join("\n");
            
            return {
              content: [{ type: "text", text }],
              details: { tabs },
            };
          }
          
          case "create": {
            const newTab = await createTab(cometState.debugPort);
            if (params.url) {
              await refreshTargets();
              const client = await connectToTarget(newTab.id, cometState.debugPort);
              await navigate(client.client, { url: params.url });
              cometState.activeTargetId = newTab.id;
              await closeClient(cometState.cdpClient!);
              cometState.cdpClient = null;
            }
            await refreshTargets();
            
            return {
              content: [{ type: "text", text: `Created new tab: ${newTab.id}` }],
              details: { tabId: newTab.id },
            };
          }
          
          case "activate": {
            if (!params.tabId) {
              throw new Error("tabId is required for activate action");
            }
            await activateTab(params.tabId, cometState.debugPort);
            cometState.activeTargetId = params.tabId;
            
            // Reconnect to the new active tab
            if (cometState.cdpClient) {
              await closeClient(cometState.cdpClient);
            }
            cometState.cdpClient = await connectToTarget(params.tabId, cometState.debugPort);
            
            return {
              content: [{ type: "text", text: `Activated tab: ${params.tabId}` }],
              details: { tabId: params.tabId },
            };
          }
          
          case "close": {
            if (!params.tabId) {
              throw new Error("tabId is required for close action");
            }
            await closeTab(params.tabId, cometState.debugPort);
            
            // If closing the active tab, switch to another
            if (params.tabId === cometState.activeTargetId) {
              await refreshTargets();
              if (cometState.targets.length > 0) {
                cometState.activeTargetId = cometState.targets[0].id;
                if (cometState.cdpClient) {
                  await closeClient(cometState.cdpClient);
                }
                cometState.cdpClient = await connectToTarget(cometState.activeTargetId, cometState.debugPort);
              } else {
                cometState.activeTargetId = undefined;
                cometState.cdpClient = null;
              }
            }
            await refreshTargets();
            
            return {
              content: [{ type: "text", text: `Closed tab: ${params.tabId}` }],
              details: { tabId: params.tabId },
            };
          }
          
          default:
            throw new Error(`Unknown action: ${params.action}`);
        }
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Tab action failed: ${error.message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });
}

// ============================================================================
// Navigation Tools
// ============================================================================

function registerNavigationTools(pi: ExtensionAPI) {
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
      try {
        const client = await ensureConnected();
        
        onUpdate?.({ content: [{ type: "text", text: `Navigating to ${params.url}...` }] });
        
        const result = await navigate(client.client, {
          url: params.url,
          wait: params.wait,
          timeout: params.timeout,
        });
        
        return {
          content: [
            {
              type: "text",
              text: `Navigated to ${result.url}${result.loaded ? " (page loaded)" : ""}`,
            },
          ],
          details: result,
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Navigation failed: ${error.message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });

  // Reload Tool
  pi.registerTool({
    name: "comet_reload",
    label: "Comet Reload",
    description: "Reload the current page",
    promptSnippet: "Reload current page",
    parameters: Type.Object({
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
      try {
        const client = await ensureConnected();
        
        onUpdate?.({ content: [{ type: "text", text: "Reloading page..." }] });
        
        await reload(client.client, params.wait, params.timeout);
        
        return {
          content: [{ type: "text", text: "Page reloaded" }],
          details: {},
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Reload failed: ${error.message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });

  // Get Title Tool
  pi.registerTool({
    name: "comet_get_title",
    label: "Comet Get Title",
    description: "Get the current page title",
    promptSnippet: "Get page title",
    parameters: Type.Object({}),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      try {
        const client = await ensureConnected();
        const title = await getTitle(client.client);
        
        return {
          content: [{ type: "text", text: title }],
          details: { title },
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Failed to get title: ${error.message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });

  // Get URL Tool
  pi.registerTool({
    name: "comet_get_url",
    label: "Comet Get URL",
    description: "Get the current page URL",
    promptSnippet: "Get page URL",
    parameters: Type.Object({}),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      try {
        const client = await ensureConnected();
        const url = await getURL(client.client);
        
        return {
          content: [{ type: "text", text: url }],
          details: { url },
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Failed to get URL: ${error.message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });
}

// ============================================================================
// Interaction Tools
// ============================================================================

function registerInteractionTools(pi: ExtensionAPI) {
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
      try {
        const client = await ensureConnected();
        
        onUpdate?.({ content: [{ type: "text", text: "Capturing screenshot..." }] });
        
        const data = await screenshot(client.client, {
          format: params.format as "png" | "jpeg",
          quality: params.quality,
        });
        
        return {
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                mediaType: `image/${params.format || "png"}`,
                data,
              },
            },
          ],
          details: { format: params.format || "png" },
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Screenshot failed: ${error.message}` }],
          details: {},
          isError: true,
        };
      }
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
      try {
        const client = await ensureConnected();
        
        onUpdate?.({ content: [{ type: "text", text: "Executing JavaScript..." }] });
        
        const result = await evaluate(client.client, {
          expression: params.expression,
          awaitPromise: params.awaitPromise,
        });
        
        const resultText = typeof result.result === "object"
          ? JSON.stringify(result.result, null, 2)
          : String(result.result);
        
        return {
          content: [
            {
              type: "text",
              text: `Result (${result.type}):\n${resultText}`,
            },
          ],
          details: result,
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Evaluation failed: ${error.message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });

  // Click Tool
  pi.registerTool({
    name: "comet_click",
    label: "Comet Click",
    description: "Click an element by CSS selector",
    promptSnippet: "Click element on page",
    parameters: Type.Object({
      selector: Type.String({
        description: "CSS selector for the element to click",
      }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      try {
        const client = await ensureConnected();
        
        onUpdate?.({ content: [{ type: "text", text: `Clicking element: ${params.selector}...` }] });
        
        await click(client.client, params.selector);
        
        return {
          content: [{ type: "text", text: `Clicked element: ${params.selector}` }],
          details: { selector: params.selector },
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Click failed: ${error.message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });

  // Type Tool
  pi.registerTool({
    name: "comet_type",
    label: "Comet Type",
    description: "Type text into an input field",
    promptSnippet: "Type text into input field",
    parameters: Type.Object({
      selector: Type.String({
        description: "CSS selector for the input field",
      }),
      text: Type.String({
        description: "Text to type",
      }),
      clear: Type.Optional(
        Type.Boolean({
          description: "Clear the field before typing (default: true)",
        })
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      try {
        const client = await ensureConnected();
        
        onUpdate?.({ content: [{ type: "text", text: `Typing into: ${params.selector}...` }] });
        
        await typeText(client.client, params.selector, params.text, params.clear);
        
        return {
          content: [{ type: "text", text: `Typed "${params.text}" into ${params.selector}` }],
          details: { selector: params.selector, text: params.text },
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Type failed: ${error.message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });

  // Scroll Tool
  pi.registerTool({
    name: "comet_scroll",
    label: "Comet Scroll",
    description: "Scroll the page or scroll an element into view",
    promptSnippet: "Scroll page or element",
    parameters: Type.Object({
      x: Type.Optional(
        Type.Number({
          description: "Horizontal scroll position (for page scroll)",
        })
      ),
      y: Type.Optional(
        Type.Number({
          description: "Vertical scroll position (for page scroll)",
        })
      ),
      selector: Type.Optional(
        Type.String({
          description: "CSS selector for element to scroll into view",
        })
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      try {
        const client = await ensureConnected();
        
        onUpdate?.({ content: [{ type: "text", text: "Scrolling..." }] });
        
        await scroll(client.client, {
          x: params.x,
          y: params.y,
          selector: params.selector,
        });
        
        const target = params.selector
          ? `Element: ${params.selector}`
          : `Position: (${params.x || 0}, ${params.y || 0})`;
        
        return {
          content: [{ type: "text", text: `Scrolled to ${target}` }],
          details: { x: params.x, y: params.y, selector: params.selector },
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Scroll failed: ${error.message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });

  // Get HTML Tool
  pi.registerTool({
    name: "comet_get_html",
    label: "Comet Get HTML",
    description: "Get the current page's outer HTML",
    promptSnippet: "Get page HTML",
    parameters: Type.Object({}),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      try {
        const client = await ensureConnected();
        const html = await getDocumentHTML(client.client);
        
        // Truncate HTML if too long (limit to ~50KB)
        const truncated = html.length > 50000
          ? html.substring(0, 50000) + "\n\n... (truncated)"
          : html;
        
        return {
          content: [{ type: "text", text: truncated }],
          details: { length: html.length, truncated: html.length > 50000 },
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Failed to get HTML: ${error.message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });
}

// ============================================================================
// Observability Tools
// ============================================================================

function registerObservabilityTools(pi: ExtensionAPI) {
  // List Console Messages Tool
  pi.registerTool({
    name: "comet_list_console_messages",
    label: "Comet Console Messages",
    description: "Get browser console messages",
    promptSnippet: "Get console logs",
    parameters: Type.Object({
      clear: Type.Optional(
        Type.Boolean({
          description: "Clear messages after retrieving (default: false)",
        })
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      try {
        await ensureConnected();
        
        const messages = getConsoleMessages();
        
        if (params.clear) {
          clearConsoleMessages();
        }
        
        const text = messages.length === 0
          ? "No console messages"
          : messages
              .map((m) => `[${m.level.toUpperCase()}] ${m.text}`)
              .join("\n");
        
        return {
          content: [{ type: "text", text }],
          details: { count: messages.length, messages },
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Failed to get console messages: ${error.message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });

  // List Network Requests Tool
  pi.registerTool({
    name: "comet_list_network_requests",
    label: "Comet Network Requests",
    description: "List network requests made by the page",
    promptSnippet: "List network requests",
    parameters: Type.Object({
      clear: Type.Optional(
        Type.Boolean({
          description: "Clear requests after retrieving (default: false)",
        })
      ),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      try {
        await ensureConnected();
        
        const requests = getNetworkRequests();
        
        if (params.clear) {
          clearNetworkRequests();
        }
        
        const text = requests.length === 0
          ? "No network requests"
          : requests
              .map((r) => `[${r.request.method}] ${r.request.url}${r.response ? ` (${r.response.status})` : ""}`)
              .join("\n");
        
        return {
          content: [{ type: "text", text }],
          details: { count: requests.length, requests },
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Failed to get network requests: ${error.message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });

  // Get Network Request Tool
  pi.registerTool({
    name: "comet_get_network_request",
    label: "Comet Network Request",
    description: "Get detailed information about a specific network request",
    promptSnippet: "Get network request details",
    parameters: Type.Object({
      requestId: Type.String({
        description: "Request ID to fetch details for",
      }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      try {
        await ensureConnected();
        
        const request = getNetworkRequest(params.requestId);
        
        if (!request) {
          throw new Error(`Request ${params.requestId} not found`);
        }
        
        const text = [
          `URL: ${request.request.url}`,
          `Method: ${request.request.method}`,
          `Status: ${request.response?.status || "pending"}`,
          `Headers: ${JSON.stringify(request.request.headers, null, 2)}`,
          request.response ? `Response Headers: ${JSON.stringify(request.response.headers, null, 2)}` : "",
        ].filter(Boolean).join("\n");
        
        return {
          content: [{ type: "text", text }],
          details: request,
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Failed to get network request: ${error.message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });
}