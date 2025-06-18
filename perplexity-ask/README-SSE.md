# Perplexity MCP Server with SSE Support

This MCP (Model Context Protocol) server for Perplexity AI now supports both stdio and HTTP/SSE transport modes.

## Features

- **Dual Transport Support**: Choose between stdio (default) or HTTP/SSE transport
- **Server-Sent Events (SSE)**: Real-time communication via HTTP
- **Three Perplexity Tools**:
  - `perplexity_ask`: General chat completion using sonar-pro model
  - `perplexity_research`: Deep research using sonar-deep-research model
  - `perplexity_reason`: Reasoning tasks using sonar-reasoning-pro model

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set your Perplexity API key:
```bash
export PERPLEXITY_API_KEY="your-api-key-here"
```

## Usage

### Transport Modes

The server can run in two modes controlled by the `MCP_TRANSPORT_MODE` environment variable:

#### 1. Stdio Mode (Default)
```bash
npm start
# or
MCP_TRANSPORT_MODE=stdio npm start
```

#### 2. HTTP/SSE Mode
```bash
MCP_TRANSPORT_MODE=http npm start
```

### Environment Variables

- `PERPLEXITY_API_KEY` (required): Your Perplexity API key
- `MCP_TRANSPORT_MODE`: Transport mode (`stdio` or `http`, default: `stdio`)
- `MCP_HTTP_PORT`: HTTP server port (default: `3000`)

## HTTP/SSE API Endpoints

When running in HTTP mode, the server provides the following endpoints:

### 1. Health Check
```
GET /health
```
Returns server status and configuration.

### 2. SSE Events
```
GET /mcp/events
```
Server-Sent Events endpoint for real-time communication.

### 3. List Tools
```
GET /mcp/tools
```
Returns available MCP tools.

### 4. Call Tool
```
POST /mcp/call
```
Call a specific tool with arguments.

**Request Body:**
```json
{
  "name": "perplexity_ask",
  "arguments": {
    "messages": [
      {
        "role": "user",
        "content": "What is artificial intelligence?"
      }
    ]
  }
}
```

### 5. Generic Request
```
POST /mcp/request
```
Generic endpoint for MCP requests.

**Request Body:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "perplexity_ask",
    "arguments": {
      "messages": [
        {
          "role": "user",
          "content": "What is artificial intelligence?"
        }
      ]
    }
  },
  "id": "request-1"
}
```

## Client Example

A complete HTML client example is provided in `client-example.html`. To use it:

1. Start the server in HTTP mode:
```bash
MCP_TRANSPORT_MODE=http npm start
```

2. Open `client-example.html` in a web browser
3. The client will automatically connect to the server
4. Use the interface to send messages and see real-time responses

## Building

```bash
npm run build
```

## Development

```bash
npm run dev
```

## API Response Format

### Successful Response
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Response from Perplexity API..."
      }
    ],
    "isError": false
  }
}
```

### Error Response
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "error": {
    "content": [
      {
        "type": "text",
        "text": "Error message..."
      }
    ],
    "isError": true
  }
}
```

## SSE Event Format

SSE events are sent in the following format:
```
data: {"type": "mcp_response", "id": "1", "result": {...}}
```

## Integration with Your Application

To integrate this MCP server with your application using SSE:

1. **Connect to SSE endpoint**:
```javascript
const eventSource = new EventSource('http://localhost:3000/mcp/events');
```

2. **Listen for events**:
```javascript
eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    // Handle MCP response
};
```

3. **Send requests**:
```javascript
const response = await fetch('http://localhost:3000/mcp/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        name: 'perplexity_ask',
        arguments: {
            messages: [{ role: 'user', content: 'Your question' }]
        }
    })
});
```

## Troubleshooting

1. **Connection Issues**: Ensure the server is running and the port is accessible
2. **API Key Errors**: Verify your `PERPLEXITY_API_KEY` is set correctly
3. **CORS Issues**: The server includes CORS headers for web clients
4. **Transport Mode**: Check that `MCP_TRANSPORT_MODE` is set to `http` for SSE support

## License

MIT License 