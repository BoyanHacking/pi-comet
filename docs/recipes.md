# pi-comet Recipes

This document provides practical examples and recipes for using pi-comet.

## Basic Recipes

### 1. Launch and Navigate

```
User: Launch Comet and navigate to https://example.com
```

Pi will:
1. Use `comet_launch` to start Comet
2. Use `comet_navigate` to go to the URL
3. Optionally use `comet_screenshot` to verify

### 2. Capture Screenshot

```
User: Take a screenshot of the current page
```

Pi will:
1. Use `comet_screenshot` to capture the page
2. Display the image inline

### 3. Get Page Information

```
User: Tell me the title and URL of the current page
```

Pi will:
1. Use `comet_get_title` to get the page title
2. Use `comet_get_url` to get the current URL

### 4. Execute JavaScript

```
User: Check if there are any console errors
```

Pi will:
1. Use `comet_list_console_messages` to get console logs
2. Filter for error level messages

### 5. Navigate and Extract Data

```
User: Go to https://news.ycombinator.com and list the top 5 headlines
```

Pi will:
1. Use `comet_navigate` to visit the site
2. Use `comet_evaluate` to extract headlines
3. Present the results

### 6. List Tabs

```
User: Show me all open tabs
```

Pi will:
1. Use `comet_tab` with action "list"
2. Display all tabs with their titles and URLs

### 7. Create New Tab

```
User: Open a new tab and go to https://github.com
```

Pi will:
1. Use `comet_tab` with action "create" and url
2. Display the new tab ID

### 8. Switch Between Tabs

```
User: Switch to the second tab
```

Pi will:
1. Use `comet_tab` with action "list" to get tabs
2. Use `comet_tab` with action "activate" and the tab ID

## Advanced Recipes

### 9. Form Automation

```
User: Go to the login page at https://example.com/login, enter username "user@example.com" and password "password123", then click the submit button
```

Pi will:
1. Use `comet_navigate` to visit the login page
2. Use `comet_type` to fill in username field
3. Use `comet_type` to fill in password field
4. Use `comet_click` to click the submit button
5. Optionally use `comet_screenshot` to verify

### 10. Search and Click

```
User: Go to Google, search for "pi coding agent", and click the first result
```

Pi will:
1. Use `comet_navigate` to visit Google
2. Use `comet_click` to find and click the search box
3. Use `comet_type` to enter the search query
4. Use `comet_click` to click the search button or press Enter
5. Use `comet_evaluate` to find the first result link
6. Use `comet_click` to click it

### 11. Scroll and Capture

```
User: Go to the long article page, scroll down to load more content, and take screenshots at different scroll positions
```

Pi will:
1. Use `comet_navigate` to visit the page
2. Use `comet_scroll` to scroll down
3. Use `comet_screenshot` to capture each position
4. Repeat scrolling and capturing

### 12. Monitor Network Activity

```
User: Visit a website and tell me what API calls it makes on page load
```

Pi will:
1. Use `comet_navigate` to visit the site
2. Wait for page load
3. Use `comet_list_network_requests` to get all requests
4. Filter for API calls (e.g., JSON, XHR)

### 13. Debug Console Errors

```
User: Visit the page and tell me if there are any JavaScript errors in the console
```

Pi will:
1. Use `comet_navigate` to visit the page
2. Wait for page load
3. Use `comet_list_console_messages` to get logs
4. Filter for error level messages
5. Display the errors with context

### 14. Extract Page Content

```
User: Go to the article page and extract the main content text
```

Pi will:
1. Use `comet_navigate` to visit the page
2. Use `comet_get_html` to get the page HTML
3. Use `comet_evaluate` to extract specific content (e.g., article body)
4. Present the extracted text

### 15. Test Page Interactivity

```
User: Go to the form page, fill in all fields, submit the form, and check for validation errors
```

Pi will:
1. Use `comet_navigate` to visit the page
2. Use `comet_click` or `comet_type` to fill each field
3. Use `comet_click` to submit
4. Use `comet_screenshot` to capture result
5. Use `comet_list_console_messages` to check for errors

## Multi-Step Workflows

### 16. Research Workflow

```
User: Research the latest AI frameworks:
1. Go to Google
2. Search for "latest AI frameworks 2026"
3. Visit the top 3 results
4. Extract the key information from each
5. Summarize the findings
```

