import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Terminal,
  Clock,
  History,
  Plus,
  Server,
  Zap,
  MessageSquare,
  Settings,
} from "lucide-react";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AdminLayout from "@/components/AdminLayout";
import { useSEO } from "@/lib/seo";
import { captureException } from "@/lib/sentry";
import ReactMarkdown from "react-markdown";

// Backend modes for AI interaction
type AgentBackend = "server" | "api";

interface ChatSession {
  id: string;
  title: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
}

// Response timeout (30 seconds)
const RESPONSE_TIMEOUT_MS = 30000;

// Use crypto.randomUUID for generating UUIDs (supported in modern browsers)
const generateId = () => crypto.randomUUID();

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed";
}

interface Confirmation {
  id: string;
  toolName: string;
  description: string;
  status: "pending" | "approved" | "rejected";
}

const AIManager = () => {
  useSEO({ title: "AI Manager", noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const { user } = useAuth();

  const [sessionId, setSessionId] = useState(() => generateId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<Confirmation | null>(null);

  // New state for chat history and backend selection
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [agentBackend, setAgentBackend] = useState<AgentBackend>("server");
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(
    () => sessionStorage.getItem("claude_api_key") || "",
  );
  const responseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load chat sessions from Supabase
  useEffect(() => {
    if (!supabase || !user) return;

    const loadSessions = async () => {
      const { data, error } = await supabase
        .from("agent_sessions")
        .select("id, title, message_count, last_message_at, created_at")
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setChatSessions(data);
      }
    };

    loadSessions();
  }, [supabase, user]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
    };
  }, []);

  // Load messages for a specific session
  const loadSession = async (targetSessionId: string) => {
    if (!supabase) return;

    setSessionId(targetSessionId);
    setMessages([]);
    setIsLoading(true);
    setShowHistory(false);

    try {
      // Load commands (user messages)
      const { data: commands } = await supabase
        .from("agent_commands")
        .select("id, content, created_at")
        .eq("session_id", targetSessionId)
        .order("created_at", { ascending: true });

      // Load responses (assistant messages)
      const { data: responses } = await supabase
        .from("agent_responses")
        .select("id, response_type, content, created_at")
        .eq("session_id", targetSessionId)
        .in("response_type", ["message"])
        .order("created_at", { ascending: true });

      // Combine and sort messages
      const allMessages: Message[] = [];

      if (commands) {
        commands.forEach((cmd) => {
          allMessages.push({
            id: cmd.id,
            role: "user",
            content: cmd.content,
            timestamp: new Date(cmd.created_at),
          });
        });
      }

      if (responses) {
        responses.forEach((resp) => {
          allMessages.push({
            id: resp.id,
            role: "assistant",
            content: resp.content,
            timestamp: new Date(resp.created_at),
          });
        });
      }

      // Sort by timestamp
      allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setMessages(allMessages);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "AIManager.loadSession",
        },
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Start a new chat session
  const startNewSession = () => {
    const newSessionId = generateId();
    setSessionId(newSessionId);
    setMessages([]);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  // Save API key to sessionStorage (cleared when tab closes)
  const saveApiKey = (key: string) => {
    setApiKey(key);
    sessionStorage.setItem("claude_api_key", key);
  };

  // Direct API call to Claude (for 'api' backend mode)
  const callClaudeAPI = async (userMessage: string): Promise<string> => {
    if (!apiKey) {
      throw new Error(
        "API key not configured. Please add your Claude API key in settings.",
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          ...messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              role: m.role,
              content: m.content,
            })),
          { role: "user", content: userMessage },
        ],
        system: `You are an AI assistant helping manage a personal website. You can help with:
- Answering questions about the site
- Suggesting content improvements
- Explaining technical concepts
- Planning features and improvements

Note: In API mode, you don't have access to tools like file operations or git commands. For those, switch to Server mode.`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "API request failed");
    }

    const data = await response.json();
    return data.content[0]?.text || "No response received";
  };

  // Handle agent responses from real-time subscription
  const handleAgentResponse = useCallback(
    (response: Record<string, unknown>) => {
      const responseType = response.response_type as string;

      switch (responseType) {
        case "message":
          // Clear timeout - we got a response
          if (responseTimeoutRef.current) {
            clearTimeout(responseTimeoutRef.current);
          }
          setMessages((prev) => [
            ...prev,
            {
              id: response.id as string,
              role: "assistant",
              content: response.content as string,
              timestamp: new Date(response.created_at as string),
            },
          ]);
          break;

        case "tool_use":
          // Update the last assistant message with tool call info
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === "assistant") {
              const toolCalls = lastMessage.toolCalls || [];
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMessage,
                  toolCalls: [
                    ...toolCalls,
                    {
                      name: response.tool_name as string,
                      input: response.tool_input as Record<string, unknown>,
                      status: "running" as const,
                    },
                  ],
                },
              ];
            }
            return prev;
          });
          break;

        case "tool_result":
          // Update tool call status
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === "assistant" && lastMessage.toolCalls) {
              const toolCalls = lastMessage.toolCalls.map((tc) =>
                tc.name === response.tool_name
                  ? {
                      ...tc,
                      result: response.tool_result as Record<string, unknown>,
                      status: "completed" as const,
                    }
                  : tc,
              );
              return [...prev.slice(0, -1), { ...lastMessage, toolCalls }];
            }
            return prev;
          });
          break;

        case "confirmation_request":
          setPendingConfirmation({
            id: (response.metadata as Record<string, string>)?.confirmation_id,
            toolName: response.tool_name as string,
            description: response.content as string,
            status: "pending",
          });
          break;

        case "complete":
          if (responseTimeoutRef.current) {
            clearTimeout(responseTimeoutRef.current);
          }
          setIsLoading(false);
          break;

        case "error":
          if (responseTimeoutRef.current) {
            clearTimeout(responseTimeoutRef.current);
          }
          setMessages((prev) => [
            ...prev,
            {
              id: response.id as string,
              role: "assistant",
              content: `Error: ${response.content}`,
              timestamp: new Date(response.created_at as string),
            },
          ]);
          setIsLoading(false);
          break;
      }
    },
    [],
  );

  // Subscribe to agent responses
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel(`agent-responses-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_responses",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          handleAgentResponse(payload.new);
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, sessionId, handleAgentResponse]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    if (agentBackend === "server" && (!supabase || !user)) return;

    const messageContent = input.trim();
    setInput("");
    setIsLoading(true);

    // Clear any existing timeout
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
    }

    // Add user message to UI immediately
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    if (agentBackend === "api") {
      // Direct API mode
      try {
        const response = await callClaudeAPI(messageContent);
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content: response,
            timestamp: new Date(),
          },
        ]);
      } catch (error) {
        captureException(
          error instanceof Error ? error : new Error(String(error)),
          {
            context: "AIManager.sendMessage.api",
          },
        );
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content: `Error: ${error instanceof Error ? error.message : "Failed to get response"}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Server mode - use Supabase
    // Set timeout for server response
    responseTimeoutRef.current = setTimeout(() => {
      if (isLoading) {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content:
              "Response timeout. The server agent may be unavailable. Try switching to API mode or check the server status.",
            timestamp: new Date(),
          },
        ]);
        setIsLoading(false);
      }
    }, RESPONSE_TIMEOUT_MS);

    try {
      // Insert command into database
      const { error } = await supabase!.from("agent_commands").insert({
        session_id: sessionId,
        command_type: "chat",
        content: messageContent,
        user_id: user!.id,
        user_email: user!.primaryEmailAddress?.emailAddress,
      });

      if (error) throw error;
    } catch (error) {
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "AIManager.sendMessage",
        },
      );
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "Failed to send message. Please try again.",
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
    }
  };

  const handleConfirmation = async (approved: boolean) => {
    if (!pendingConfirmation || !supabase) return;

    try {
      await supabase
        .from("agent_confirmations")
        .update({
          status: approved ? "approved" : "rejected",
          responded_at: new Date().toISOString(),
        })
        .eq("id", pendingConfirmation.id);

      setPendingConfirmation(null);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "AIManager.handleConfirmation",
        },
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-10rem)]">
        {/* History Sidebar */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-card border-r border-border overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">Chat History</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startNewSession}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {chatSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">
                    No past conversations
                  </p>
                ) : (
                  chatSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => loadSession(session.id)}
                      className={`w-full text-left p-3 rounded-lg hover:bg-muted transition-colors ${
                        session.id === sessionId ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {session.title || "Untitled Chat"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span>{session.message_count} messages</span>
                        <span>·</span>
                        <span>
                          {new Date(
                            session.last_message_at,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="h-9 w-9 p-0"
              >
                <History className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  AI Manager
                </h1>
                <p className="text-sm text-muted-foreground">
                  {agentBackend === "server" ? "Server Agent" : "Direct API"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Backend Selector */}
              <div className="flex items-center bg-muted rounded-lg p-1">
                <button
                  onClick={() => setAgentBackend("server")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    agentBackend === "server"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Server className="w-4 h-4" />
                  Server
                </button>
                <button
                  onClick={() => setAgentBackend("api")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    agentBackend === "api"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  API
                </button>
              </div>

              {/* Settings Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="h-9 w-9 p-0"
              >
                <Settings className="w-5 h-5" />
              </Button>

              {/* Connection Status */}
              {agentBackend === "server" && (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                    isConnected
                      ? "bg-green-500/10 text-green-500"
                      : "bg-yellow-500/10 text-yellow-500"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isConnected
                        ? "bg-green-500"
                        : "bg-yellow-500 animate-pulse"
                    }`}
                  />
                  {isConnected ? "Connected" : "Connecting..."}
                </div>
              )}
              {agentBackend === "api" && (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                    apiKey
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      apiKey ? "bg-blue-500" : "bg-red-500"
                    }`}
                  />
                  {apiKey ? "API Ready" : "No API Key"}
                </div>
              )}
            </div>
          </div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-border bg-muted/30 overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Claude API Key
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={apiKey}
                        onChange={(e) => saveApiKey(e.target.value)}
                        placeholder="sk-ant-..."
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Required for Direct API mode. Your key is stored locally
                      in your browser.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-500">
                        Backend Modes:
                      </p>
                      <ul className="text-muted-foreground mt-1 space-y-1">
                        <li>
                          <strong>Server:</strong> Uses VPS/HomeServer agent
                          with file access, git, and tools
                        </li>
                        <li>
                          <strong>API:</strong> Direct Claude API calls - faster
                          but no tool access
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat Area */}
          <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Welcome to AI Manager
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    I can help you manage your site content, edit files, run git
                    commands, and trigger deployments. Just tell me what you
                    need!
                  </p>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <button
                      onClick={() => setInput("Show me the site stats")}
                      className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
                    >
                      Show me the site stats
                    </button>
                    <button
                      onClick={() => setInput("List my draft blog posts")}
                      className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
                    >
                      List my draft blog posts
                    </button>
                    <button
                      onClick={() =>
                        setInput("What files have changed in git?")
                      }
                      className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
                    >
                      What files have changed in git?
                    </button>
                    <button
                      onClick={() =>
                        setInput("Create a new blog post about TypeScript")
                      }
                      className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
                    >
                      Create a new blog post
                    </button>
                  </div>
                </div>
              ) : (
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>

                        {/* Tool Calls */}
                        {message.toolCalls && message.toolCalls.length > 0 && (
                          <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                            {message.toolCalls.map((tc, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-xs font-mono bg-background/50 rounded px-2 py-1"
                              >
                                <Terminal className="w-3 h-3" />
                                <span className="text-muted-foreground">
                                  {tc.name}
                                </span>
                                {tc.status === "running" && (
                                  <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
                                )}
                                {tc.status === "completed" && (
                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                )}
                                {tc.status === "failed" && (
                                  <XCircle className="w-3 h-3 text-red-500" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary-foreground" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Thinking...
                    </span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Confirmation Dialog */}
            <AnimatePresence>
              {pendingConfirmation && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="border-t border-border bg-yellow-500/5 p-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">
                        Confirmation Required
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pendingConfirmation.description}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleConfirmation(true)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConfirmation(false)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me to manage your site..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {agentBackend === "server"
                  ? "Press Enter to send. The agent can read/write files, manage content, and trigger deployments."
                  : "Press Enter to send. Direct API mode - no tool access, but faster responses."}
              </p>
            </div>
          </div>
        </div>
        {/* End of Main Chat Area */}
      </div>
    </AdminLayout>
  );
};

export default AIManager;
