/**
 * Platform Detection Module
 *
 * Handles detection of the current platform and Comet browser paths.
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

  // If no path found, check if "Comet" is in PATH
  if (!cometPath) {
    try {
      const { execSync } = await import("node:child_process");
      execSync("which Comet", { stdio: "ignore" });
      cometPath = "Comet";
    } catch {
      // Not in PATH
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
 * Detect Windows platform
 */
async function detectWindows(): Promise<PlatformInfo> {
  const { execSync } = await import("node:child_process");

  // Check if Comet.exe is in PATH
  let cometPath: string | undefined;
  try {
    execSync("where Comet.exe", { stdio: "ignore" });
    cometPath = "Comet.exe";
  } catch {
    // Not in PATH
  }

  // Check common installation paths
  if (!cometPath) {
    const commonPaths = [
      `${process.env.LOCALAPPDATA}\\Programs\\Perplexity Comet\\Comet.exe`,
      `${process.env.PROGRAMFILES}\\Perplexity Comet\\Comet.exe`,
      `${process.env.PROGRAMFILES(X86)}\\Perplexity Comet\\Comet.exe`,
    ];

    const fs = await import("node:fs/promises");

    for (const path of commonPaths) {
      try {
        await fs.access(path);
        cometPath = path;
        break;
      } catch {
        // Path doesn't exist, continue
      }
    }
  }

  return {
    platform: "windows",
    cometPath,
    commands: {
      launch: [cometPath || "Comet.exe", "--remote-debugging-port=9222"],
      launchHeadless: [cometPath || "Comet.exe", "--remote-debugging-port=9222", "--headless"],
      checkPath: ["dir", "%LOCALAPPDATA%\\Programs\\Perplexity Comet", "%PROGRAMFILES%\\Perplexity Comet"],
    },
  };
}

/**
 * Detect Linux or WSL platform
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

  return {
    platform,
    cometPath: undefined, // Comet not available on Linux
    commands: {
      launch: isWSL
        ? ["powershell.exe", "-Command", "Start-Process 'Comet.exe' -ArgumentList '--remote-debugging-port=9222'"]
        : [],
      launchHeadless: isWSL
        ? ["powershell.exe", "-Command", "Start-Process 'Comet.exe' -ArgumentList '--remote-debugging-port=9222', '--headless'"]
        : [],
      checkPath: ["powershell.exe", "-Command", "Test-Path 'C:\\Users\\*\\AppData\\Local\\Programs\\Perplexity Comet\\Comet.exe'"],
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
        return "✓ Comet detected in PATH or at: " + platform.cometPath;
      } else {
        return "⚠ Comet not found in PATH. Please:\n1. Install Perplexity Comet from https://www.perplexity.ai/comet\n2. Add Comet.exe to your PATH\n3. Or set COMET_PATH environment variable";
      }

    case "wsl":
      return "ℹ Running under WSL. Using PowerShell to launch Windows Comet.\n" +
             "Ensure WSL2 is configured with mirrored networking for best results:\n" +
             "  wsl --set-version <distro> 2";

    case "linux":
      return "✗ Comet browser is not available for Linux.\n" +
             "Use WSL on Windows or macOS instead.";

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