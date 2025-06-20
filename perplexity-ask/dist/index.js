#!/usr/bin/env node
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
/**
 * Definition of the Perplexity Ask Tool.
 * This tool accepts an array of messages and returns a chat completion response
 * from the Perplexity API, with citations appended to the message if provided.
 */
const PERPLEXITY_ASK_TOOL = {
    name: "perplexity_ask",
    description: "Engages in a conversation using the Sonar API. " +
        "Accepts an array of messages (each with a role and content) " +
        "and returns a ask completion response from the Perplexity model.",
    inputSchema: {
        type: "object",
        properties: {
            messages: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        role: {
                            type: "string",
                            description: "Role of the message (e.g., system, user, assistant)",
                        },
                        content: {
                            type: "string",
                            description: "The content of the message",
                        },
                    },
                    required: ["role", "content"],
                },
                description: "Array of conversation messages",
            },
        },
        required: ["messages"],
    },
};
/**
 * Definition of the Perplexity Research Tool.
 * This tool performs deep research queries using the Perplexity API.
 */
const PERPLEXITY_RESEARCH_TOOL = {
    name: "perplexity_research",
    description: "Performs deep research using the Perplexity API. " +
        "Accepts an array of messages (each with a role and content) " +
        "and returns a comprehensive research response with citations.",
    inputSchema: {
        type: "object",
        properties: {
            messages: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        role: {
                            type: "string",
                            description: "Role of the message (e.g., system, user, assistant)",
                        },
                        content: {
                            type: "string",
                            description: "The content of the message",
                        },
                    },
                    required: ["role", "content"],
                },
                description: "Array of conversation messages",
            },
        },
        required: ["messages"],
    },
};
/**
 * Definition of the Perplexity Reason Tool.
 * This tool performs reasoning queries using the Perplexity API.
 */
const PERPLEXITY_REASON_TOOL = {
    name: "perplexity_reason",
    description: "Performs reasoning tasks using the Perplexity API. " +
        "Accepts an array of messages (each with a role and content) " +
        "and returns a well-reasoned response using the sonar-reasoning-pro model.",
    inputSchema: {
        type: "object",
        properties: {
            messages: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        role: {
                            type: "string",
                            description: "Role of the message (e.g., system, user, assistant)",
                        },
                        content: {
                            type: "string",
                            description: "The content of the message",
                        },
                    },
                    required: ["role", "content"],
                },
                description: "Array of conversation messages",
            },
        },
        required: ["messages"],
    },
};
// Retrieve the Perplexity API key from environment variables
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
if (!PERPLEXITY_API_KEY) {
    console.error("Error: PERPLEXITY_API_KEY environment variable is required");
    process.exit(1);
}
// Get transport mode from environment variable
const TRANSPORT_MODE = process.env.MCP_TRANSPORT_MODE || "stdio"; // "stdio" or "http"
const HTTP_PORT = parseInt(process.env.MCP_HTTP_PORT || "3000");
/**
 * Performs a chat completion by sending a request to the Perplexity API.
 * Appends citations to the returned message content if they exist.
 *
 * @param {Array<{ role: string; content: string }>} messages - An array of message objects.
 * @param {string} model - The model to use for the completion.
 * @returns {Promise<string>} The chat completion result with appended citations.
 * @throws Will throw an error if the API request fails.
 */
