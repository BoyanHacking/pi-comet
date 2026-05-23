# Contributing to pi-comet

Thank you for your interest in contributing to pi-comet! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other contributors

## Getting Started

### Prerequisites

- Node.js 18+
- Pi installed: `npm install -g @earendil-works/pi-coding-agent`
- Perplexity Comet browser (for testing)

### Development Setup

1. Fork and clone the repository:

```bash
git clone https://github.com/your-username/pi-comet.git
cd pi-comet
```

2. Install dependencies:

```bash
npm install
```

3. Link to Pi for local testing:

```bash
# Create symbolic link
ln -s $(pwd) ~/.pi/agent/extensions/pi-comet

# Or copy to extensions directory
cp -r $(pwd) ~/.pi/agent/extensions/pi-comet
```

4. Test with Pi:

```bash
pi
/comet onboard
/comet doctor
```

## Development Workflow

1. Create a feature branch:

```bash
git checkout -b feature/your-feature-name
```

2. Make your changes
3. Test thoroughly
4. Commit with clear messages:

```bash
git commit -m "feat: add new browser navigation tool"
```

5. Push and create a pull request

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example:

```
feat(comet): add screenshot capture tool

Implements comet_screenshot tool with support for PNG and JPEG formats.
Adds quality parameter for JPEG compression.
```

## Project Structure

```
pi-comet/
├── src/
│   ├── index.ts              # Extension entry point
│   └── modules/
│       ├── cdp-client.ts     # CDP client implementation
│       ├── platform.ts       # Platform detection
│       ├── comet-ai.ts       # Comet AI integration
│       └── tools.ts          # Tool registry
├── docs/
│   ├── api.md                # API documentation
│   └── recipes.md            # Usage examples
└── tests/
    └── integration/          # Integration tests
```

## Coding Standards

### TypeScript

- Use strict mode
- Prefer explicit types
- Use `Type` from `typebox` for tool parameters
- Add JSDoc comments for public APIs

### Code Style

- 2 space indentation
- Single quotes for strings
- Trailing commas where appropriate
- Max line length: 100 characters

### Error Handling

- Always handle errors gracefully
- Provide actionable error messages
- Use AbortSignal for cancellable operations

## Testing

### Manual Testing

```bash
# Launch Pi with extension
pi

# Test commands
/comet launch
/comet authorize
/comet status
/comet doctor
```

### Automated Testing (Coming Soon)

```bash
npm test
```

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows project conventions
- [ ] Tests pass (if applicable)
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] PR description clearly explains changes

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How did you test these changes?

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
```

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Join the [Pi Discord](https://discord.gg/pi)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.