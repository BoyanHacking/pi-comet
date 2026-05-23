/**
 * CDP Client Module for Comet Browser
 *
 * Handles Chrome DevTools Protocol (CDP) connections and operations
 * using chrome-remote-interface library.
 */

import CDP from "chrome-remote-interface";

export interface CDPTab {
  id: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
}

export interface CDPClient {
  client: CDP.Client;
  target: CDPTab;
}

export interface NavigateOptions {
  url: string;
  wait?: boolean;
  timeout?: number;
}

export interface ScreenshotOptions {
  format?: "png" | "jpeg";
  quality?: number;
}

export interface EvaluateOptions {
  expression: string;
  awaitPromise?: boolean;
  returnByValue?: boolean;
}

/**
 * Connect to CDP endpoint and get available targets (tabs)
 */
export async function getTargets(port: number = 9222): Promise<CDPTab[]> {
  try {
    const targets = await CDP.List({ port });
    return targets
      .filter((t) => t.type === "page")
      .map((t) => ({
        id: t.id || "",
        title: t.title || "",
        url: t.url || "",
        webSocketDebuggerUrl: t.webSocketDebuggerUrl || "",
      }));
  } catch (error: any) {
    throw new Error(`Failed to get targets: ${error.message}`);
  }
}

/**
 * Connect to a specific tab/target
 */
export async function connectToTarget(
  targetId: string,
  port: number = 9222
): Promise<CDPClient> {
  try {
    const client = await CDP({ target: targetId, port });

    // Enable necessary domains
    await Promise.all([
      client.Page.enable(),
      client.Runtime.enable(),
      client.Network.enable(),
      client.DOM.enable(),
    ]);

    const targets = await getTargets(port);
    const target = targets.find((t) => t.id === targetId);

    if (!target) {
      throw new Error(`Target ${targetId} not found`);
    }

    return { client, target };
  } catch (error: any) {
    throw new Error(`Failed to connect to target: ${error.message}`);
  }
}

/**
 * Connect to the first available target (convenience function)
 */
export async function connectToFirstTarget(port: number = 9222): Promise<CDPClient> {
  const targets = await getTargets(port);

  if (targets.length === 0) {
    throw new Error("No targets available. Is Comet running?");
  }

  return connectToTarget(targets[0].id, port);
}

/**
 * Navigate to a URL
 */
export async function navigate(
  client: CDP.Client,
  options: NavigateOptions
): Promise<{ url: string; loaded: boolean }> {
  const { url, wait = true, timeout = 30000 } = options;

  try {
    const result = await client.Page.navigate({ url });

    if (!wait) {
      return { url: result.frame?.url || url, loaded: false };
    }

    // Wait for page load
    await waitForLoad(client, timeout);

    return { url: result.frame?.url || url, loaded: true };
  } catch (error: any) {
    throw new Error(`Navigation failed: ${error.message}`);
  }
}

/**
 * Reload the current page
 */
export async function reload(
  client: CDP.Client,
  wait: boolean = true,
  timeout: number = 30000
): Promise<void> {
  try {
    await client.Page.reload();

    if (wait) {
      await waitForLoad(client, timeout);
    }
  } catch (error: any) {
    throw new Error(`Reload failed: ${error.message}`);
  }
}

/**
 * Capture a screenshot
 */
export async function screenshot(
  client: CDP.Client,
  options: ScreenshotOptions = {}
): Promise<string> {
  const { format = "png", quality = 80 } = options;

  try {
    const data = await client.Page.captureScreenshot({
      format,
      quality: format === "jpeg" ? quality : undefined,
    });

    return data.data;
  } catch (error: any) {
    throw new Error(`Screenshot failed: ${error.message}`);
  }
}

/**
 * Evaluate JavaScript in the page context
 */
export async function evaluate(
  client: CDP.Client,
  options: EvaluateOptions
): Promise<{ result: any; type: string }> {
  const { expression, awaitPromise = true, returnByValue = true } = options;

  try {
    const result = await client.Runtime.evaluate({
      expression,
      awaitPromise,
      returnByValue,
    });

    if (result.exceptionDetails) {
      throw new Error(
        `JavaScript execution failed: ${result.exceptionDetails.text}`
      );
    }

    return {
      result: result.result?.value,
      type: result.result?.type || "unknown",
    };
  } catch (error: any) {
    throw new Error(`Evaluation failed: ${error.message}`);
  }
}