Pi will:
1. Use `comet_tab` to create tabs for each result
2. Use `comet_navigate` and `comet_click` to navigate through results
3. Use `comet_evaluate` to extract content
4. Compile and summarize the findings

### 17. Price Comparison

```
User: Compare prices of a product across three different websites
```

Pi will:
1. Use `comet_tab` with action "create" to create separate tabs
2. Use `comet_navigate` to visit each website
3. Use `comet_evaluate` to extract price information
4. Compile a comparison table

### 18. Screenshot Gallery

```
User: Create screenshots of the page at different viewport sizes
```

Pi will:
1. Use `comet_navigate` to visit the page
2. Use `comet_evaluate` to resize viewport
3. Use `comet_screenshot` to capture each size
4. Display the screenshots

### 19. Form Testing

```
User: Test the contact form with various inputs:
- Valid data
- Invalid email
- Empty fields
- Very long text
```

Pi will:
1. Use `comet_navigate` to visit the form
2. For each test case:
   - Use `comet_type` to enter data
   - Use `comet_click` to submit
   - Use `comet_screenshot` to capture result
   - Use `comet_list_console_messages` to check for errors
3. Compile a test report

### 20. Accessibility Check

```
User: Check if the page has proper alt text for images and ARIA labels
```

Pi will:
1. Use `comet_navigate` to visit the page
2. Use `comet_evaluate` to find all images
3. Use `comet_evaluate` to check alt attributes
4. Use `comet_evaluate` to check ARIA labels
5. Report any issues

## Troubleshooting Recipes

### 21. Debug Connection Issues

```
User: Comet won't connect, help me debug
```

Pi will:
1. Use `/comet doctor` to run diagnostics
2. Check platform detection
3. Verify Comet is running
4. Check CDP port availability
5. Provide specific guidance

### 22. Verify Page Load

```
User: Check if the page loaded completely
```

Pi will:
1. Use `comet_navigate` with wait=true
2. Use `comet_screenshot` to verify visual state
3. Use `comet_list_network_requests` to check for pending requests
4. Use `comet_list_console_messages` to check for load errors

### 23. Check Element Visibility

```
User: Find out if the element with selector ".hidden-element" is visible
```

Pi will:
1. Use `comet_evaluate` to check element visibility
2. Report the result

## Command-Line Recipes

### 24. Quick Launch and Authorize

```bash
# Start Pi with quick authorization
pi
/comet launch
/comet authorize --duration 60  # 60 minutes
```

### 25. Connect to Running Instance

```bash
# Connect to an already running Comet
pi
/comet connect --port 9222
/comet authorize
```

### 26. Status Check

```bash
# Check Comet status
pi
/comet status
/comet doctor
```

### 27. Headless Mode

```bash
# Run Comet in headless mode
pi
/comet launch-headless
/comet authorize
# Now use tools for automation
```

## Environment Configuration Recipes

### 28. Custom CDP Port

```bash
# Use a custom CDP port
export COMET_DEBUG_PORT=9223
pi
/comet launch
```

### 29. Default Headless Mode

```bash
# Always launch in headless mode
export COMET_HEADLESS=1
pi
/comet launch
```

### 30. Custom Timeout

```bash
# Increase operation timeout
export COMET_TIMEOUT=60000  # 60 seconds
pi
```

### 31. Custom Comet Path (macOS)

```bash
# Use a custom Comet installation
export COMET_PATH="/path/to/Comet.app/Contents/MacOS/Comet"
pi
/comet launch
```

### 32. Custom Comet Path (Windows)

```powershell
# Use a custom Comet installation
set COMET_PATH=C:\Path\To\Comet.exe
pi
```

## Platform-Specific Recipes

### 33. macOS Setup

```bash
# Check if Comet is installed
ls -la /Applications/Comet.app

# Launch Comet
pi
/comet launch
/comet authorize
```

### 34. Windows Setup

```powershell
# Check if Comet is in PATH
where Comet.exe

# Launch Comet
pi
/comet launch
/comet authorize
```

### 35. WSL2 Setup

