# Multi-Agent Observability System CLI

**Terminal-First Operations** - A comprehensive command-line interface for the Multi-Agent Observability System providing power users with full access to all major system functionality.

## Features

🚀 **Real-time Monitoring**
- Live status dashboard with agent tracking
- WebSocket-powered real-time updates
- Interactive terminal UI with blessed

⚡ **Comprehensive Agent Management**
- View active agents and performance metrics
- Agent timeline and distribution analysis
- Performance profiling and optimization insights

🔗 **Session Relationship Tracking**
- Hierarchical session tree visualization
- Relationship statistics and analysis
- Session handoff management

📊 **Data Export & Analysis**
- Multiple export formats (JSON, CSV, YAML)
- Configurable data filtering and limits
- Batch operations and automation support

🎨 **Theme Management**
- Create, import, and export UI themes
- Theme marketplace and sharing
- Custom color scheme generation

⚙️ **System Configuration**
- Interactive configuration management
- Connectivity testing and diagnostics
- Fallback mode and error handling

## Quick Start

### Installation

```bash
# Install the CLI
cd bin
./install.sh

# Or install dependencies manually
npm install
chmod +x obs
sudo ln -s $(pwd)/obs /usr/local/bin/obs
```

### Basic Usage

```bash
# Check system status
obs status

# Start live monitoring
obs monitor

# View active agents
obs agents --active

# Watch events in real-time
obs events --watch

# Interactive help
obs help-interactive
```

## Commands Overview

### Monitoring & Status
```bash
obs status                    # System status overview
obs status --watch            # Watch status in real-time
obs status --compact          # Compact display mode
obs monitor                   # Live dashboard
obs monitor --focus agents    # Focus on specific area
```

### Agent Management
```bash
obs agents                    # Interactive agent overview
obs agents --active           # Show active agents only
obs agents --metrics          # Performance metrics
obs agents --timeline 24      # Activity timeline (24h)
obs agents --distribution     # Agent type distribution
obs agents --performance <name>  # Specific agent analysis
obs agents --tools            # Tool usage analytics
```

## License

Part of the Multi-Agent Observability System project.