function performChatCompletion(messages_1) {
    return __awaiter(this, arguments, void 0, function* (messages, model = "sonar-pro") {
        // Construct the API endpoint URL and request body
        const url = new URL("https://api.perplexity.ai/chat/completions");
        const body = {
            model: model, // Model identifier passed as parameter
            messages: messages,
            // Additional parameters can be added here if required (e.g., max_tokens, temperature, etc.)
            // See the Sonar API documentation for more details: 
            // https://docs.perplexity.ai/api-reference/chat-completions
        };
        let response;
        try {
            response = yield fetch(url.toString(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
                },
                body: JSON.stringify(body),
            });
        }
        catch (error) {
            throw new Error(`Network error while calling Perplexity API: ${error}`);
        }
        // Check for non-successful HTTP status
        if (!response.ok) {
            let errorText;
            try {
                errorText = yield response.text();
            }
            catch (parseError) {
                errorText = "Unable to parse error response";
            }
            throw new Error(`Perplexity API error: ${response.status} ${response.statusText}\n${errorText}`);
        }
        // Attempt to parse the JSON response from the API
        let data;
        try {
            data = yield response.json();
        }
        catch (jsonError) {
            throw new Error(`Failed to parse JSON response from Perplexity API: ${jsonError}`);
        }
        // Directly retrieve the main message content from the response 
        let messageContent = data.choices[0].message.content;
        // If citations are provided, append them to the message content
        if (data.citations && Array.isArray(data.citations) && data.citations.length > 0) {
            messageContent += "\n\nCitations:\n";
            data.citations.forEach((citation, index) => {
                messageContent += `[${index + 1}] ${citation}\n`;
            });
        }
        return messageContent;
    });
}
// Initialize the server with tool metadata and capabilities
const server = new Server({
    name: "example-servers/perplexity-ask",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
/**
 * Registers a handler for listing available tools.
 * When the client requests a list of tools, this handler returns all available Perplexity tools.
 */
server.setRequestHandler(ListToolsRequestSchema, () => __awaiter(void 0, void 0, void 0, function* () {
    return ({
        tools: [PERPLEXITY_ASK_TOOL, PERPLEXITY_RESEARCH_TOOL, PERPLEXITY_REASON_TOOL],
    });
}));
/**
 * Registers a handler for calling a specific tool.
 * Processes requests by validating input and invoking the appropriate tool.
 *
 * @param {object} request - The incoming tool call request.
 * @returns {Promise<object>} The response containing the tool's result or an error.
 */
server.setRequestHandler(CallToolRequestSchema, (request) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, arguments: args } = request.params;
        if (!args) {
            throw new Error("No arguments provided");
        }
        switch (name) {
            case "perplexity_ask": {
                if (!Array.isArray(args.messages)) {
                    throw new Error("Invalid arguments for perplexity_ask: 'messages' must be an array");
                }
                // Invoke the chat completion function with the provided messages
                const messages = args.messages;
                const result = yield performChatCompletion(messages, "sonar-pro");
                return {
                    content: [{ type: "text", text: result }],
                    isError: false,
                };
            }
            case "perplexity_research": {
                if (!Array.isArray(args.messages)) {
                    throw new Error("Invalid arguments for perplexity_research: 'messages' must be an array");
                }
                // Invoke the chat completion function with the provided messages using the deep research model
                const messages = args.messages;
                const result = yield performChatCompletion(messages, "sonar-deep-research");
                return {
                    content: [{ type: "text", text: result }],
                    isError: false,
                };
            }
            case "perplexity_reason": {
                if (!Array.isArray(args.messages)) {
                    throw new Error("Invalid arguments for perplexity_reason: 'messages' must be an array");
                }
                // Invoke the chat completion function with the provided messages using the reasoning model
                const messages = args.messages;
                const result = yield performChatCompletion(messages, "sonar-reasoning-pro");
                return {
                    content: [{ type: "text", text: result }],
                    isError: false,
                };
            }
            default:
                // Respond with an error if an unknown tool is requested
                return {
                    content: [{ type: "text", text: `Unknown tool: ${name}` }],
                    isError: true,
                };
        }
    }
    catch (error) {
        // Return error details in the response
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
}));
/**
 * HTTP Server Transport for SSE support
 */