/**
 * Get page title
 */
export async function getTitle(client: CDP.Client): Promise<string> {
  const result = await evaluate(client, { expression: "document.title" });
  return result.result as string;
}

/**
 * Get page URL
 */
export async function getURL(client: CDP.Client): Promise<string> {
  const result = await evaluate(client, { expression: "window.location.href" });
  return result.result as string;
}

/**
 * Click an element by CSS selector
 */
export async function click(client: CDP.Client, selector: string): Promise<void> {
  try {
    const result = await client.Runtime.evaluate({
      expression: `
        (function() {
          const el = document.querySelector('${selector}');
          if (!el) return { success: false, error: 'Element not found' };
          el.click();
          return { success: true };
        })()
      `,
      awaitPromise: false,
      returnByValue: true,
    });

    if (result.exceptionDetails) {
      throw new Error(`Click failed: ${result.exceptionDetails.text}`);
    }

    const clickResult = result.result?.value;
    if (!clickResult?.success) {
      throw new Error(clickResult?.error || "Click failed");
    }
  } catch (error: any) {
    throw new Error(`Click failed: ${error.message}`);
  }
}

/**
 * Type text into an input field
 */
export async function type(
  client: CDP.Client,
  selector: string,
  text: string,
  clear: boolean = true
): Promise<void> {
  try {
    const result = await client.Runtime.evaluate({
      expression: `
        (function() {
          const el = document.querySelector('${selector}');
          if (!el) return { success: false, error: 'Element not found' };
          if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
            return { success: false, error: 'Element is not an input' };
          }
          if (${clear}) el.value = '';
          el.value = el.value + '${text.replace(/'/g, "\\'")}';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true };
        })()
      `,
      awaitPromise: false,
      returnByValue: true,
    });

    if (result.exceptionDetails) {
      throw new Error(`Type failed: ${result.exceptionDetails.text}`);
    }

    const typeResult = result.result?.value;
    if (!typeResult?.success) {
      throw new Error(typeResult?.error || "Type failed");
    }
  } catch (error: any) {
    throw new Error(`Type failed: ${error.message}`);
  }
}

/**
 * Wait for page load to complete
 */
async function waitForLoad(client: CDP.Client, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      client.Page.loadEventFired(() => {});
      reject(new Error(`Page load timeout after ${timeout}ms`));
    }, timeout);

    client.Page.loadEventFired(() => {
      clearTimeout(timeoutId);
      resolve();
    });
  });
}

/**
 * Get DOM snapshot with UIDs
 */
export async function getSnapshot(client: CDP.Client): Promise<any> {
  try {
    const result = await client.DOMSnapshot.getSnapshot({
      computedStyles: [],
    });

    return {
      domNodes: result.domNodes,
      layoutTreeNodes: result.layoutTreeNodes,
      computedStyles: result.computedStyles,
    };
  } catch (error: any) {
    throw new Error(`Snapshot failed: ${error.message}`);
  }
}

/**
 * Get document outer HTML
 */
export async function getDocumentHTML(client: CDP.Client): Promise<string> {
  const result = await evaluate(client, {
    expression: "document.documentElement.outerHTML",
  });
  return result.result as string;
}

/**
 * Execute JavaScript in the page context and return DOM
 */
export async function querySelector(
  client: CDP.Client,
  selector: string
): Promise<any | null> {
  try {
    const result = await client.DOM.querySelector({ nodeId: 1, selector });
    if (result.nodeId === 0) return null;
    return result;
  } catch (error: any) {
    throw new Error(`Query selector failed: ${error.message}`);
  }
}

/**
 * Get element attributes
 */
export async function getAttributes(
  client: CDP.Client,
  nodeId: number
): Promise<Record<string, string>> {
  try {
    const result = await client.DOM.getAttributes({ nodeId });
    if (!result.attributes) return {};
    
    const attrs: Record<string, string> = {};
    for (let i = 0; i < result.attributes.length; i += 2) {
      attrs[result.attributes[i]] = result.attributes[i + 1] || "";
    }
    return attrs;
  } catch (error: any) {
    throw new Error(`Get attributes failed: ${error.message}`);
  }
}

/**
 * Scroll the page
 */
