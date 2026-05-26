/**
 * Platform Detection Module
 *
 * Handles detection of the current platform and Comet browser paths.
 * Based on comet-mcp implementation.
 */

export interface PlatformInfo {
  platform: "macos" | "windows" | "wsl" | "linux";
  cometPath?: string;
  commands: {
    launch: string[];
    launchHeadless: string[];
    checkPath: string[];
  };
}

/**
 * Detect the current platform and return platform-specific information
 */
export async function detectPlatform(): Promise<PlatformInfo> {
  const platform = process.platform;

  if (platform === "darwin") {
    return detectMacOS();
  } else if (platform === "win32") {
    return detectWindows();
  } else {
    return detectLinuxOrWSL();
  }
}

/**
 * Detect macOS platform and Comet path
 */
async function detectMacOS(): Promise<PlatformInfo> {
  const fs = await import("node:fs/promises");

  const commonPaths = [
    "/Applications/Comet.app/Contents/MacOS/Comet",
    "/Applications/Perplexity Comet.app/Contents/MacOS/Comet",
    `${process.env.HOME}/Applications/Comet.app/Contents/MacOS/Comet`,
    `${process.env.HOME}/Applications/Perplexity Comet.app/Contents/MacOS/Comet`,
  ];

  let cometPath: string | undefined;

  for (const path of commonPaths) {
    try {
      await fs.access(path);
      cometPath = path;
      break;
    } catch {
      // Path doesn't exist, continue
    }
  }

  return {
    platform: "macos",
    cometPath,
    commands: {
      launch: cometPath && cometPath !== "Comet"
        ? [cometPath, "--remote-debugging-port=9222"]
        : ["open", "-a", "Comet", "--args", "--remote-debugging-port=9222"],
      launchHeadless: ["open", "-a", "Comet", "--args", "--remote-debugging-port=9222", "--headless=new"],
      checkPath: ["ls", "-la", "/Applications/Comet.app", "/Applications/Perplexity Comet.app"],
    },
  };
}

/**
 * Detect Windows platform with proper path detection (from comet-mcp)
 */
async function detectWindows(): Promise<PlatformInfo> {
  // Check common installation paths (from comet-mcp)
  const possiblePaths = [
    `${process.env.LOCALAPPDATA}\\Perplexity\\Comet\\Application\\comet.exe`,
    `${process.env.APPDATA}\\Perplexity\\Comet\\Application\\comet.exe`,
    "C:\\Program Files\\Perplexity\\Comet\\Application\\comet.exe",
    "C:\\Program Files (x86)\\Perplexity\\Comet\\Application\\comet.exe",
  ];

  let cometPath: string | undefined;
  const fs = await import("node:fs/promises");

  for (const path of possiblePaths) {
    try {
      await fs.access(path);
      cometPath = path;
      break;
    } catch {
      // Path doesn't exist, continue
    }
  }

  return {
    platform: "windows",
    cometPath,
    commands: {
      launch: cometPath ? [cometPath, "--remote-debugging-port=9222"] : [],
      launchHeadless: cometPath ? [cometPath, "--remote-debugging-port=9222", "--headless"] : [],
      checkPath: ["dir", "%LOCALAPPDATA%\\Perplexity\\Comet\\Application"],
    },
  };
}

/**
 * Detect Linux or WSL platform with proper Comet path detection (from comet-mcp)
 */
