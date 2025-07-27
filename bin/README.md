# Bin Directory Scripts

This directory contains utility scripts for the Multi-Agent Observability System.

## install-hooks.sh

**Purpose**: Automated installer for Multi-Agent Observability hooks with intelligent path conversion.

**Key Features**:
- Converts relative paths to absolute paths (prevents directory change issues)
- Detects and handles existing installations
- Creates timestamped backups
- Validates speak command integration
- Sets up environment configuration

**Quick Usage**:
```bash
# Basic installation
./install-hooks.sh /path/to/project

# Force reinstall with backup
./install-hooks.sh --force /path/to/project

# Preview changes
./install-hooks.sh --dry-run /path/to/project

# Skip TTS validation
./install-hooks.sh --no-speak-check /path/to/project
```

**Documentation**: See [INSTALL_HOOKS_GUIDE.md](../docs/INSTALL_HOOKS_GUIDE.md) for detailed documentation.

## Adding to PATH

To use `install-hooks` from anywhere:

```bash
# Add to PATH in ~/.bashrc or ~/.bash_aliases
export PATH="$PATH:/home/bryan/multi-agent-observability-system/bin"

# Or create a symlink
sudo ln -s /home/bryan/multi-agent-observability-system/bin/install-hooks.sh /usr/local/bin/install-hooks
```

## Script Permissions

Ensure scripts are executable:
```bash
chmod +x install-hooks.sh
```