export async function scroll(
  client: CDP.Client,
  options: {
    x?: number;
    y?: number;
    selector?: string;
  } = {}
): Promise<void> {
  try {
    const { x = 0, y = 0, selector } = options;

    if (selector) {
      await client.Runtime.evaluate({
        expression: `
          (function() {
            const el = document.querySelector('${selector}');
            if (!el) return { success: false, error: 'Element not found' };
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return { success: true };
          })()
        `,
        awaitPromise: true,
        returnByValue: true,
      });
    } else {
      await client.Runtime.evaluate({
        expression: `window.scrollTo(${x}, ${y})`,
        awaitPromise: true,
        returnByValue: true,
      });
    }
  } catch (error: any) {
    throw new Error(`Scroll failed: ${error.message}`);
  }
}

/**
 * Close CDP client connection
 */
export async function closeClient(client: CDPClient): Promise<void> {
  try {
    await client.client.close();
  } catch (error: any) {
    console.warn(`Failed to close CDP client: ${error.message}`);
  }
}

/**
 * Create a new tab
 */
export async function createTab(port: number = 9222): Promise<CDPTab> {
  try {
    const target = await CDP.New({ port });
    return {
      id: target.id || "",
      title: target.title || "",
      url: target.url || "",
      webSocketDebuggerUrl: target.webSocketDebuggerUrl || "",
    };
  } catch (error: any) {
    throw new Error(`Failed to create tab: ${error.message}`);
  }
}

/**
 * Close a tab
 */
export async function closeTab(targetId: string, port: number = 9222): Promise<void> {
  try {
    await CDP.Close({ id: targetId, port });
  } catch (error: any) {
    throw new Error(`Failed to close tab: ${error.message}`);
  }
}

/**
 * Activate a tab (bring to front)
 */
export async function activateTab(targetId: string, port: number = 9222): Promise<void> {
  try {
    await CDP.Activate({ id: targetId, port });
  } catch (error: any) {
    throw new Error(`Failed to activate tab: ${error.message}`);
  }
}

/**
 * Get console messages
 */
export interface ConsoleMessage {
  level: "log" | "warning" | "error" | "debug" | "info";
  text: string;
  url?: string;
  lineNumber?: number;
  timestamp: number;
}

const consoleMessages: ConsoleMessage[] = [];

export async function startConsoleLogging(client: CDP.Client): Promise<void> {
  try {
    await client.Runtime.enable();
    
    client.Runtime.consoleAPICalled((params) => {
      const message: ConsoleMessage = {
        level: params.type as any,
        text: params.args.map((arg) => JSON.stringify(arg.value)).join(" "),
        url: params.stackTrace?.[0]?.url,
        lineNumber: params.stackTrace?.[0]?.lineNumber,
        timestamp: params.timestamp || Date.now(),
      };
      consoleMessages.push(message);
    });
  } catch (error: any) {
    console.warn(`Failed to start console logging: ${error.message}`);
  }
}

export function getConsoleMessages(): ConsoleMessage[] {
  return [...consoleMessages];
}

export function clearConsoleMessages(): void {
  consoleMessages.length = 0;
}

/**
 * Network request monitoring
 */
export interface NetworkRequest {
  requestId: string;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
  };
  timestamp: number;
}

const networkRequests: Map<string, NetworkRequest> = new Map();

export async function startNetworkMonitoring(client: CDP.Client): Promise<void> {
  try {
    await client.Network.enable();
    
    client.Network.requestWillBeSent((params) => {
      const request: NetworkRequest = {
        requestId: params.requestId,
        request: {
          url: params.request.url,
          method: params.request.method,
          headers: params.request.headers as Record<string, string>,
        },
        timestamp: params.timestamp || Date.now(),
      };
      networkRequests.set(params.requestId, request);
    });
    
    client.Network.responseReceived((params) => {
      const existing = networkRequests.get(params.requestId);
      if (existing) {
        existing.response = {
          status: params.response.status,
          statusText: params.response.statusText,
          headers: params.response.headers as Record<string, string>,
        };
        networkRequests.set(params.requestId, existing);
      }
    });
  } catch (error: any) {
    console.warn(`Failed to start network monitoring: ${error.message}`);
  }
}

export function getNetworkRequests(): NetworkRequest[] {
  return Array.from(networkRequests.values());
}

export function getNetworkRequest(requestId: string): NetworkRequest | undefined {
  return networkRequests.get(requestId);
}

export function clearNetworkRequests(): void {
  networkRequests.clear();
}