class HttpServerTransport {
    constructor(port = 3000) {
        this.clients = new Set();
        this.port = port;
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
    }
    setupRoutes() {
        // Health check endpoint
        this.app.get("/health", (req, res) => {
            res.json({ status: "ok", transport: "http", port: this.port });
        });
        // SSE endpoint for MCP communication
        this.app.get("/mcp/events", (req, res) => {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control",
            });
            // Send initial connection event (optional, can be removed if n8n doesn't expect it)
            res.write(`data: ${JSON.stringify({ jsonrpc: "2.0", id: null, result: { status: "connected", timestamp: new Date().toISOString() } })}\n\n`);
            // Add client to set
            this.clients.add(res);
            // Handle client disconnect
            req.on("close", () => {
                this.clients.delete(res);
            });
        });
        // Endpoint to get available tools
        this.app.get("/mcp/tools", (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = {
                    jsonrpc: "2.0",
                    id: "1",
                    result: {
                        tools: [PERPLEXITY_ASK_TOOL, PERPLEXITY_RESEARCH_TOOL, PERPLEXITY_REASON_TOOL]
                    }
                };
                res.json(result);
                // Also broadcast to SSE clients (optional, usually not needed for GET)
            }
            catch (error) {
                console.error("Error listing tools:", error);
                res.status(500).json({ error: "Internal server error" });
            }
        }));
        // Endpoint to call a specific tool
        this.app.post("/mcp/call", (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, arguments: args } = req.body;
                let result;
                if (!args) {
                    throw new Error("No arguments provided");
                }
                switch (name) {
                    case "perplexity_ask": {
                        if (!Array.isArray(args.messages)) {
                            throw new Error("Invalid arguments for perplexity_ask: 'messages' must be an array");
                        }
                        const messages = args.messages;
                        const response = yield performChatCompletion(messages, "sonar-pro");
                        result = {
                            content: [{ type: "text", text: response }],
                            isError: false,
                        };
                        break;
                    }
                    case "perplexity_research": {
                        if (!Array.isArray(args.messages)) {
                            throw new Error("Invalid arguments for perplexity_research: 'messages' must be an array");
                        }
                        const messages = args.messages;
                        const response = yield performChatCompletion(messages, "sonar-deep-research");
                        result = {
                            content: [{ type: "text", text: response }],
                            isError: false,
                        };
                        break;
                    }
                    case "perplexity_reason": {
                        if (!Array.isArray(args.messages)) {
                            throw new Error("Invalid arguments for perplexity_reason: 'messages' must be an array");
                        }
                        const messages = args.messages;
                        const response = yield performChatCompletion(messages, "sonar-reasoning-pro");
                        result = {
                            content: [{ type: "text", text: response }],
                            isError: false,
                        };
                        break;
                    }
                    default:
                        result = {
                            content: [{ type: "text", text: `Unknown tool: ${name}` }],
                            isError: true,
                        };
                }
                // Broadcast JSON-RPC 2.0 result
                this.broadcast({
                    jsonrpc: "2.0",
                    id: req.body.id || "1",
                    result: result
                });
                res.json({
                    jsonrpc: "2.0",
                    id: req.body.id || "1",
                    result: result
                });
            }
            catch (error) {
                const errorResult = {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                    isError: true,
                };
                // Broadcast JSON-RPC 2.0 error
                this.broadcast({
                    jsonrpc: "2.0",
                    id: req.body.id || "1",
                    error: errorResult
                });
                res.status(500).json({
                    jsonrpc: "2.0",
                    id: req.body.id || "1",
                    error: errorResult
                });
            }
        }));
        // Endpoint to send MCP requests (alternative to direct endpoints)
        this.app.post("/mcp/request", (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { method, params, id } = req.body;
                let result;
                if (method === "tools/list") {
                    result = {
                        tools: [PERPLEXITY_ASK_TOOL, PERPLEXITY_RESEARCH_TOOL, PERPLEXITY_REASON_TOOL]
                    };
                    // Broadcast JSON-RPC 2.0 result
                    this.broadcast({
                        jsonrpc: "2.0",
                        id: id || "1",
                        result: result
                    });
                }
                else if (method === "tools/call") {
                    const { name, arguments: args } = params;
                    if (!args) {
                        throw new Error("No arguments provided");
                    }
                    switch (name) {
                        case "perplexity_ask": {
                            if (!Array.isArray(args.messages)) {
                                throw new Error("Invalid arguments for perplexity_ask: 'messages' must be an array");
                            }
                            const messages = args.messages;
                            const response = yield performChatCompletion(messages, "sonar-pro");
                            result = {
                                content: [{ type: "text", text: response }],
                                isError: false,
                            };
                            break;
                        }
                        case "perplexity_research": {
                            if (!Array.isArray(args.messages)) {
                                throw new Error("Invalid arguments for perplexity_research: 'messages' must be an array");
                            }
                            const messages = args.messages;
                            const response = yield performChatCompletion(messages, "sonar-deep-research");
                            result = {
                                content: [{ type: "text", text: response }],
                                isError: false,
                            };
                            break;
                        }
                        case "perplexity_reason": {
                            if (!Array.isArray(args.messages)) {
                                throw new Error("Invalid arguments for perplexity_reason: 'messages' must be an array");
                            }
                            const messages = args.messages;
                            const response = yield performChatCompletion(messages, "sonar-reasoning-pro");
                            result = {
                                content: [{ type: "text", text: response }],
                                isError: false,
                            };
                            break;
                        }
                        default:
                            result = {
                                content: [{ type: "text", text: `Unknown tool: ${name}` }],
                                isError: true,
                            };
                    }
                    // Broadcast JSON-RPC 2.0 result
                    this.broadcast({
                        jsonrpc: "2.0",
                        id: id || "1",
                        result: result
                    });
                }
                else {
                    throw new Error(`Unknown method: ${method}`);
                }
                res.json({
                    status: "sent",
                    result: {
                        jsonrpc: "2.0",
                        id: id || "1",
                        result: result
                    }
                });
            }
            catch (error) {
                const { id } = req.body;
                const errorResult = {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                    isError: true,
                };
                // Broadcast JSON-RPC 2.0 error
                this.broadcast({
                    jsonrpc: "2.0",
                    id: id || "1",
                    error: errorResult
                });
                res.status(500).json({ error: "Internal server error" });
            }
        }));
    }
    broadcast(data) {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        this.clients.forEach(client => {
            client.write(message);
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                this.app.listen(this.port, () => {
                    console.error(`Perplexity MCP Server running on HTTP port ${this.port}`);
                    console.error(`SSE endpoint: http://localhost:${this.port}/mcp/events`);
                    console.error(`Health check: http://localhost:${this.port}/health`);
                    console.error(`Tools endpoint: http://localhost:${this.port}/mcp/tools`);
                    console.error(`Call endpoint: http://localhost:${this.port}/mcp/call`);
                    console.error(`Request endpoint: http://localhost:${this.port}/mcp/request`);
                    resolve();
                });
            });
        });
    }
}
/**
 * Initializes and runs the server using the specified transport mode.
 * Supports both stdio and HTTP/SSE transport.
 */
function runServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (TRANSPORT_MODE === "http") {
                const transport = new HttpServerTransport(HTTP_PORT);
                yield transport.start();
            }
            else {
                // Default to stdio transport
                const transport = new StdioServerTransport();
                yield server.connect(transport);
                console.error("Perplexity MCP Server running on stdio with Ask, Research, and Reason tools");
            }
        }
        catch (error) {
            console.error("Fatal error running server:", error);
            process.exit(1);
        }
    });
}
// Start the server and catch any startup errors
runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
