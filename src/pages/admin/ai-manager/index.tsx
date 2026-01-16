import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/components/AdminLayout';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import ReactMarkdown from 'react-markdown';

// Use crypto.randomUUID for generating UUIDs (supported in modern browsers)
const generateId = () => crypto.randomUUID();

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface Confirmation {
  id: string;
  toolName: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
}

const AIManager = () => {
  useSEO({ title: 'AI Manager', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const { user } = useAuth();

  const [sessionId] = useState(() => generateId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<Confirmation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle agent responses from real-time subscription
  const handleAgentResponse = useCallback((response: Record<string, unknown>) => {
    const responseType = response.response_type as string;

    switch (responseType) {
      case 'message':
        setMessages((prev) => [
          ...prev,
          {
            id: response.id as string,
            role: 'assistant',
            content: response.content as string,
            timestamp: new Date(response.created_at as string),
          },
        ]);
        break;

      case 'tool_use':
        // Update the last assistant message with tool call info
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant') {
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
                    status: 'running' as const,
                  },
                ],
              },
            ];
          }
          return prev;
        });
        break;

      case 'tool_result':
        // Update tool call status
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant' && lastMessage.toolCalls) {
            const toolCalls = lastMessage.toolCalls.map((tc) =>
              tc.name === response.tool_name
                ? { ...tc, result: response.tool_result as Record<string, unknown>, status: 'completed' as const }
                : tc
            );
            return [...prev.slice(0, -1), { ...lastMessage, toolCalls }];
          }
          return prev;
        });
        break;

      case 'confirmation_request':
        setPendingConfirmation({
          id: (response.metadata as Record<string, string>)?.confirmation_id,
          toolName: response.tool_name as string,
          description: response.content as string,
          status: 'pending',
        });
        break;

      case 'complete':
        setIsLoading(false);
        break;

      case 'error':
        setMessages((prev) => [
          ...prev,
          {
            id: response.id as string,
            role: 'assistant',
            content: `Error: ${response.content}`,
            timestamp: new Date(response.created_at as string),
          },
        ]);
        setIsLoading(false);
        break;
    }
  }, []);

  // Subscribe to agent responses
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel(`agent-responses-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_responses',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          handleAgentResponse(payload.new);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, sessionId, handleAgentResponse]);

  const sendMessage = async () => {
    if (!input.trim() || !supabase || !user || isLoading) return;

    const messageContent = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to UI immediately
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // Insert command into database
      const { error } = await supabase.from('agent_commands').insert({
        session_id: sessionId,
        command_type: 'chat',
        content: messageContent,
        user_id: user.id,
        user_email: user.primaryEmailAddress?.emailAddress,
      });

      if (error) throw error;
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AIManager.sendMessage',
      });
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: 'Failed to send message. Please try again.',
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
        .from('agent_confirmations')
        .update({
          status: approved ? 'approved' : 'rejected',
          responded_at: new Date().toISOString(),
        })
        .eq('id', pendingConfirmation.id);

      setPendingConfirmation(null);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AIManager.handleConfirmation',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-10rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Manager</h1>
            <p className="text-muted-foreground mt-1">
              Chat with Claude to manage your site
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                isConnected
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-yellow-500/10 text-yellow-500'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                }`}
              />
              {isConnected ? 'Connected' : 'Connecting...'}
            </div>
          </div>
        </div>

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
                  commands, and trigger deployments. Just tell me what you need!
                </p>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <button
                    onClick={() => setInput('Show me the site stats')}
                    className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
                  >
                    Show me the site stats
                  </button>
                  <button
                    onClick={() => setInput('List my draft blog posts')}
                    className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
                  >
                    List my draft blog posts
                  </button>
                  <button
                    onClick={() => setInput('What files have changed in git?')}
                    className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
                  >
                    What files have changed in git?
                  </button>
                  <button
                    onClick={() => setInput('Create a new blog post about TypeScript')}
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
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
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
                              {tc.status === 'running' && (
                                <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
                              )}
                              {tc.status === 'completed' && (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              )}
                              {tc.status === 'failed' && (
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
                    {message.role === 'user' && (
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
              <Button onClick={sendMessage} disabled={!input.trim() || isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send. The agent can read/write files, manage content,
              and trigger deployments.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AIManager;
