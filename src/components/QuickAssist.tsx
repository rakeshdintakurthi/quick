import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  FileText,
  Zap,
  Bug,
  BookOpen,
  Code2,
  MessageSquare,
  Search,
  ArrowRight,
} from 'lucide-react';
import type { AIRequest } from '../lib/aiService';

interface QuickAssistAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  requestType: AIRequest['requestType'];
  shortcut?: string;
  category: 'completion' | 'improvement' | 'documentation' | 'debug';
}

interface QuickAssistProps {
  isOpen: boolean;
  onClose: () => void;
  onActionSelect: (requestType: AIRequest['requestType']) => void;
}

const actions: QuickAssistAction[] = [
  {
    id: 'complete',
    label: 'Complete Code',
    description: 'Get AI-powered code completion',
    icon: <Sparkles className="w-5 h-5" />,
    requestType: 'completion',
    shortcut: 'Ctrl+Space',
    category: 'completion',
  },
  {
    id: 'optimize',
    label: 'Optimize Code',
    description: 'Improve performance and efficiency',
    icon: <Zap className="w-5 h-5" />,
    requestType: 'optimization',
    shortcut: 'Alt+O',
    category: 'improvement',
  },
  {
    id: 'debug',
    label: 'Debug Code',
    description: 'Find and fix bugs',
    icon: <Bug className="w-5 h-5" />,
    requestType: 'debug',
    shortcut: 'Alt+B',
    category: 'debug',
  },
  {
    id: 'docstring',
    label: 'Generate Documentation',
    description: 'Add comprehensive documentation',
    icon: <BookOpen className="w-5 h-5" />,
    requestType: 'docstring',
    shortcut: 'Alt+D',
    category: 'documentation',
  },
  {
    id: 'explain',
    label: 'Explain Code',
    description: 'Get detailed explanation of selected code',
    icon: <FileText className="w-5 h-5" />,
    requestType: 'explain' as AIRequest['requestType'],
    category: 'documentation',
  },
  {
    id: 'refactor',
    label: 'Refactor Code',
    description: 'Improve code structure and readability',
    icon: <Code2 className="w-5 h-5" />,
    requestType: 'refactor' as AIRequest['requestType'],
    category: 'improvement',
  },
  {
    id: 'comments',
    label: 'Add Comments',
    description: 'Generate inline comments for clarity',
    icon: <MessageSquare className="w-5 h-5" />,
    requestType: 'comments' as AIRequest['requestType'],
    category: 'documentation',
  },
];

export default function QuickAssist({ isOpen, onClose, onActionSelect }: QuickAssistProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredActions = actions.filter(
    (action) =>
      action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedIndex >= filteredActions.length) {
      setSelectedIndex(Math.max(0, filteredActions.length - 1));
    }
  }, [filteredActions.length, selectedIndex]);

  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredActions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          handleActionSelect(filteredActions[selectedIndex]);
        }
        break;
    }
  }

  function handleActionSelect(action: QuickAssistAction) {
    onActionSelect(action.requestType);
    onClose();
    setSearchQuery('');
    setSelectedIndex(0);
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Quick Assist Panel */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl">
        <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 bg-slate-750">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search for AI assistance..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-lg"
            />
            <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600 text-xs text-slate-400">
              Esc
            </kbd>
          </div>

          {/* Actions List */}
          <div
            ref={listRef}
            className="max-h-96 overflow-y-auto"
            onKeyDown={handleKeyDown}
          >
            {filteredActions.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400">
                No actions found matching "{searchQuery}"
              </div>
            ) : (
              <div className="py-2">
                {filteredActions.map((action, index) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionSelect(action)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-blue-500/20 border-l-4 border-blue-500'
                        : 'hover:bg-slate-700/50 border-l-4 border-transparent'
                    }`}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div
                      className={`flex-shrink-0 ${
                        index === selectedIndex ? 'text-blue-400' : 'text-slate-400'
                      }`}
                    >
                      {action.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            index === selectedIndex ? 'text-white' : 'text-slate-200'
                          }`}
                        >
                          {action.label}
                        </span>
                        {action.shortcut && (
                          <kbd className="px-1.5 py-0.5 bg-slate-700 rounded border border-slate-600 text-xs text-slate-400">
                            {action.shortcut}
                          </kbd>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5 truncate">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight
                      className={`w-4 h-4 flex-shrink-0 ${
                        index === selectedIndex ? 'text-blue-400' : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-700 bg-slate-750 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-700 rounded border border-slate-600">
                  ↑↓
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-700 rounded border border-slate-600">
                  Enter
                </kbd>
                Select
              </span>
            </div>
            <span>{filteredActions.length} action{filteredActions.length !== 1 ? 's' : ''} available</span>
          </div>
        </div>
      </div>
    </>
  );
}