```bash
# Check WSL version (should be 2 for best results)
wsl --status

# Ensure mirrored networking
wsl --set-version Ubuntu 2

# Launch Comet (via PowerShell)
pi
/comet launch
/comet authorize
```

## Integration with Other Tools

### 36. Screenshot to File

```
User: Take a screenshot and save it to /tmp/screenshot.png
```

Pi will:
1. Use `comet_screenshot` to capture the image
2. Use `write` tool to save to file (with base64 decode)

### 37. Extract Data to JSON

```
User: Extract all links from the page and save to links.json
```

Pi will:
1. Use `comet_navigate` to visit the page
2. Use `comet_evaluate` to extract links
3. Use `write` tool to save to JSON file

### 38. Compare Screenshots

```
User: Take screenshots before and after an action and compare them
```

Pi will:
1. Use `comet_screenshot` to capture before state
2. Perform the action (e.g., `comet_click`)
3. Use `comet_screenshot` to capture after state
4. Use `bash` tool to compare images

### 39. Continuous Monitoring

```
User: Monitor the page for changes every 30 seconds for 5 minutes
```

Pi will:
1. Use `bash` tool to create a monitoring loop
2. In each iteration:
   - Use `comet_navigate` to reload
   - Use `comet_screenshot` to capture
   - Use `comet_get_html` to get content
3. Compare and report changes

### 40. Network Analysis

```
User: Analyze the network traffic of this page and create a report
```

Pi will:
1. Use `comet_navigate` to visit the page
2. Wait for full load
3. Use `comet_list_network_requests` to get all requests
4. Use `comet_get_network_request` for detailed info
5. Use `write` tool to create a report

## Best Practices

### 41. Wait for Page Load

```typescript
// Good: Always wait for page load
comet_navigate({ url: "https://example.com", wait: true, timeout: 30000 })

// Bad: Don't skip waiting unless necessary
comet_navigate({ url: "https://example.com", wait: false })
```

### 42. Handle Errors Gracefully

```
User: Try to click the button, and if it's not found, take a screenshot instead
```

Pi will:
1. Try to use `comet_click`
2. If it fails, use `comet_screenshot` to diagnose
3. Report the issue with helpful context

### 43. Use Selectors Carefully

```
User: Click the submit button (prefer ID selector)
```

Pi will:
1. Prefer `comet_click` with ID selectors (e.g., "#submit-btn")
2. Fall back to class selectors (e.g., ".submit-button")
3. Last resort: generic selectors (e.g., "button[type='submit']")

### 44. Clear Between Operations

```
User: Clear console messages and network requests before a new test
```

Pi will:
1. Use `comet_list_console_messages({ clear: true })`
2. Use `comet_list_network_requests({ clear: true })`
3. Perform the test operation
4. Check for new messages/requests

### 45. Verify State

```
User: After clicking, verify the page changed
```

Pi will:
1. Use `comet_click` to perform the action
2. Use `comet_screenshot` to visually verify
3. Use `comet_get_title` to check for title change
4. Use `comet_get_url` to check for navigation

## Performance Tips

### 46. Minimize Screenshot Size

```
User: Take a JPEG screenshot at 70% quality
```

Pi will:
1. Use `comet_screenshot({ format: "jpeg", quality: 70 })`
2. Result: Smaller file, faster transfer

### 47. Reuse Connections

```
User: Perform multiple actions without reconnecting
```

Pi will:
1. Connect once with `comet_connect`
2. Perform all actions using the same connection
3. Avoid unnecessary disconnect/reconnect cycles

### 48. Batch Operations

```
User: Extract all data in one JavaScript call rather than multiple
```

Pi will:
1. Use `comet_evaluate` with a comprehensive expression
2. Extract all needed data in a single call
3. Result: Faster, fewer round trips

---

## Tips for Using pi-comet

1. **Always authorize first**: Use `/comet authorize` before using any tools
2. **Check status**: Use `/comet status` to verify connection state
3. **Use doctor**: Run `/comet doctor` when troubleshooting
4. **Wait for loads**: Use `wait: true` in navigation for reliability
5. **Use screenshots**: Capture visual state when debugging
6. **Monitor console**: Check `comet_list_console_messages` for errors
7. **Track network**: Use `comet_list_network_requests` to understand page behavior

For more help, use `/comet onboard` to see the onboarding guide.