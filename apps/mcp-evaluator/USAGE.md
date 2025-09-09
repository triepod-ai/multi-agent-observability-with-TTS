# MCP Evaluator Usage Guide

## Installation Complete!

The MCP Evaluator has been successfully installed with Python dependencies in a virtual environment.

## Usage

Use the wrapper script `./mcp-evaluate-wrapper.sh` for all evaluations:

```bash
# Evaluate an MCP server in current directory
./mcp-evaluate-wrapper.sh

# Evaluate a specific MCP server
./mcp-evaluate-wrapper.sh /path/to/mcp-server

# Run interactive dashboard mode
./mcp-evaluate-wrapper.sh interactive

# Test a specific tool
./mcp-evaluate-wrapper.sh test-tool /path/to/server tool-name

# Show MCP requirements
./mcp-evaluate-wrapper.sh requirements

# Run with specific options
./mcp-evaluate-wrapper.sh --static-only    # Run static analysis only
./mcp-evaluate-wrapper.sh --runtime-only   # Run runtime tests only
./mcp-evaluate-wrapper.sh --verbose        # Verbose output
./mcp-evaluate-wrapper.sh --json           # Output as JSON
```

## Python Virtual Environment

The wrapper automatically uses the Python virtual environment at `.venv/` which contains:
- requests
- pyyaml
- tabulate

This ensures the Python hooks have all required dependencies without affecting your system Python installation.

## CI/CD Usage

For CI/CD pipelines, use the wrapper with the `--ci` flag:

```bash
./mcp-evaluate-wrapper.sh --ci --fail-threshold 85
```

This will exit with a non-zero code if the evaluation score is below the threshold.

## Troubleshooting

If you encounter Python dependency issues:
1. Ensure the virtual environment exists: `ls .venv/`
2. Reinstall dependencies: `.venv/bin/pip install requests pyyaml tabulate`
3. Check Python version: `.venv/bin/python --version` (should be Python 3.11+)

## Note

Always use `./mcp-evaluate-wrapper.sh` instead of calling the Node script directly to ensure proper Python environment setup.