import { useState, useRef, useEffect, useCallback } from "react";

interface HistoryEntry {
  id: number;
  command: string;
  output: string;
  timestamp: Date;
}

const WELCOME_MESSAGE = `MeJohnC.Org Terminal v1.0
Type "help" for available commands.\n`;

const COMMANDS: Record<string, (args: string[]) => string> = {
  help: () =>
    [
      "Available commands:",
      "  help          Show this help message",
      "  clear         Clear terminal output",
      "  date          Show current date/time",
      "  whoami        Show current user",
      "  uptime        Show session uptime",
      "  echo <text>   Echo text back",
      "  env           Show environment info",
      "  version       Show platform version",
      "  history       Show command history",
    ].join("\n"),
  date: () => new Date().toString(),
  whoami: () => "admin@mejohnc.org",
  version: () => "MeJohnC.Org Platform v3.0 (React 18 + Vite + Supabase)",
  env: () =>
    [
      `NODE_ENV=production`,
      `PLATFORM=desktop-os`,
      `TIMEZONE=${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
      `LOCALE=${navigator.language}`,
      `SCREEN=${window.innerWidth}x${window.innerHeight}`,
    ].join("\n"),
  echo: (args: string[]) => args.join(" "),
};

let entryIdCounter = 0;

export default function TerminalApp() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const startTime = useRef(Date.now());

  // Auto-scroll to bottom
  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [history]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const execute = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;

      setCommandHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);

      const parts = trimmed.split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      let output: string;

      if (command === "clear") {
        setHistory([]);
        return;
      } else if (command === "history") {
        output = commandHistory.map((c, i) => `  ${i + 1}  ${c}`).join("\n");
        if (!output) output = "No history yet.";
      } else if (command === "uptime") {
        const elapsed = Math.round((Date.now() - startTime.current) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        output = `Session uptime: ${mins}m ${secs}s`;
      } else if (COMMANDS[command]) {
        output = COMMANDS[command](args);
      } else {
        output = `bash: ${command}: command not found`;
      }

      setHistory((prev) => [
        ...prev,
        {
          id: ++entryIdCounter,
          command: trimmed,
          output,
          timestamp: new Date(),
        },
      ]);
    },
    [commandHistory],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      execute(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex =
          historyIndex === -1
            ? commandHistory.length - 1
            : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
    }
  };

  return (
    <div
      className="h-full flex flex-col bg-[#1a1b26] font-mono text-sm cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={outputRef} className="flex-1 overflow-y-auto p-3 space-y-1">
        <pre className="text-green-400 whitespace-pre-wrap">
          {WELCOME_MESSAGE}
        </pre>
        {history.map((entry) => (
          <div key={entry.id}>
            <div className="flex items-center gap-1">
              <span className="text-cyan-400">admin@mejohnc</span>
              <span className="text-gray-500">:</span>
              <span className="text-blue-400">~</span>
              <span className="text-gray-500">$</span>
              <span className="text-gray-200 ml-1">{entry.command}</span>
            </div>
            {entry.output && (
              <pre className="text-gray-300 whitespace-pre-wrap pl-0 mt-0.5">
                {entry.output}
              </pre>
            )}
          </div>
        ))}
        <div className="flex items-center gap-1">
          <span className="text-cyan-400">admin@mejohnc</span>
          <span className="text-gray-500">:</span>
          <span className="text-blue-400">~</span>
          <span className="text-gray-500">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 ml-1 bg-transparent text-gray-200 outline-none caret-green-400"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
