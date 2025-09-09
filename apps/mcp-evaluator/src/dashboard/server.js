/**
 * MCP Evaluator Dashboard Server
 * Real-time web interface for MCP server evaluation
 */

import express from 'express';
import expressWs from 'express-ws';
import path from 'path';
import { fileURLToPath } from 'url';
import MCPEvaluator from '../evaluator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startDashboard(options = {}) {
  const app = express();
  const wsInstance = expressWs(app);
  const port = options.port || 3457;

  // Store active evaluations
  const evaluations = new Map();
  const clients = new Set();

  // Middleware
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // WebSocket endpoint for real-time updates
  app.ws('/ws', (ws, req) => {
    clients.add(ws);
    
    // Send current evaluations
    ws.send(JSON.stringify({
      type: 'init',
      evaluations: Array.from(evaluations.values())
    }));

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  // Broadcast to all clients
  function broadcast(message) {
    const data = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(data);
      }
    });
  }

  // API endpoint to start evaluation
  app.post('/api/evaluate', async (req, res) => {
    const { serverPath, options = {} } = req.body;
    const evaluationId = Date.now().toString();

    try {
      const evaluator = new MCPEvaluator({
        serverPath,
        ...options
      });

      // Store evaluation
      evaluations.set(evaluationId, {
        id: evaluationId,
        serverPath,
        status: 'running',
        startTime: new Date().toISOString(),
        progress: {
          static: { total: 5, completed: 0 },
          runtime: { total: 0, completed: 0 }
        }
      });

      // Setup event listeners for real-time updates
      setupEvaluatorEvents(evaluator, evaluationId, broadcast);

      // Run evaluation asynchronously
      evaluator.evaluate().then(results => {
        const evaluation = evaluations.get(evaluationId);
        evaluation.status = 'completed';
        evaluation.results = results;
        evaluation.endTime = new Date().toISOString();
        
        broadcast({
          type: 'evaluation:completed',
          evaluationId,
          results
        });
      }).catch(error => {
        const evaluation = evaluations.get(evaluationId);
        evaluation.status = 'failed';
        evaluation.error = error.message;
        
        broadcast({
          type: 'evaluation:failed',
          evaluationId,
          error: error.message
        });
      });

      res.json({ evaluationId, status: 'started' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get evaluation status
  app.get('/api/evaluation/:id', (req, res) => {
    const evaluation = evaluations.get(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    res.json(evaluation);
  });

  // List all evaluations
  app.get('/api/evaluations', (req, res) => {
    res.json(Array.from(evaluations.values()));
  });

  // Stop evaluation
  app.post('/api/evaluation/:id/stop', (req, res) => {
    const evaluation = evaluations.get(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    
    // TODO: Implement evaluation cancellation
    evaluation.status = 'cancelled';
    
    broadcast({
      type: 'evaluation:cancelled',
      evaluationId: req.params.id
    });
    
    res.json({ status: 'cancelled' });
  });

  // Start Inspector only (separate from evaluation)
  app.post('/api/inspector/start', async (req, res) => {
    const { serverPath } = req.body;
    
    try {
      const { spawn } = await import('child_process');
      
      // Build inspector command for the specified server path
      const args = ['@modelcontextprotocol/inspector'];
      
      // If serverPath is provided and it's a script, add it to args
      if (serverPath && serverPath.trim()) {
        if (serverPath.endsWith('.sh') || serverPath.includes('/')) {
          // It's a script path, add it as the server command
          args.push(serverPath);
        } else if (serverPath !== '.' && serverPath !== '') {
          // It's a directory path, look for MCP config
          args.push(serverPath);
        }
      }
      
      console.log(`Starting Inspector: npx ${args.join(' ')}`);
      
      // Start Inspector process
      const inspectorProcess = spawn('npx', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });
      
      let output = '';
      let hasError = false;
      
      let actualUrl = 'http://localhost:6274';
      
      // Collect output for a few seconds to check for startup success
      inspectorProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log('Inspector stdout:', text);
        
        // Extract the actual Inspector URL with auth token
        const urlMatch = text.match(/http:\/\/localhost:6274\/\?MCP_PROXY_AUTH_TOKEN=([a-f0-9]+)/);
        if (urlMatch) {
          actualUrl = urlMatch[0];
          console.log('Captured Inspector URL with auth token:', actualUrl);
        }
      });
      
      inspectorProcess.stderr.on('data', (data) => {
        const error = data.toString();
        output += error;
        console.log('Inspector stderr:', error);
        
        // Some stderr is normal, only flag real errors
        if (error.includes('Error') || error.includes('EADDRINUSE')) {
          hasError = true;
        }
      });
      
      // Give Inspector time to start up
      setTimeout(() => {
        if (inspectorProcess.killed || hasError) {
          return res.status(500).json({ 
            error: 'Inspector failed to start',
            output: output
          });
        }
        
        res.json({ 
          status: 'started',
          message: 'Inspector started successfully',
          pid: inspectorProcess.pid,
          url: actualUrl, // Use the actual URL with auth token
          proxyPort: 6277,
          serverPath: serverPath || 'default'
        });
      }, 3000); // Wait 3 seconds for startup
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Kill Inspector processes
  app.post('/api/inspector/kill', async (req, res) => {
    try {
      const { exec } = await import('child_process');
      exec('pkill -f inspector', (error, stdout, stderr) => {
        if (error && error.code !== 1) {
          // Code 1 means no processes found, which is ok
          return res.status(500).json({ error: 'Failed to kill inspector' });
        }
        res.json({ status: 'killed', message: 'Inspector processes terminated' });
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check Inspector status
  app.get('/api/inspector/status', async (req, res) => {
    try {
      const { exec } = await import('child_process');
      exec('lsof -i:6274 -i:6277', (error, stdout, stderr) => {
        const running = !error && stdout.trim().length > 0;
        res.json({ 
          running,
          ports: {
            ui: 6274,
            proxy: 6277
          },
          url: running ? 'http://localhost:6274' : null
        });
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // List tools from MCP server
  app.post('/api/tools/list', async (req, res) => {
    const { serverPath } = req.body;
    
    if (!serverPath) {
      return res.status(400).json({ error: 'Server path is required' });
    }
    
    try {
      const { spawn } = await import('child_process');
      const { promisify } = await import('util');
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Create temporary files for MCP communication
      const tempDir = '/tmp';
      const initFile = path.join(tempDir, `mcp-init-${Date.now()}.json`);
      const toolsFile = path.join(tempDir, `mcp-tools-${Date.now()}.json`);
      
      // MCP protocol requests
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          clientInfo: { name: 'mcp-evaluator', version: '1.0.0' }
        }
      };
      
      const toolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      };
      
      await fs.writeFile(initFile, JSON.stringify(initRequest));
      await fs.writeFile(toolsFile, JSON.stringify(toolsRequest));
      
      // Determine command to run server
      let command, args;
      if (serverPath.endsWith('.sh')) {
        command = 'bash';
        args = [serverPath];
      } else if (serverPath.endsWith('.py')) {
        command = 'python3';
        args = [serverPath];
      } else {
        command = serverPath;
        args = [];
      }
      
      console.log(`Starting MCP server for tool discovery: ${command} ${args.join(' ')}`);
      console.log('Server path:', serverPath);
      
      // Start server and send requests
      const serverProcess = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let stderrOutput = '';
      let hasResponse = false;
      let isDockerReady = false;
      
      serverProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        console.log('MCP Server stdout chunk:', chunk);
        output += chunk;
      });
      
      serverProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        console.log('MCP Server stderr chunk:', chunk);
        stderrOutput += chunk;
        
        // Check if Docker connection is established
        if (chunk.includes('Connecting to Docker container') || 
            chunk.includes('Logging output to')) {
          console.log('Docker connection detected, server should be ready soon...');
          isDockerReady = true;
        }
      });
      
      // Send initialize request - wait for server startup
      setTimeout(() => {
        console.log('Sending initialize request:', JSON.stringify(initRequest));
        serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
        
        // Wait longer for Qdrant to connect to Docker container
        setTimeout(() => {
          console.log('Sending tools list request:', JSON.stringify(toolsRequest));
          serverProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');
          
          // Give server more time to respond, especially for Docker-based servers
          setTimeout(() => {
            console.log('Killing server process and parsing results...');
            serverProcess.kill();
            
            // Parse output for tools
            const tools = parseToolsFromOutput(output);
            
            // Cleanup temp files
            fs.unlink(initFile).catch(() => {});
            fs.unlink(toolsFile).catch(() => {});
            
            res.json({
              success: true,
              serverPath,
              tools,
              rawOutput: output,
              stderrOutput: stderrOutput
            });
          }, 5000);  // Extended to 5 seconds for response
        }, 3000);    // Extended to 3 seconds between requests
      }, 2000);      // Extended to 2 seconds for startup
      
      // Handle process errors
      serverProcess.on('error', (error) => {
        fs.unlink(initFile).catch(() => {});
        fs.unlink(toolsFile).catch(() => {});
        res.status(500).json({ 
          error: `Failed to start MCP server: ${error.message}`,
          serverPath
        });
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Manual tool data collection endpoint
  app.post('/api/manual-tool-data', async (req, res) => {
    const { serverPath, toolData } = req.body;
    
    if (!serverPath || !toolData || !Array.isArray(toolData.tools)) {
      return res.status(400).json({ 
        error: 'Server path and tool data are required',
        expected: {
          serverPath: 'string',
          toolData: {
            tools: [{
              name: 'string',
              description: 'string', 
              inputSchema: 'object',
              examples: 'array (optional)'
            }]
          }
        }
      });
    }

    try {
      // Validate tool data structure
      const validatedTools = toolData.tools.map(tool => {
        if (!tool.name || !tool.description) {
          throw new Error(`Tool missing required fields: ${JSON.stringify(tool)}`);
        }
        
        return {
          name: tool.name.trim(),
          description: tool.description.trim(),
          inputSchema: tool.inputSchema || { type: 'object', properties: {} },
          examples: tool.examples || []
        };
      });

      // Now run the evaluation with manual tool data
      console.log('Running evaluation with manual tool data:', validatedTools.length, 'tools');
      
      const evaluationId = Date.now().toString();
      const evaluator = new MCPEvaluator({
        serverPath,
        manualToolData: { tools: validatedTools }
      });

      // Store evaluation with manual data
      evaluations.set(evaluationId, {
        id: evaluationId,
        serverPath,
        status: 'running',
        startTime: new Date().toISOString(),
        manualMode: true,
        toolCount: validatedTools.length,
        progress: {
          static: { total: 5, completed: 0 },
          runtime: { total: validatedTools.length, completed: 0 }
        }
      });

      // Setup event listeners
      setupEvaluatorEvents(evaluator, evaluationId, broadcast);

      // Run evaluation
      evaluator.evaluate().catch(error => {
        console.error('Manual evaluation error:', error);
        evaluations.set(evaluationId, {
          ...evaluations.get(evaluationId),
          status: 'error',
          error: error.message,
          endTime: new Date().toISOString()
        });
        broadcast({ type: 'evaluation-error', evaluationId, error: error.message });
      });

      res.json({
        success: true,
        evaluationId,
        message: 'Manual evaluation started successfully',
        toolsToEvaluate: validatedTools.length,
        phase: 'running'
      });

    } catch (error) {
      console.error('Manual tool data error:', error);
      res.status(500).json({ 
        error: error.message,
        phase: 'validation-error'
      });
    }
  });

  // Helper function to parse tools from MCP server output
  function parseToolsFromOutput(output) {
    const tools = [];
    const lines = output.split('\n');
    
    console.log('=== MCP Server Raw Output ===');
    console.log(output);
    console.log('=== End Raw Output ===');
    
    for (const line of lines) {
      if (line.trim()) {
        console.log('Processing line:', line);
        try {
          const msg = JSON.parse(line);
          console.log('Parsed JSON message:', JSON.stringify(msg, null, 2));
          if (msg.result && msg.result.tools) {
            console.log('Found tools in message:', msg.result.tools);
            return msg.result.tools;
          }
        } catch (e) {
          console.log('Failed to parse as JSON:', e.message);
          // Not JSON or incomplete
        }
      }
    }
    
    console.log('No tools found in output');
    return tools;
  }

  // Serve dashboard HTML
  app.get('/', (req, res) => {
    res.send(getDashboardHTML());
  });

  // Start server
  app.listen(port, () => {
    console.log(`MCP Evaluator Dashboard running at http://localhost:${port}`);
  });

  return app;
}

/**
 * Setup evaluator event listeners
 */
function setupEvaluatorEvents(evaluator, evaluationId, broadcast) {
  // Static analysis events
  evaluator.on('static:started', () => {
    broadcast({
      type: 'static:started',
      evaluationId
    });
  });

  evaluator.on('hook:running', (data) => {
    broadcast({
      type: 'hook:running',
      evaluationId,
      hook: data.hook
    });
  });

  evaluator.on('hook:completed', (data) => {
    broadcast({
      type: 'hook:completed',
      evaluationId,
      hook: data.hook,
      status: data.status
    });
  });

  evaluator.on('hook:failed', (data) => {
    broadcast({
      type: 'hook:failed',
      evaluationId,
      hook: data.hook,
      error: data.error
    });
  });

  // Runtime testing events
  evaluator.on('runtime:started', () => {
    broadcast({
      type: 'runtime:started',
      evaluationId
    });
  });

  evaluator.on('tool:testing', (data) => {
    broadcast({
      type: 'tool:testing',
      evaluationId,
      tool: data.tool
    });
  });

  evaluator.on('tool:passed', (data) => {
    broadcast({
      type: 'tool:passed',
      evaluationId,
      tool: data.tool
    });
  });

  evaluator.on('tool:failed', (data) => {
    broadcast({
      type: 'tool:failed',
      evaluationId,
      tool: data.tool
    });
  });

  evaluator.on('resource:testing', (data) => {
    broadcast({
      type: 'resource:testing',
      evaluationId,
      resource: data.resource
    });
  });

  evaluator.on('performance:testing', () => {
    broadcast({
      type: 'performance:testing',
      evaluationId
    });
  });

  // Inspector events
  evaluator.inspector.on('inspector:output', (data) => {
    broadcast({
      type: 'inspector:output',
      evaluationId,
      message: data.message
    });
  });
}

/**
 * Get dashboard HTML
 */
function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Evaluator Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: white;
      text-align: center;
      margin-bottom: 30px;
      font-size: 2.5rem;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .evaluation-form {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    input {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 16px;
    }
    button {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
    }
    button:hover {
      background: #5a67d8;
    }
    .evaluation-item {
      padding: 15px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status.running { background: #fef3c7; color: #92400e; }
    .status.completed { background: #d1fae5; color: #065f46; }
    .status.failed { background: #fee2e2; color: #991b1b; }
    .progress {
      margin-top: 10px;
    }
    .progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: #667eea;
      transition: width 0.3s ease;
    }
    .test-result {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 5px;
      padding: 5px;
      background: #f9fafb;
      border-radius: 4px;
    }
    .test-result.passed { background: #d1fae5; }
    .test-result.failed { background: #fee2e2; }
    .log {
      background: #1f2937;
      color: #d1d5db;
      padding: 15px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      max-height: 300px;
      overflow-y: auto;
      margin-top: 10px;
    }
    .requirements {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      margin-top: 15px;
    }
    .requirement {
      padding: 10px;
      background: #f9fafb;
      border-radius: 6px;
      border-left: 4px solid #e5e7eb;
    }
    .requirement.passed { border-left-color: #10b981; }
    .requirement.failed { border-left-color: #ef4444; }
    .requirement.warning { border-left-color: #f59e0b; }
    .score {
      font-size: 2rem;
      font-weight: bold;
      text-align: center;
      margin: 20px 0;
    }
    .score.good { color: #10b981; }
    .score.warning { color: #f59e0b; }
    .score.bad { color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 MCP Server Evaluator</h1>
    
    <div class="card">
      <h2>MCP Inspector Control</h2>
      <div class="evaluation-form">
        <input type="text" id="serverPath" placeholder="Enter MCP server path or script..." value="">
        <button onclick="startInspector()" style="background: #10b981;">Start Inspector</button>
        <button onclick="listTools()" style="background: #8b5cf6;">List Tools</button>
        <button onclick="checkInspectorStatus()" style="background: #3b82f6;">Check Status</button>
        <button onclick="killInspector()" style="background: #ef4444;">Kill Inspector</button>
      </div>
      <div id="inspectorStatus" style="margin-top: 10px; padding: 10px; background: #f9fafb; border-radius: 6px; display: none;">
        <strong>Inspector Status:</strong> <span id="statusText">Checking...</span>
      </div>
      <div id="toolsList" style="margin-top: 10px; padding: 10px; background: #f0f9ff; border-radius: 6px; display: none;">
        <strong>MCP Tools:</strong>
        <div id="toolsContent">Loading...</div>
      </div>
      <div style="margin-top: 10px; font-size: 12px; color: #666;">
        Inspector URL: <a href="http://localhost:6274" target="_blank" id="inspectorLink">http://localhost:6274</a> (v0.16.6)
      </div>
    </div>

    <div class="card">
      <h2>Evaluation</h2>
      <div class="evaluation-form">
        <input type="text" id="evalServerPath" placeholder="Enter MCP server path for evaluation..." value=".">
        <button onclick="startEvaluation()">Start Evaluation</button>
      </div>
      <div style="margin-top: 10px; font-size: 12px; color: #666;">
        Note: This will start a full evaluation using the Inspector (if running) for runtime testing.
      </div>
    </div>

    <div class="card" style="display: none;" id="manualToolCard">
      <h2>Manual Tool Entry</h2>
      <p style="margin-bottom: 15px; color: #666;">
        Since automatic tool discovery failed, please manually enter the tools you found using the Inspector interface above.
      </p>
      <div id="manualToolsForm">
        <div id="toolEntries">
          <!-- Tool entries will be added here dynamically -->
        </div>
        <button onclick="addToolEntry()" style="background: #10b981; margin: 10px 5px 0 0;">Add Tool</button>
        <button onclick="startManualEvaluation()" style="background: #3b82f6; margin: 10px 0 0 0;">Start Evaluation with Manual Data</button>
      </div>
    </div>

    <div class="card">
      <h2>Active Evaluations</h2>
      <div id="evaluations"></div>
    </div>

    <div class="card" style="display: none;" id="resultsCard">
      <h2>Results</h2>
      <div id="results"></div>
    </div>
  </div>

  <script>
    let ws;
    const evaluations = new Map();

    // Connect WebSocket
    function connect() {
      ws = new WebSocket('ws://localhost:3457/ws');
      
      ws.onopen = () => {
        console.log('Connected to dashboard');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
      };

      ws.onclose = () => {
        console.log('Disconnected - reconnecting...');
        setTimeout(connect, 1000);
      };
    }

    // Handle WebSocket messages
    function handleMessage(data) {
      switch (data.type) {
        case 'init':
          data.evaluations.forEach(eval => {
            evaluations.set(eval.id, eval);
          });
          updateUI();
          break;
          
        case 'hook:running':
          updateProgress(data.evaluationId, 'hook', data.hook, 'running');
          break;
          
        case 'hook:completed':
          updateProgress(data.evaluationId, 'hook', data.hook, 'completed', data.status);
          break;
          
        case 'tool:testing':
          updateProgress(data.evaluationId, 'tool', data.tool, 'running');
          break;
          
        case 'tool:passed':
          updateProgress(data.evaluationId, 'tool', data.tool, 'passed');
          break;
          
        case 'tool:failed':
          updateProgress(data.evaluationId, 'tool', data.tool, 'failed');
          break;
          
        case 'evaluation:completed':
          const eval = evaluations.get(data.evaluationId);
          if (eval) {
            eval.status = 'completed';
            eval.results = data.results;
            updateUI();
            showResults(data.results);
          }
          break;
          
        case 'evaluation:failed':
          const failedEval = evaluations.get(data.evaluationId);
          if (failedEval) {
            failedEval.status = 'failed';
            failedEval.error = data.error;
            updateUI();
          }
          break;
      }
    }

    // Start Inspector only
    async function startInspector() {
      const serverPath = document.getElementById('serverPath').value;
      
      try {
        const response = await fetch('/api/inspector/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverPath })
        });
        
        const data = await response.json();
        
        if (data.status === 'started') {
          showInspectorStatus('Inspector started successfully on port 6274', 'success');
          // Open Inspector in new window after a short delay
          setTimeout(() => {
            window.open(data.url, 'mcp-inspector', 
              'width=1200,height=800,scrollbars=yes,resizable=yes');
          }, 1000);
        } else {
          showInspectorStatus('Failed to start Inspector: ' + (data.error || 'Unknown error'), 'error');
        }
      } catch (error) {
        showInspectorStatus('Error starting Inspector: ' + error.message, 'error');
      }
    }

    // Check Inspector status
    async function checkInspectorStatus() {
      try {
        const response = await fetch('/api/inspector/status');
        const data = await response.json();
        
        if (data.running) {
          showInspectorStatus('Inspector is running on ports 6274/6277', 'success');
        } else {
          showInspectorStatus('Inspector is not running', 'warning');
        }
      } catch (error) {
        showInspectorStatus('Error checking status: ' + error.message, 'error');
      }
    }

    // Show Inspector status
    function showInspectorStatus(message, type) {
      const statusDiv = document.getElementById('inspectorStatus');
      const statusText = document.getElementById('statusText');
      
      statusText.textContent = message;
      statusDiv.style.display = 'block';
      
      // Color coding
      if (type === 'success') {
        statusDiv.style.background = '#d1fae5';
        statusDiv.style.color = '#065f46';
      } else if (type === 'error') {
        statusDiv.style.background = '#fee2e2';
        statusDiv.style.color = '#991b1b';
      } else if (type === 'warning') {
        statusDiv.style.background = '#fef3c7';
        statusDiv.style.color = '#92400e';
      }
      
      // Hide after 5 seconds
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }

    // Start new evaluation
    async function startEvaluation() {
      const serverPath = document.getElementById('evalServerPath').value;
      
      // Open MCP Inspector in a new window alongside the evaluation
      // Note: Inspector v0.16.6 runs on port 6274 with proxy on 6277
      const inspectorWindow = window.open(
        'http://localhost:6274', 
        'mcp-inspector',
        'width=1200,height=800,scrollbars=yes,resizable=yes,left=100,top=100'
      );
      
      // Alert if Inspector couldn't be opened (e.g., popup blocked)
      if (!inspectorWindow) {
        alert('Could not open MCP Inspector. Please allow popups or manually open http://localhost:6274');
      }
      
      try {
        const response = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverPath })
        });
        
        const data = await response.json();
        
        if (data.evaluationId) {
          evaluations.set(data.evaluationId, {
            id: data.evaluationId,
            serverPath,
            status: 'running',
            startTime: new Date().toISOString()
          });
          updateUI();
        }
      } catch (error) {
        alert('Failed to start evaluation: ' + error.message);
      }
    }

    // Kill Inspector processes
    async function killInspector() {
      try {
        const response = await fetch('/api/inspector/kill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.status === 'killed') {
          showInspectorStatus('Inspector processes terminated successfully', 'success');
        }
      } catch (error) {
        showInspectorStatus('Failed to kill Inspector: ' + error.message, 'error');
      }
    }

    // List tools from MCP server
    async function listTools() {
      const serverPath = document.getElementById('serverPath').value;
      
      if (!serverPath.trim()) {
        showToolsList('Please enter a server path first', 'error');
        return;
      }
      
      showToolsList('Discovering tools...', 'loading');
      
      try {
        const response = await fetch('/api/tools/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverPath })
        });
        
        const data = await response.json();
        
        if (data.success && data.tools && data.tools.length > 0) {
          displayTools(data.tools);
        } else if (data.success && data.tools && data.tools.length === 0) {
          showToolsList('No tools found via direct connection. Use Inspector UI for tool discovery - click "Start Inspector" above and explore tools in the Inspector interface.', 'info');
          console.log('Raw server output:', data.rawOutput);
          console.log('Server stderr:', data.stderrOutput);
        } else {
          showToolsList('Failed to discover tools: ' + (data.error || 'Unknown error'), 'error');
          console.log('Raw server output:', data.rawOutput);
          console.log('Server stderr:', data.stderrOutput);
        }
      } catch (error) {
        showToolsList('Error listing tools: ' + error.message, 'error');
      }
    }

    // Display tools in formatted list
    function displayTools(tools) {
      let html = \`<div style="margin-bottom: 10px;"><strong>Found \${tools.length} tools:</strong></div>\`;
      
      tools.forEach((tool, index) => {
        html += \`
          <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 6px; border-left: 4px solid #8b5cf6;">
            <div style="font-weight: bold; color: #1f2937;">\${index + 1}. \${tool.name}</div>
            \${tool.description ? \`<div style="margin-top: 5px; color: #4b5563;">\${tool.description}</div>\` : ''}
            \${tool.inputSchema && tool.inputSchema.properties ? \`
              <div style="margin-top: 8px;">
                <strong>Parameters:</strong>
                <ul style="margin: 5px 0 0 20px; padding: 0;">
                  \${Object.entries(tool.inputSchema.properties).map(([param, schema]) => {
                    const required = tool.inputSchema.required?.includes(param) ? ' <span style="color: #dc2626;">(required)</span>' : '';
                    const description = schema.description ? \` - \${schema.description}\` : '';
                    return \`<li><code>\${param}</code>: \${schema.type || 'unknown'}\${required}\${description}</li>\`;
                  }).join('')}
                </ul>
              </div>
            \` : ''}
          </div>
        \`;
      });
      
      const toolsDiv = document.getElementById('toolsList');
      const toolsContent = document.getElementById('toolsContent');
      
      toolsContent.innerHTML = html;
      toolsDiv.style.display = 'block';
      toolsDiv.style.background = '#f0f9ff';
      toolsDiv.style.color = '#1e40af';
    }

    // Show tools list with status
    function showToolsList(message, type) {
      const toolsDiv = document.getElementById('toolsList');
      const toolsContent = document.getElementById('toolsContent');
      
      toolsContent.textContent = message;
      toolsDiv.style.display = 'block';
      
      // Color coding
      if (type === 'success') {
        toolsDiv.style.background = '#f0f9ff';
        toolsDiv.style.color = '#1e40af';
      } else if (type === 'error') {
        toolsDiv.style.background = '#fee2e2';
        toolsDiv.style.color = '#991b1b';
      } else if (type === 'warning') {
        toolsDiv.style.background = '#fef3c7';
        toolsDiv.style.color = '#92400e';
      } else if (type === 'loading') {
        toolsDiv.style.background = '#f3f4f6';
        toolsDiv.style.color = '#374151';
      } else if (type === 'info') {
        toolsDiv.style.background = '#e0f2fe';
        toolsDiv.style.color = '#0369a1';
      }
      
      // Auto-hide after 10 seconds for non-success messages
      if (type !== 'success') {
        setTimeout(() => {
          if (toolsContent.textContent === message) {
            toolsDiv.style.display = 'none';
          }
        }, 10000);
      }
    }

    // Update progress
    function updateProgress(evaluationId, type, item, status, details) {
      const eval = evaluations.get(evaluationId);
      if (!eval) return;
      
      if (!eval.progress) {
        eval.progress = { hooks: {}, tools: {} };
      }
      
      if (type === 'hook') {
        eval.progress.hooks[item] = { status, details };
      } else if (type === 'tool') {
        eval.progress.tools[item] = { status, details };
      }
      
      updateUI();
    }

    // Update UI
    function updateUI() {
      const container = document.getElementById('evaluations');
      container.innerHTML = '';
      
      evaluations.forEach(eval => {
        const div = document.createElement('div');
        div.className = 'evaluation-item';
        
        const statusClass = eval.status.toLowerCase();
        const progressPercent = calculateProgress(eval);
        
        div.innerHTML = \`
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>\${eval.serverPath}</strong>
              <span class="status \${statusClass}">\${eval.status}</span>
            </div>
            <div>Started: \${new Date(eval.startTime).toLocaleTimeString()}</div>
          </div>
          \${eval.status === 'running' ? \`
            <div class="progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: \${progressPercent}%"></div>
              </div>
              <small>\${progressPercent}% complete</small>
            </div>
          \` : ''}
          \${eval.error ? \`<div style="color: red; margin-top: 10px;">Error: \${eval.error}</div>\` : ''}
        \`;
        
        container.appendChild(div);
      });
    }

    // Calculate progress
    function calculateProgress(eval) {
      if (!eval.progress) return 0;
      
      const hooks = Object.keys(eval.progress.hooks || {}).length;
      const tools = Object.keys(eval.progress.tools || {}).length;
      const total = 10; // Approximate total tests
      
      return Math.round(((hooks + tools) / total) * 100);
    }

    // Show results
    function showResults(results) {
      const card = document.getElementById('resultsCard');
      const container = document.getElementById('results');
      
      card.style.display = 'block';
      
      const scoreClass = results.score >= 80 ? 'good' : 
                        results.score >= 60 ? 'warning' : 'bad';
      
      container.innerHTML = \`
        <div class="score \${scoreClass}">\${results.score.toFixed(1)}%</div>
        <div class="requirements">
          \${Object.entries(results.combined || {}).map(([req, data]) => \`
            <div class="requirement \${data.score === 1 ? 'passed' : data.score > 0 ? 'warning' : 'failed'}">
              <strong>\${req}</strong>
              <div>Score: \${(data.score * 100).toFixed(0)}%</div>
            </div>
          \`).join('')}
        </div>
        <div style="margin-top: 20px;">
          <h3>Recommendations:</h3>
          <ul>
            \${(results.recommendations || []).map(rec => \`<li>\${rec}</li>\`).join('')}
          </ul>
        </div>
      \`;
    }

    // Manual tool entry functions
    let toolEntryCounter = 0;
    
    function addToolEntry() {
      toolEntryCounter++;
      const toolEntries = document.getElementById('toolEntries');
      
      const entryDiv = document.createElement('div');
      entryDiv.id = 'toolEntry' + toolEntryCounter;
      entryDiv.style.cssText = 'border: 1px solid #e5e7eb; padding: 15px; margin: 10px 0; border-radius: 6px; background: #f9fafb;';
      
      entryDiv.innerHTML = 
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">' +
          '<h4 style="margin: 0; color: #374151;">Tool #' + toolEntryCounter + '</h4>' +
          '<button onclick="removeToolEntry(' + toolEntryCounter + ')" style="background: #ef4444; padding: 5px 10px; font-size: 12px;">Remove</button>' +
        '</div>' +
        '<div style="margin-bottom: 10px;">' +
          '<label style="display: block; margin-bottom: 5px; font-weight: 500;">Tool Name:</label>' +
          '<input type="text" id="toolName' + toolEntryCounter + '" placeholder="e.g., qdrant_store" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">' +
        '</div>' +
        '<div style="margin-bottom: 10px;">' +
          '<label style="display: block; margin-bottom: 5px; font-weight: 500;">Description:</label>' +
          '<textarea id="toolDesc' + toolEntryCounter + '" placeholder="Brief description of what this tool does..." rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; resize: vertical;"></textarea>' +
        '</div>' +
        '<div style="margin-bottom: 10px;">' +
          '<label style="display: block; margin-bottom: 5px; font-weight: 500;">Input Schema (JSON):</label>' +
          '<textarea id="toolSchema' + toolEntryCounter + '" placeholder=\'{"type": "object", "properties": {"param1": {"type": "string", "description": "..."}}, "required": ["param1"]}\' rows="3" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; resize: vertical; font-family: monospace; font-size: 12px;"></textarea>' +
        '</div>' +
        '<div>' +
          '<label style="display: block; margin-bottom: 5px; font-weight: 500;">Examples (one per line, optional):</label>' +
          '<textarea id="toolExamples' + toolEntryCounter + '" placeholder="Example usage or parameters..." rows="2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; resize: vertical;"></textarea>' +
        '</div>';
      
      toolEntries.appendChild(entryDiv);
    }
    
    function removeToolEntry(entryId) {
      const entry = document.getElementById('toolEntry' + entryId);
      if (entry) {
        entry.remove();
      }
    }
    
    async function startManualEvaluation() {
      const serverPath = document.getElementById('evalServerPath').value;
      if (!serverPath.trim()) {
        alert('Please enter a server path for evaluation');
        return;
      }
      
      // Collect all tool data
      const tools = [];
      const toolEntries = document.querySelectorAll('[id^="toolEntry"]');
      
      for (const entry of toolEntries) {
        const entryId = entry.id.replace('toolEntry', '');
        const name = document.getElementById('toolName' + entryId).value.trim();
        const description = document.getElementById('toolDesc' + entryId).value.trim();
        const schemaText = document.getElementById('toolSchema' + entryId).value.trim();
        const examplesText = document.getElementById('toolExamples' + entryId).value.trim();
        
        if (!name || !description) {
          alert('Tool #' + entryId + ' is missing name or description');
          return;
        }
        
        let inputSchema = { type: 'object', properties: {} };
        if (schemaText) {
          try {
            inputSchema = JSON.parse(schemaText);
          } catch (e) {
            alert('Tool #' + entryId + ' has invalid JSON schema: ' + e.message);
            return;
          }
        }
        
        const examples = examplesText ? examplesText.split('\n').filter(line => line.trim()) : [];
        
        tools.push({
          name,
          description,
          inputSchema,
          examples
        });
      }
      
      if (tools.length === 0) {
        alert('Please add at least one tool before starting evaluation');
        return;
      }
      
      // Submit manual tool data and start evaluation
      try {
        showToolsList('Starting evaluation with manual tool data...', 'loading');
        
        const response = await fetch('/api/manual-tool-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverPath,
            toolData: { tools }
          })
        });
        
        const result = await response.json();
        
        if (result.status === 'started') {
          showToolsList('Evaluation started with ' + tools.length + ' manual tools', 'success');
          // Hide the manual tool entry form
          document.getElementById('manualToolCard').style.display = 'none';
        } else {
          showToolsList('Error: ' + result.error, 'error');
        }
        
      } catch (error) {
        console.error('Manual evaluation error:', error);
        showToolsList('Error starting evaluation: ' + error.message, 'error');
      }
    }

    // Modify the existing startEvaluation function to show manual tool entry if no tools found
    const originalStartEvaluation = startEvaluation;
    startEvaluation = async function() {
      const serverPath = document.getElementById('evalServerPath').value;
      if (!serverPath.trim()) {
        alert('Please enter a server path for evaluation');
        return;
      }
      
      // First try to discover tools automatically
      try {
        showToolsList('Checking for automatic tool discovery...', 'loading');
        
        const toolResponse = await fetch('/api/tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverPath })
        });
        
        const toolData = await toolResponse.json();
        
        if (toolData.tools && toolData.tools.length > 0) {
          // Automatic discovery worked, proceed with normal evaluation
          showToolsList('Found ' + toolData.tools.length + ' tools automatically', 'success');
          await originalStartEvaluation();
        } else {
          // No tools found automatically, show manual entry form
          showToolsList('No tools found automatically. Please use manual tool entry below.', 'info');
          document.getElementById('manualToolCard').style.display = 'block';
          
          // Add one tool entry by default
          if (document.getElementById('toolEntries').children.length === 0) {
            addToolEntry();
          }
        }
      } catch (error) {
        console.error('Tool discovery error:', error);
        showToolsList('Tool discovery failed. Please use manual tool entry below.', 'warning');
        document.getElementById('manualToolCard').style.display = 'block';
        
        // Add one tool entry by default
        if (document.getElementById('toolEntries').children.length === 0) {
          addToolEntry();
        }
      }
    };

    // Initialize
    connect();
  </script>
</body>
</html>`;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startDashboard();
}