async function detectLinuxOrWSL(): Promise<PlatformInfo> {
  let isWSL = false;

  // Check if running under WSL
  try {
    const { execSync } = await import("node:child_process");
    const kernelRelease = execSync("uname -r", { encoding: "utf-8" });
    isWSL = kernelRelease.includes("microsoft") || kernelRelease.includes("WSL");
  } catch {
    // Ignore error
  }

  const platform = isWSL ? "wsl" : "linux";

  // Find Comet.exe in Windows paths (for WSL)
  let cometPath: string | undefined;
  if (isWSL) {
    try {
      const { execSync } = await import("node:child_process");
      const fs = await import("node:fs/promises");
      
      // Get LOCALAPPDATA from Windows via cmd.exe
      const localAppData = execSync('cmd.exe /c echo %LOCALAPPDATA%', { encoding: 'utf8' })
        .trim().replace(/\r?\n/g, '');
      
      // Convert Windows path to WSL mounted path for testing
      // C:\Users\GalyaPC\AppData\Local → /mnt/c/Users/GalyaPC/AppData/Local
      const localAppDataWSL = localAppData.replace(/^C:/, '/mnt/c/').replace(/\\/g, '/');
      
      const possibleWindowsPaths = [
        `${localAppData}\\Perplexity\\Comet\\Application\\comet.exe`,
        "C:\\Program Files\\Perplexity\\Comet\\Application\\comet.exe",
        "C:\\Program Files (x86)\\Perplexity\\Comet\\Application\\comet.exe",
      ];
      
      // Test using WSL paths
      const possibleWSLPaths = possibleWindowsPaths.map(wp => 
        wp.replace(/^C:/, '/mnt/c/').replace(/\\/g, '/')
      );
      
      for (let i = 0; i < possibleWSLPaths.length; i++) {
        try {
          await fs.access(possibleWSLPaths[i]);
          cometPath = possibleWindowsPaths[i]; // Store Windows path for launching
          break;
        } catch {
          // Path doesn't exist, continue
        }
      }
    } catch {
      // Ignore errors
    }
  }

  return {
    platform,
    cometPath,
    commands: {
      launch: isWSL && cometPath
        ? ["powershell.exe", "-NoProfile", "-Command", `Set-Location C:\\; Start-Process -FilePath '${cometPath}' -ArgumentList '--remote-debugging-port=9222'`]
        : [],
      launchHeadless: isWSL && cometPath
        ? ["powershell.exe", "-NoProfile", "-Command", `Set-Location C:\\; Start-Process -FilePath '${cometPath}' -ArgumentList '--remote-debugging-port=9222', '--headless'`]
        : [],
      checkPath: isWSL
        ? ["bash", "-c", "test -f '/mnt/c/Users/*/AppData/Local/Perplexity/Comet/Application/comet.exe'"]
        : [],
    },
  };
}

/**
 * Check if the platform is supported
 */
export function isPlatformSupported(platform: PlatformInfo): boolean {
  return platform.platform !== "linux";
}

/**
 * Get platform-specific setup instructions
 */
export function getPlatformInstructions(platform: PlatformInfo): string {
  switch (platform.platform) {
    case "macos":
      if (platform.cometPath) {
        return "✓ Comet detected at: " + platform.cometPath;
      } else {
        return "⚠ Comet not found. Please install Perplexity Comet from https://www.perplexity.ai/comet";
      }

    case "windows":
      if (platform.cometPath) {
        return "✓ Comet detected at: " + platform.cometPath;
      } else {
        return "⚠ Comet not found. Please:\n1. Install Perplexity Comet from https://www.perplexity.ai/comet\n2. Default location: %LOCALAPPDATA%\\Perplexity\\Comet\\Application\\comet.exe";
      }

    case "wsl":
      if (platform.cometPath) {
        return "✓ Comet detected at: " + platform.cometPath + " (via WSL)";
      } else {
        return "⚠ Comet not found. Please:\n1. Install Perplexity Comet from https://www.perplexity.ai/comet on Windows\n2. Default location: %LOCALAPPDATA%\\Perplexity\\Comet\\Application\\comet.exe\n3. Ensure WSL has access to Windows filesystem";
      }

    case "linux":
      return "✗ Comet browser is not available for Linux.\nUse WSL on Windows or macOS instead.";

    default:
      return "Unknown platform";
  }
}

/**
 * Verify WSL mirrored networking
 */
export async function verifyWSLNetworking(): Promise<boolean> {
  try {
    const { execSync } = await import("node:child_process");
    const ip = execSync("cat /etc/resolv.conf | grep nameserver | awk '{print $2}'", {
      encoding: "utf-8",
    }).trim();

    // In WSL2 with mirrored networking, nameserver should be 127.0.0.1
    // In NAT mode, it's a different IP
    return ip === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Get environment variable overrides
 */
export function getEnvOverrides(): {
  cometPath?: string;
  debugPort?: number;
  headless?: boolean;
  timeout?: number;
} {
  return {
    cometPath: process.env.COMET_PATH,
    debugPort: process.env.COMET_DEBUG_PORT ? parseInt(process.env.COMET_DEBUG_PORT) : undefined,
    headless: process.env.COMET_HEADLESS === "true" || process.env.COMET_HEADLESS === "1",
    timeout: process.env.COMET_TIMEOUT ? parseInt(process.env.COMET_TIMEOUT) : undefined,
  };
}