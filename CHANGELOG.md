# Changelog

All notable changes to pi-comet will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Full CDP Client Implementation** (src/modules/cdp-client.ts)
  - Chrome DevTools Protocol connection management
  - Tab lifecycle management (list, create, activate, close)
  - Page navigation and reload
  - Screenshot capture (PNG/JPEG with quality control)
  - JavaScript evaluation with promise support
  - DOM interaction (click, type, scroll)
  - Console message logging and retrieval
  - Network request monitoring and inspection
  - Document and element utilities

- **Platform Detection Module** (src/modules/platform.ts)
  - Automatic detection of macOS, Windows, WSL, Linux platforms
  - Auto-discovery of Comet installation paths
  - Platform-specific launch commands
  - WSL mirrored networking verification
  - Environment variable override support

- **15+ Fully Implemented Tools**:
  - **Core**: `comet_launch`, `comet_launch_headless`, `comet_connect`, `comet_tab`
  - **Navigation**: `comet_navigate`, `comet_reload`, `comet_get_title`, `comet_get_url`
  - **Interaction**: `comet_screenshot`, `comet_evaluate`, `comet_click`, `comet_type`, `comet_scroll`, `comet_get_html`
  - **Observability**: `comet_list_console_messages`, `comet_list_network_requests`, `comet_get_network_request`

- **Enhanced Features**:
  - Session management with auto-reconnect
  - Console and network monitoring started on connect
  - Proper cleanup on session shutdown
  - Enhanced `/comet status` with monitoring state
  - Improved `/comet doctor` with detailed diagnostics

- **Documentation**:
  - Comprehensive API documentation (docs/api.md)
  - 48 practical recipes and examples (docs/recipes.md)
  - Updated README with all implemented features
  - Contributing guidelines
  - MIT License

### Changed
- Updated all tool implementations to use real CDP client
- Enhanced slash commands with better feedback
- Improved error messages with actionable guidance

### Planned (Phase 2)
- DOM snapshot with stable UIDs
- Wait for conditions (element, text, custom)
- Form filling utility
- Keyboard event support
- Hover element support
- Enhanced console and network filtering

### Planned (Phase 3)
- `comet_ask` - Delegate browsing task to Comet AI
- `comet_poll` - Monitor agentic task progress
- `comet_stop` - Cancel agentic task
- Tab categorization (main, agent-browsing, sidecar)

### Planned (Phase 4)
- WSL mirrored networking improvements
- Headless mode enhancements
- Better auto-detection of Comet paths

### Planned (Phase 5)
- Enhanced error handling with recovery
- Advanced health checks
- More recipes and examples
- Performance optimizations

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