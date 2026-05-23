# Changelog

All notable changes to pi-comet will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project scaffold
- Package.json with dependencies
- Extension entry point (src/index.ts)
- Platform detection (macOS, Windows, WSL, Linux)
- Core slash commands:
  - `/comet launch` - Launch Comet in headed mode
  - `/comet launch-headless` - Launch Comet in headless mode
  - `/comet connect` - Connect to running Comet instance
  - `/comet authorize` - Authorize current session
  - `/comet revoke` - Revoke authorization
  - `/comet status` - Show connection and authorization status
  - `/comet doctor` - Run diagnostics and health checks
  - `/comet onboard` - Show onboarding guide
- Session-based authorization system
- Phase 1 MVP tools (skeletons, full implementation in progress):
  - `comet_launch` - Launch Comet browser in headed mode
  - `comet_launch_headless` - Launch Comet browser in headless mode
  - `comet_connect` - Connect to running Comet instance
  - `comet_navigate` - Navigate to a URL
  - `comet_screenshot` - Capture a screenshot
  - `comet_evaluate` - Execute JavaScript
  - `comet_tab` - Manage browser tabs
- Comprehensive README documentation
- GitHub repository setup
- Contributing guidelines
- MIT License

### Planned (Phase 2)
- DOM interaction tools (click, type, fill, hover, scroll)
- DOM snapshot with UIDs
- Wait for conditions
- Console message listing
- Network request inspection
- Reload page tool

### Planned (Phase 3)
- `comet_ask` - Delegate browsing task to Comet AI
- `comet_poll` - Monitor agentic task progress
- `comet_stop` - Cancel agentic task
- Tab categorization (main, agent-browsing, sidecar)

### Planned (Phase 4)
- Full platform support
- WSL mirrored networking support
- Auto-detect Comet paths
- Headless mode improvements

### Planned (Phase 5)
- Enhanced error handling
- Health check improvements
- Advanced recipes and examples
- Complete API documentation

## [0.1.0] - 2026-05-23

### Added
- Initial release
- Project scaffold
- Basic extension structure

---

## Versioning

- **Major version**: Incompatible API changes
- **Minor version**: Backwards-compatible functionality additions
- **Patch version**: Backwards-compatible bug fixes