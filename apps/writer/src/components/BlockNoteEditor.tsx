"use client";

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Block, BlockNoteEditor, PartialBlock, BlockNoteSchema, defaultInlineContentSpecs, defaultStyleSpecs, filterSuggestionItems, InlineContentSchema, StyleSchema, createStyleSpec } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
  FormattingToolbar,
  FormattingToolbarController,
} from "@blocknote/react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  CopyButton,
  Divider,
  Group,
  Loader,
  Menu,
  Modal,
  Overlay,
  Paper,
  Progress,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Tooltip,
  useComputedColorScheme,
} from "@mantine/core";
import { useClickOutside, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useTextFormattingShortcuts } from "@/hooks/useTextFormattingShortcuts";
import { useEditorShortcuts } from "@/hooks/useEditorShortcuts";
import { useAdvancedShortcuts } from "@/hooks/useAdvancedShortcuts";
import { useDraftShortcuts } from "@/hooks/useDraftShortcuts";
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconAutomation,
  IconBulb,
  IconCheck,
  IconCopy,
  IconEdit,
  IconFileText,
  IconInfoCircle,
  IconList,
  IconWand,
  IconMapPin,
  IconMath,
  IconPencil,
  IconPencilPlus,
  IconRefresh,
  IconRobot,
  IconSparkles,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { generateText } from "ai";
import "katex/dist/katex.min.css";
import React, { forwardRef, useCallback, useEffect, useImperativeHandle } from "react";
// import Katex from "react-katex";
const LaTeXModal = React.lazy(() => import("./LaTeXModal"));
const SearchModal = React.lazy(() => import("./SearchModal"));
const GoToLineModal = React.lazy(() => import("./GoToLineModal"));

// Types
interface JudulInfo {
  text: string;
  level: number;
  position: number;
  block: Block;
}

interface CursorContext {
  targetJudul: JudulInfo | null;
  judulContent: string;
  insertPosition: number;
  isAtJudul: boolean;
  contextType: 'judul' | 'under_judul' | 'paragraph' | 'list' | 'general';
  currentText: string;
  precedingContext: string;
}

// Enhanced AI Progress State
interface AIProgressState {
  isLoading: boolean;
  progress: number;
  stage: string;
  estimatedTime: number;
  startTime: number;
}

// Type for saving precise cursor position
interface SavedCursorPosition {
  blockId: string;
  offset: number;
}

// Enhanced interfaces
interface BlockNoteEditorRef {
  getContent: () => Block[];
  getEditor: () => BlockNoteEditor;
  setContent: (content: Block[]) => void;
  insertCitation: (citationText: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  openLatexModal: () => void;
}

//article interface
interface Article {
  id: string;
  title: string;
  att_background: string;
  att_url: string;
}

interface BlockNoteEditorProps {
  onContentChange?: (content: Block[]) => void;
  style?: React.CSSProperties;
  mcpContext?: {
    sessionId: string;
    contextNodeIds: string[];
    contextEdgeIds: string[];
    nodeId: string | null;
    nodeIds: string[];
    mode: "general" | "single node" | "multiple node";
  } | null;
  writerSession?: any;
  projectId?: string;
  isFromBrainstorming?: boolean;
  nodesData?: Article[];
  onLogFormula?: (formula: string, result: string) => void;
  onLogEdit?: (title: string, oldValue?: string, newValue?: string, wordCount?: number) => void;
}

interface ContinueWritingState {
  isVisible: boolean;
  position: { x: number; y: number };
  currentBlock: Block | null;
  contextText: string;
}

interface InlineAIState {
  isVisible: boolean;
  position: { x: number; y: number };
  currentBlock: Block | null;
  query: string;
}

// Enhanced AI Streaming State with progress
interface AIStreamingState {
  isStreaming: boolean;
  streamedText: string;
  currentBlock: Block | null;
  originalText: string;
  showControls: boolean;
  position: { x: number; y: number };
  progress: number;
  totalChunks: number;
  currentChunk: number;
}

// Undo/Redo State
interface UndoRedoState {
  history: Block[][];
  currentIndex: number;
  maxHistorySize: number;
}

// AI Activity Log
interface AIActivityLog {
  id: string;
  timestamp: Date;
  type: 'structure' | 'content' | 'sentence';
  prompt: string;
  action: string;
  success: boolean;
  duration: number;
}

// Revision Indicators State
interface RevisionIndicator {
  blockId: string;
  type: 'needs-review' | 'ai-generated' | 'modified' | 'suggested';
  color: string;
  timestamp: Date;
  reason?: string;
}

// Template interfaces - Fixed to include all required properties
interface AITemplate {
  title: string;
  description: string;
  type: string;
  color: string;
  icon: React.ForwardRefExoticComponent<any>;
  defaultPrompt: string;
  behavior: string;
}

interface AIAutoTemplate {
  title: string;
  description: string;
  type: string;
  color: string;
  icon: React.ForwardRefExoticComponent<any>;
  behavior: string;
}

// Enhanced CSS Animations with progress animations
const animationStyles = `
  @keyframes sparkle-pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.05);
    }
  }

  @keyframes sparkle-rotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes sparkle-glow {
    0%, 100% {
      box-shadow: 0 0 8px rgba(59, 130, 246, 0.3), 0 0 16px rgba(59, 130, 246, 0.2);
    }
    50% {
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.5), 0 0 24px rgba(59, 130, 246, 0.3);
    }
  }

  @keyframes sparkle-float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-2px);
    }
  }

  @keyframes typing-cursor {
    0%, 50% {
      opacity: 1;
    }
    51%, 100% {
      opacity: 0;
    }
  }

  @keyframes fade-in {
    0% {
      opacity: 0;
      transform: translateY(10px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slide-up {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes progress-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  .continue-button {
    animation: sparkle-pulse 2s ease-in-out infinite, 
               sparkle-glow 2s ease-in-out infinite,
               sparkle-float 3s ease-in-out infinite;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .continue-button:hover {
    animation: sparkle-pulse 1s ease-in-out infinite, 
               sparkle-glow 1s ease-in-out infinite,
               sparkle-float 1.5s ease-in-out infinite;
    transform: scale(1.1) !important;
  }

  .continue-button .icon-sparkle {
    animation: sparkle-rotate 4s linear infinite;
  }

  .continue-button:hover .icon-sparkle {
    animation: sparkle-rotate 2s linear infinite;
  }

  .continue-button-wrapper {
    position: relative;
  }

  .continue-button-wrapper::before {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    background: linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(147, 197, 253, 0.2));
    border-radius: 50%;
    opacity: 0;
    animation: sparkle-pulse 2s ease-in-out infinite;
    z-index: -1;
  }

  .continue-button:hover::before {
    opacity: 1;
  }

  .ai-streaming-text {
    position: relative;
  }

  .ai-streaming-text::after {
    content: '';
    display: inline-block;
    width: 2px;
    height: 1.2em;
    background-color: #3b82f6;
    margin-left: 2px;
    animation: typing-cursor 1s infinite;
    vertical-align: text-bottom;
  }

  .ai-streaming-controls {
    animation: slide-up 0.3s ease-out;
  }

  .ai-streaming-overlay {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 197, 253, 0.1));
    border: 2px solid rgba(59, 130, 246, 0.3);
    border-radius: 8px;
    padding: 4px;
    animation: fade-in 0.3s ease-out;
  }

  /* Revision Indicators Styles */
  .revision-indicator {
    position: relative;
    padding-left: 16px;
    border-radius: 8px;
    transition: all 0.3s ease;
    margin: 4px 0;
  }

  .revision-indicator::before {
    content: '';
    position: absolute;
    left: -8px;
    top: 0;
    bottom: 0;
    width: 4px;
    border-radius: 2px;
    animation: revision-pulse 2s ease-in-out infinite;
  }

  .revision-indicator.needs-review::before {
    background: linear-gradient(180deg, #ff6b6b 0%, #ff5252 100%);
    box-shadow: 0 0 10px rgba(255, 107, 107, 0.5);
  }

  .revision-indicator.ai-generated::before {
    background: linear-gradient(180deg, #4ecdc4 0%, #26a69a 100%);
    box-shadow: 0 0 10px rgba(78, 205, 196, 0.5);
  }

  .revision-indicator.modified::before {
    background: linear-gradient(180deg, #45b7d1 0%, #2196f3 100%);
    box-shadow: 0 0 10px rgba(69, 183, 209, 0.5);
  }

  .revision-indicator.suggested::before {
    background: linear-gradient(180deg, #96ceb4 0%, #4caf50 100%);
    box-shadow: 0 0 10px rgba(150, 206, 180, 0.5);
  }

  .revision-indicator:hover {
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateX(4px);
  }

  @keyframes revision-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Enhanced persistent revision indicators */
  .persistent-indicator {
    position: relative !important;
    padding-left: 16px !important;
    border-left: 4px solid #ff6b6b !important;
    box-shadow: inset 4px 0 0 rgba(255, 107, 107, 0.25) !important;
    background-color: rgba(255, 107, 107, 0.05) !important;
    border-radius: 8px !important;
    transition: all 0.3s ease !important;
  }

  .persistent-bar {
    position: absolute !important;
    left: -12px !important;
    top: 0 !important;
    bottom: 0 !important;
    width: 6px !important;
    height: 100% !important;
    background: linear-gradient(180deg, #ff6b6b 0%, #ff5252 100%) !important;
    border-radius: 3px !important;
    box-shadow: 0 0 15px rgba(255, 107, 107, 0.5) !important;
    z-index: 9999 !important;
    animation: revision-pulse 2s ease-in-out infinite !important;
    pointer-events: none !important;
    opacity: 1 !important;
  }

  .persistent-indicator:hover {
    background-color: rgba(255, 107, 107, 0.1) !important;
    box-shadow: inset 4px 0 0 rgba(255, 107, 107, 0.4), 0 4px 12px rgba(255, 107, 107, 0.2) !important;
    transform: translateX(2px) !important;
  }

  .ai-progress-container {
    animation: progress-pulse 2s infinite;
  }

  /* Simple Citation Styling - Manual approach */
  .bn-citation {
    color: blue !important;
    font-weight: bold !important;
    border: 1px solid rgba(37, 99, 235, 0.2) !important;
    transition: all 0.2s ease !important;
    display: inline-block !important;
    font-size: 0.9em !important;
  }

  .bn-citation:hover {
    color: blue !important;
    font-weight: bold !important;
  }

  /* Citation styling */
  .citation-highlight {
    color: blue !important;
    font-weight: bold !important;
    border: 1px solid rgba(37, 99, 235, 0.2) !important;
  }
`;


// Main component
const BlockNoteEditorComponent = forwardRef<BlockNoteEditorRef, BlockNoteEditorProps>(
  function BlockNoteEditorComponent(
    { onContentChange, style, onLogFormula, onLogEdit, mcpContext, writerSession, projectId, isFromBrainstorming, nodesData }: BlockNoteEditorProps,
    ref
  ) {
    const computedColorScheme = useComputedColorScheme("light");
    const [deleteConfirmationOpened, { open: openDeleteConfirmation, close: closeDeleteConfirmation }] = useDisclosure(false);

    // Add CSS animations to head
    React.useEffect(() => {
      const existingStyle = document.getElementById('blocknote-animations');
      if (!existingStyle) {
        const styleElement = document.createElement('style');
        styleElement.id = 'blocknote-animations';
        styleElement.textContent = animationStyles;
        document.head.appendChild(styleElement);
      }

      return () => {
        // Cleanup on unmount
        const styleElement = document.getElementById('blocknote-animations');
        if (styleElement) {
          styleElement.remove();
        }
      };
    }, []);

    // Citation styling - Disabled to prevent cursor issues from innerHTML modification
    React.useEffect(() => {
      // Keeping this disabled permanently as it was causing cursor position problems
      // Citation styling is now handled through CSS only
      return () => {};
    }, []);

    // Enhanced Core states with progress
    const [aiProgressState, setAIProgressState] = React.useState<AIProgressState>({
      isLoading: false,
      progress: 0,
      stage: "",
      estimatedTime: 0,
      startTime: 0,
    });
    const [aiModalOpened, { open: openAIModal, close: closeAIModal }] = useDisclosure(false);
    const [prompt, setPrompt] = React.useState("");
    const [generatedContent, setGeneratedContent] = React.useState("");
    const [aiMode, setAIMode] = React.useState<"new" | "continue" | "auto">("new");
    const [isAutoContinuing, setIsAutoContinuing] = React.useState(false);
    const [currentAIType, setCurrentAIType] = React.useState<string>("structure");
    const [savedCursorPosition, setSavedCursorPosition] = React.useState<SavedCursorPosition | null>(null);

    // Undo/Redo State
    const [undoRedoState, setUndoRedoState] = React.useState<UndoRedoState>({
      history: [],
      currentIndex: -1,
      maxHistorySize: 50,
    });

    // AI Activity Log State
    const [aiActivityLog, setAIActivityLog] = React.useState<AIActivityLog[]>([]);

    // Function to log AI activities
    const logAIActivity = useCallback((
      type: 'structure' | 'content' | 'sentence',
      prompt: string,
      action: string,
      success: boolean,
      duration: number
    ) => {
      const newLog: AIActivityLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        type,
        prompt: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
        action,
        success,
        duration
      };

      setAIActivityLog(prev => {
        const updated = [newLog, ...prev];
        // Keep only last 20 activities
        return updated.slice(0, 20);
      });
    }, []);

    // Continue writing state
    const [continueState, setContinueState] = React.useState<ContinueWritingState>({
      isVisible: false,
      position: { x: 0, y: 0 },
      currentBlock: null,
      contextText: ""
    });
    const continueRef = useClickOutside(() => setContinueState(prev => ({ ...prev, isVisible: false })));

    // Inline AI state
    const [inlineAIState, setInlineAIState] = React.useState<InlineAIState>({
      isVisible: false,
      position: { x: 0, y: 0 },
      currentBlock: null,
      query: "",
    });
    const inlineAIRef = useClickOutside(() => setInlineAIState(prev => ({ ...prev, isVisible: false })));

    const callMCPAPI = async (systemPrompt: string, maxTokens: number = 2000): Promise<string | null> => {
    try {
      // Check if mcpContext is null
      if (!mcpContext) {
        throw new Error('MCP context is not available');
      }

      const payload = {
        sessionId: mcpContext.sessionId || null,
        question: systemPrompt,
        contextNodeIds: mcpContext.contextNodeIds,
        contextEdgeIds: mcpContext.contextEdgeIds,
        forceWeb: false,
        mode: mcpContext.mode,
        ...(mcpContext.nodeId && { nodeId: mcpContext.nodeId }),
        ...(mcpContext.nodeIds.length > 0 && { nodeIds: mcpContext.nodeIds })
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('MCP Response:', data);

      if (data.content) {
        let cleanContent = data.content;
        
        // Remove metadata that starts with ' additional_kwargs='
        const metadataStart = cleanContent.indexOf(' additional_kwargs=');
        if (metadataStart !== -1) {
          cleanContent = cleanContent.substring(0, metadataStart);
        }
        
        // Remove reference codes like [G-7475] [G-b171] etc at the end
        cleanContent = cleanContent.replace(/\s*\[G-[^\]]+\](\s*\[G-[^\]]+\])*\s*\[\d+\](\s*\[\d+\])*\s*$/, '');
        
        // Remove any trailing whitespace or newlines
        cleanContent = cleanContent.trim();
        
        return cleanContent;
      }
      
      if (data.result?.content?.[0]?.text) {
        try {
          // Parse the JSON string from the text field
          const parsedContent = JSON.parse(data.result.content[0].text);
          if (parsedContent.success && parsedContent.response) {
            return parsedContent.response;
          } else if (parsedContent.response) {
            return parsedContent.response;
          } else {
            return parsedContent.text || parsedContent.content || '';
          }
        } catch (parseError) {
          // If parsing fails, return the text directly
          return data.result.content[0].text;
        }
      }
      // Handle different response formats from MCP
      // if (data.success && data.data) {
      //   // Extract text from MCP response - adjust based on actual response format
      //   return data.data.content || data.data.text || data.data.message || '';
      // } else if (data.text) {
      //   return data.text;
      // } else if (data.content) {
      //   return data.content;
      // } else {
      //   throw new Error(data.error || 'Invalid response format from MCP');
      // }
      if (data.answer) {
        return data.answer;
      } else if (data.text) {
        return data.text;
      } else if (data.success && data.data) {
        return data.data.content || data.data.text || data.data.message || '';
      } else {
        console.error('Unexpected response format:', data);
        throw new Error(data.error?.message || 'Invalid response format from MCP');
      }
    } catch (error) {
      console.error('MCP API call failed:', error);
      throw error;
    }
  };

  function removeDaftarPustakaSection(text: string): string {

    // Remove everything from "## Daftar Pustaka" or "### Daftar Pustaka" to the end

        return text.replace(/(#+\s*Daftar Pustaka[\s\S]*)$/i, '').trim();

    }

    // LaTeX Modal state
    const [isLatexModalOpen, setIsLatexModalOpen] = React.useState(false);
    const [isAIToolsExpanded, setIsAIToolsExpanded] = React.useState(false);
    const [searchModalOpened, { open: openSearchModal, close: closeSearchModal }] = useDisclosure(false);
    const [goToLineModalOpened, { open: openGoToLineModal, close: closeGoToLineModal }] = useDisclosure(false);
    const [searchMode, setSearchMode] = React.useState<'search' | 'replace'>('search');

    // Enhanced AI Streaming state with progress
    const [aiStreamingState, setAIStreamingState] = React.useState<AIStreamingState>({
      isStreaming: false,
      streamedText: "",
      currentBlock: null,
      originalText: "",
      showControls: false,
      position: { x: 0, y: 0 },
      progress: 0,
      totalChunks: 0,
      currentChunk: 0,
    });
    
    // Revision Indicators State
    const [revisionIndicators, setRevisionIndicators] = React.useState<RevisionIndicator[]>([]);
    
    const streamingControlsRef = useClickOutside(() => {
      if (aiStreamingState.showControls && !aiStreamingState.isStreaming) {
        setAIStreamingState(prev => ({ ...prev, showControls: false }));
      }
    });

    // AI Model setup
    const aiModel = React.useMemo(() => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;

        console.log("🔑 AI Model Setup Debug:");
        console.log("NEXT_PUBLIC_GOOGLE_API_KEY:", process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? "Available" : "Missing");
        console.log("GOOGLE_API_KEY:", process.env.GOOGLE_API_KEY ? "Available" : "Missing");
        console.log("Final API Key:", apiKey ? "Available" : "Missing");

        if (!apiKey) {
          console.warn("GOOGLE_API_KEY not found. AI features will be disabled.");
          return null;
        }

        const google = createGoogleGenerativeAI({
          apiKey: apiKey,
        });

        // Use Gemini Pro for reliable responses
        const model = google("gemini-pro");
        console.log("✅ AI Model initialized successfully with: gemini-pro");

        return model;
      } catch (error) {
        console.error("❌ Error initializing AI model:", error);
        return null;
      }
    }, []);

    // Revision Indicators Helper Functions
    const addRevisionIndicator = React.useCallback((blockId: string, type: RevisionIndicator['type'], reason?: string) => {
      const colors = {
        'needs-review': '#ff6b6b', // Red for needs review
        'ai-generated': '#4ecdc4', // Teal for AI generated
        'modified': '#45b7d1', // Blue for modified
        'suggested': '#96ceb4' // Green for suggested
      };
      
      console.log(`📝 Adding revision indicator: ${type} for block ${blockId}`, { reason });
      
      setRevisionIndicators(prev => {
        const newIndicators = [
          ...prev.filter(indicator => indicator.blockId !== blockId),
          {
            blockId,
            type,
            color: colors[type],
            timestamp: new Date(),
            reason
          }
        ];
        
        console.log('📊 Current revision indicators:', newIndicators);
        return newIndicators;
      });
    }, []);

    const removeRevisionIndicator = React.useCallback((blockId: string) => {
      setRevisionIndicators(prev => prev.filter(indicator => indicator.blockId !== blockId));
    }, []);

    const getBlockIndicator = React.useCallback((blockId: string) => {
      return revisionIndicators.find(indicator => indicator.blockId === blockId);
    }, [revisionIndicators]);

    // Clear all revision indicators
    const clearAllRevisionIndicators = React.useCallback(() => {
      setRevisionIndicators([]);
    }, []);

    // Mark block as reviewed (remove needs-review indicator)
    const markAsReviewed = React.useCallback((blockId: string) => {
      setRevisionIndicators(prev => 
        prev.filter(indicator => 
          !(indicator.blockId === blockId && indicator.type === 'needs-review')
        )
      );
    }, []);

    // BlockNote Editor setup with history tracking
    // Create schema with default styles only
    const schema = BlockNoteSchema.create({
      styleSpecs: {
        ...defaultStyleSpecs,
      },
    });

    const editor = useCreateBlockNote({
      schema,
      initialContent: [
        {
          type: "paragraph",
          content: "",
        },
      ],
      uploadFile: async (file: File) => {
        const body = new FormData();
        body.append("file", file);

        try {
          const response = await fetch("/api/upload", {
            method: "POST",
            body: body,
          });
          const json = await response.json();
          return json.url;
        } catch (error) {
          console.error("Upload failed:", error);
          return "";
        }
      },
    });

    // Text formatting shortcuts integration - COMPLETELY DISABLED FOR TESTING
    useTextFormattingShortcuts({
      onBold: () => {},
      onItalic: () => {},
      onUnderline: () => {},
      onStrikethrough: () => {},
      onCode: () => {},
      onHeading: (level: number) => {},
      onBulletList: () => {},
      onNumberedList: () => {},
      onQuote: () => {},
      onLink: () => {},
      enabled: false, // COMPLETELY DISABLED
    });

    // Editor shortcuts integration - COMPLETELY DISABLED FOR TESTING
    useEditorShortcuts({
      onSearch: () => {},
      onGoToLine: () => {},
      onGoToStart: () => {},
      onGoToEnd: () => {},
      onDuplicateLine: () => {},
      onDeleteLine: () => {},
      onGenerateAI: () => {},
      enabled: false, // COMPLETELY DISABLED
    });

    // Advanced shortcuts integration - COMPLETELY DISABLED FOR TESTING
    useAdvancedShortcuts({
      onFindReplace: () => {
        setSearchMode('replace');
        openSearchModal();
      },
      onInsertCitation: () => {
        // Insert citation with proper academic format
        try {
          const currentYear = new Date().getFullYear();
          const citationBlock: PartialBlock = {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "[Nama Penulis, ",
                styles: { italic: true }
              },
              {
                type: "text",
                text: currentYear.toString(),
                styles: { italic: true }
              },
              {
                type: "text",
                text: ", \"Judul Karya\", Penerbit]",
                styles: { italic: true }
              }
            ]
          };

          editor.insertBlocks([citationBlock], editor.getTextCursorPosition().block, "after");

          notifications.show({
            message: '📚 Template kutipan akademik berhasil disisipkan',
            color: 'green',
            autoClose: 3000,
          });
        } catch (error) {
          console.error('Error inserting citation:', error);
          notifications.show({
            message: 'Gagal menyisipkan kutipan',
            color: 'red',
            autoClose: 3000,
          });
        }
      },
      onInsertFormula: () => {
        openLatexModal();
      },
      onGenerateAI: () => {
        openAIModal();
      },
      onAnalyzeReferences: () => {
        // Analyze references in the document
        try {
          const blocks = editor.document;
          let citationCount = 0;
          let urls: string[] = [];
          let citations: string[] = [];

          blocks.forEach(block => {
            if (block.content && Array.isArray(block.content)) {
              block.content.forEach((contentItem: any) => {
                if (contentItem.type === 'text' && contentItem.text) {
                  const text = contentItem.text.toString();

                  // Count citations (text in brackets or footnotes)
                  const citationMatches = text.match(/\[.*?\]|\(.*?\d{4}.*?\)/g);
                  if (citationMatches) {
                    citationCount += citationMatches.length;
                    citations.push(...citationMatches);
                  }

                  // Find URLs
                  const urlMatches = text.match(/https?:\/\/[^\s]+/g);
                  if (urlMatches) {
                    urls.push(...urlMatches);
                  }
                }
              });
            }
          });

          const analysis = [
            `📚 Kutipan ditemukan: ${citationCount}`,
            `🔗 Link eksternal: ${urls.length}`,
            `📊 Total referensi: ${citationCount + urls.length}`
          ];

          if (citations.length > 0) {
            analysis.push(`\nContoh kutipan:\n${citations.slice(0, 3).join('\n')}`);
          }

          notifications.show({
            title: 'Analisis Referensi',
            message: analysis.join('\n'),
            color: 'blue',
            autoClose: 8000,
          });
        } catch (error) {
          console.error('Error analyzing references:', error);
          notifications.show({
            message: 'Gagal menganalisis referensi',
            color: 'red',
            autoClose: 3000,
          });
        }
      },
      onInsertTable: () => {
        // Insert simple table using BlockNote's built-in table support
        try {
          // Create a simple 2x2 table structure that BlockNote can handle
          const tableBlocks: PartialBlock[] = [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Kolom 1", styles: { bold: true } }]
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "Kolom 2", styles: { bold: true } }]
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "Data 1", styles: {} }]
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "Data 2", styles: {} }]
            }
          ];

          editor.insertBlocks(tableBlocks, editor.getTextCursorPosition().block, "after");

          notifications.show({
            message: 'Struktur tabel berhasil disisipkan',
            color: 'green',
            autoClose: 2000,
          });
        } catch (error) {
          console.error('Error inserting table:', error);
          notifications.show({
            message: 'Gagal menyisipkan tabel',
            color: 'red',
            autoClose: 3000,
          });
        }
      },
      onInsertImage: () => {
        // Insert image placeholder that actually works with BlockNote
        try {
          // Create a paragraph with image placeholder text and file input trigger
          const imageBlock: PartialBlock = {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "📷 [Gambar]",
                styles: {
                  backgroundColor: "blue",
                  textColor: "white"
                }
              },
              { type: "text", text: " - Klik untuk upload gambar atau drag & drop file ke sini", styles: {} }
            ]
          };

          editor.insertBlocks([imageBlock], editor.getTextCursorPosition().block, "after");

          notifications.show({
            message: 'Placeholder gambar disisipkan. Upload gambar dengan drag & drop',
            color: 'green',
            autoClose: 3000,
          });
        } catch (error) {
          console.error('Error inserting image:', error);
          notifications.show({
            message: 'Gagal menyisipkan placeholder gambar',
            color: 'red',
            autoClose: 3000,
          });
        }
      },
      onInsertCode: () => {
        // Insert code block with proper BlockNote structure
        try {
          // First try the standard codeBlock type
          editor.insertBlocks([{
            type: "codeBlock",
            props: {
              language: "javascript"
            },
            content: "// Masukkan kode di sini\nconsole.log('Hello World!');"
          }], editor.getTextCursorPosition().block, "after");

          notifications.show({
            message: 'Blok kode JavaScript berhasil disisipkan',
            color: 'green',
            autoClose: 2000,
          });
        } catch (error) {
          // Fallback: create a paragraph with monospace styling if codeBlock doesn't work
          try {
            const codeBlock: PartialBlock = {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "// Masukkan kode di sini\nconsole.log('Hello World!');",
                  styles: {
                    code: true
                  }
                }
              ]
            };

            editor.insertBlocks([codeBlock], editor.getTextCursorPosition().block, "after");

            notifications.show({
              message: 'Blok kode berhasil disisipkan (format alternatif)',
              color: 'green',
              autoClose: 2000,
            });
          } catch (fallbackError) {
            console.error('Error inserting code block:', error, fallbackError);
            notifications.show({
              message: 'Gagal menyisipkan blok kode',
              color: 'red',
              autoClose: 3000,
            });
          }
        }
      },
      onInsertQuote: () => {
        // Insert quote block with proper styling
        try {
          // Create a new quote block after current position
          const quoteBlock: PartialBlock = {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "💬 Masukkan kutipan di sini...",
                styles: {
                  italic: true,
                  textColor: "gray"
                }
              }
            ],
            props: {
              backgroundColor: "gray"
            }
          };

          editor.insertBlocks([quoteBlock], editor.getTextCursorPosition().block, "after");

          notifications.show({
            message: 'Blok kutipan berhasil disisipkan',
            color: 'green',
            autoClose: 2000,
          });
        } catch (error) {
          // Fallback: just create italic text
          try {
            const simpleQuote : PartialBlock = {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: '"Masukkan kutipan di sini..."',
                  styles: {
                    italic: true
                  }
                }
              ]
            };

            editor.insertBlocks([simpleQuote], editor.getTextCursorPosition().block, "after");

            notifications.show({
              message: 'Kutipan berhasil disisipkan',
              color: 'green',
              autoClose: 2000,
            });
          } catch (fallbackError) {
            console.error('Error inserting quote:', error, fallbackError);
            notifications.show({
              message: 'Gagal menyisipkan blok kutipan',
              color: 'red',
              autoClose: 3000,
            });
          }
        }
      },
      onWordCount: () => {
        // Show accurate word count
        try {
          let totalWords = 0;
          let totalChars = 0;
          let totalBlocks = 0;

          const blocks = editor.document;

          blocks.forEach(block => {
            totalBlocks++;

            if (block.content && Array.isArray(block.content)) {
              block.content.forEach((contentItem: any) => {
                if (contentItem.type === 'text' && contentItem.text) {
                  const text = contentItem.text.toString();
                  totalChars += text.length;

                  // Count words (split by whitespace and filter non-empty)
                  const words = text.split(/\s+/).filter((word: string) => word.trim().length > 0);
                  totalWords += words.length;
                }
              });
            }
          });

          // Create detailed word count modal-like notification
          const stats = [
            `📝 Kata: ${totalWords}`,
            `🔤 Karakter: ${totalChars}`,
            `📄 Blok: ${totalBlocks}`,
            `⏱️ Est. baca: ${Math.ceil(totalWords / 200)} menit`
          ].join(' • ');

          notifications.show({
            title: 'Statistik Dokumen',
            message: stats,
            color: 'blue',
            autoClose: 8000,
          });
        } catch (error) {
          console.error('Error counting words:', error);
          notifications.show({
            message: 'Gagal menghitung kata',
            color: 'red',
            autoClose: 3000,
          });
        }
      },
      onExportDraft: () => {
        // Export as text/markdown format (working implementation)
        try {
          let exportContent = '';
          const blocks = editor.document;

          blocks.forEach((block, index) => {
            if (block.content && Array.isArray(block.content)) {
              block.content.forEach((contentItem: any) => {
                if (contentItem.type === 'text' && contentItem.text) {
                  let text = contentItem.text.toString();

                  // Apply basic formatting
                  if (contentItem.styles) {
                    if (contentItem.styles.bold) text = `**${text}**`;
                    if (contentItem.styles.italic) text = `*${text}*`;
                    if (contentItem.styles.code) text = `\`${text}\``;
                  }

                  exportContent += text;
                }
              });
            }

            // Add line break between blocks
            if (index < blocks.length - 1) {
              exportContent += '\n\n';
            }
          });

          // Create and download file
          const blob = new Blob([exportContent], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `draft-${new Date().toISOString().split('T')[0]}.md`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          notifications.show({
            message: 'Draft berhasil diekspor sebagai file Markdown',
            color: 'green',
            autoClose: 3000,
          });
        } catch (error) {
          console.error('Error exporting draft:', error);
          notifications.show({
            message: 'Gagal mengekspor draft',
            color: 'red',
            autoClose: 3000,
          });
        }
      },
      onToggleFullscreen: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen();
          notifications.show({
            message: 'Keluar dari mode layar penuh',
            color: 'blue',
            autoClose: 2000,
          });
        } else {
          document.documentElement.requestFullscreen();
          notifications.show({
            message: 'Mode layar penuh diaktifkan',
            color: 'blue',
            autoClose: 2000,
          });
        }
      },
      onOpenDraftList: () => {
        // Quick draft list simulation - show available drafts in localStorage
        try {
          const savedDrafts = [];

          // Check localStorage for saved drafts
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('draft-')) {
              savedDrafts.push({
                key,
                name: key.replace('draft-', '').replace(/-/g, ' '),
                date: new Date(localStorage.getItem(key + '-date') || Date.now()).toLocaleDateString('id-ID')
              });
            }
          }

          if (savedDrafts.length > 0) {
            const draftList = savedDrafts
              .slice(0, 5) // Show max 5 recent drafts
              .map(draft => `📄 ${draft.name} (${draft.date})`)
              .join('\n');

            notifications.show({
              title: 'Draft Tersimpan (5 Terbaru)',
              message: draftList,
              color: 'blue',
              autoClose: 8000,
            });
          } else {
            notifications.show({
              message: '📝 Belum ada draft tersimpan. Tekan Ctrl+S untuk menyimpan draft.',
              color: 'gray',
              autoClose: 5000,
            });
          }
        } catch (error) {
          console.error('Error listing drafts:', error);
          notifications.show({
            message: 'Gagal memuat daftar draft',
            color: 'red',
            autoClose: 3000,
          });
        }
      },
      onListRecentDrafts: () => {
        // Show recent drafts with more details
        try {
          const recentDrafts = [];
          const now = Date.now();

          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('draft-')) {
              const dateKey = key + '-date';
              const savedDate = localStorage.getItem(dateKey);
              const draftDate = savedDate ? new Date(savedDate).getTime() : now;
              const hoursSince = Math.round((now - draftDate) / (1000 * 60 * 60));

              recentDrafts.push({
                key,
                name: key.replace('draft-', '').replace(/-/g, ' '),
                hoursSince,
                date: new Date(draftDate).toLocaleString('id-ID')
              });
            }
          }

          // Sort by most recent first
          recentDrafts.sort((a, b) => a.hoursSince - b.hoursSince);

          if (recentDrafts.length > 0) {
            const recentList = recentDrafts
              .slice(0, 3)
              .map(draft => {
                const timeText = draft.hoursSince < 1 ? 'Baru saja' :
                                draft.hoursSince < 24 ? `${draft.hoursSince} jam lalu` :
                                `${Math.floor(draft.hoursSince / 24)} hari lalu`;
                return `📄 ${draft.name}\n   ⏰ ${timeText}`;
              })
              .join('\n\n');

            notifications.show({
              title: 'Draft Terbaru',
              message: recentList,
              color: 'blue',
              autoClose: 10000,
            });
          } else {
            notifications.show({
              message: '📝 Belum ada draft terbaru. Mulai menulis untuk membuat draft baru!',
              color: 'gray',
              autoClose: 5000,
            });
          }
        } catch (error) {
          console.error('Error listing recent drafts:', error);
          notifications.show({
            message: 'Gagal memuat draft terbaru',
            color: 'red',
            autoClose: 3000,
          });
        }
      },
      enabled: false, // COMPLETELY DISABLED FOR TESTING
    });

    // Draft shortcuts integration - COMPLETELY DISABLED FOR TESTING
    useDraftShortcuts({
      onSave: async () => {
        // Implement real save functionality to localStorage
        try {
          const content = editor.document;
          const timestamp = new Date().toISOString();
          const draftKey = `draft-${timestamp.split('T')[0]}-${Date.now()}`;

          // Save content and metadata
          localStorage.setItem(draftKey, JSON.stringify(content));
          localStorage.setItem(draftKey + '-date', timestamp);
          localStorage.setItem(draftKey + '-title', 'Draft ' + new Date().toLocaleString('id-ID'));

          notifications.show({
            title: 'Draft Tersimpan',
            message: '✅ Draft berhasil disimpan ke local storage',
            color: 'green',
            autoClose: 3000,
          });
        } catch (error) {
          console.error('Error saving draft:', error);
          notifications.show({
            message: 'Gagal menyimpan draft',
            color: 'red',
            autoClose: 3000,
          });
        }
      },
      onNewDraft: () => {
        // Clear editor content for new draft
        try {
          editor.replaceBlocks(editor.document, [
            {
              type: "paragraph",
              content: []
            }
          ]);

          notifications.show({
            message: 'Draft baru dibuat',
            color: 'blue',
            autoClose: 2000,
          });
        } catch (error) {
          console.error('Error creating new draft:', error);
        }
      },
      onShowHelp: () => {
        // This should be connected to keyboard shortcuts modal
        notifications.show({
          message: 'Tekan Ctrl+/ untuk melihat bantuan pintasan keyboard',
          color: 'blue',
          autoClose: 3000,
        });
      },
      enabled: false, // COMPLETELY DISABLED FOR TESTING
    });

    // Search functionality implementation
    const handleSearch = useCallback((query: string) => {
      // Simple search implementation - highlight matching text
      console.log('Searching for:', query);

      // For now, show notification. Full text search can be implemented later
      notifications.show({
        message: `Mencari: "${query}"`,
        color: 'blue',
        autoClose: 2000,
      });
    }, []);

    const handleReplace = useCallback((searchQuery: string, replaceQuery: string) => {
      console.log('Replacing:', searchQuery, 'with:', replaceQuery);

      notifications.show({
        message: `Mengganti "${searchQuery}" dengan "${replaceQuery}"`,
        color: 'blue',
        autoClose: 2000,
      });
    }, []);

    const handleGoToLine = useCallback((lineNumber: number) => {
      try {
        // For now, navigate to block number (approximate line)
        if (editor?.document && lineNumber <= editor.document.length) {
          const targetBlock = editor.document[lineNumber - 1];
          if (targetBlock) {
            editor.setTextCursorPosition(targetBlock, "start");

            notifications.show({
              message: `Pergi ke baris ${lineNumber}`,
              color: 'green',
              autoClose: 2000,
            });
          }
        } else {
          notifications.show({
            message: `Baris ${lineNumber} tidak ditemukan`,
            color: 'orange',
            autoClose: 3000,
          });
        }
      } catch (error) {
        console.error('Error going to line:', error);
        notifications.show({
          message: 'Gagal pergi ke baris',
          color: 'red',
          autoClose: 3000,
        });
      }
    }, [editor]);

    // Check if undo/redo is available
    const canUndo = useCallback(() => {
      return undoRedoState.currentIndex > 0;
    }, [undoRedoState.currentIndex]);

    const canRedo = useCallback(() => {
      return undoRedoState.currentIndex < undoRedoState.history.length - 1;
    }, [undoRedoState.currentIndex, undoRedoState.history.length]);

    // Enhanced undo/redo state management
    const isUndoRedoOperation = React.useRef(false);
    const lastSavedContent = React.useRef<string>("");

    // Apply revision indicators to DOM elements
    React.useEffect(() => {
      const applyRevisionIndicators = () => {
        console.log('🎨 Applying revision indicators:', revisionIndicators);
        
        // Remove existing indicators first
        document.querySelectorAll('.revision-indicator').forEach(el => {
          el.classList.remove('revision-indicator', 'needs-review', 'ai-generated', 'modified', 'suggested');
        });

        // Apply current indicators
        revisionIndicators.forEach(indicator => {
          console.log(`🔍 Looking for block: [data-id="${indicator.blockId}"]`);
          
          // Try multiple selectors to find the block (avoid direct ID selector for invalid CSS)
          let blockElement = document.querySelector(`[data-id="${indicator.blockId}"]`) || 
                           document.querySelector(`[data-block-id="${indicator.blockId}"]`);
          
          // Also try to find by content wrapper
          if (!blockElement) {
            const allBlocks = document.querySelectorAll('[data-content-type="blockContainer"]');
            allBlocks.forEach(block => {
              const blockId = block.getAttribute('data-id') || block.id;
              if (blockId === indicator.blockId) {
                blockElement = block;
              }
            });
          }
          
          if (blockElement) {
            console.log('✅ Found block element:', blockElement);
            blockElement.classList.add('revision-indicator', indicator.type);
            
            // Add inline styles as backup with proper type casting
            const htmlElement = blockElement as HTMLElement;
            htmlElement.style.position = 'relative';
            htmlElement.style.paddingLeft = '16px';
            
            // Create or update the indicator pseudo-element with real element
            let indicator_bar = blockElement.querySelector('.revision-bar') as HTMLElement;
            if (!indicator_bar) {
              indicator_bar = document.createElement('div');
              indicator_bar.className = 'revision-bar';
              blockElement.insertBefore(indicator_bar, blockElement.firstChild);
            }
            
            // Style the bar based on type
            const colors = {
              'needs-review': '#ff6b6b',
              'ai-generated': '#4ecdc4', 
              'modified': '#45b7d1',
              'suggested': '#96ceb4'
            };
            
            indicator_bar.style.cssText = `
              position: absolute !important;
              left: -12px !important;
              top: 0 !important;
              bottom: 0 !important;
              width: 6px !important;
              height: 100% !important;
              background: ${colors[indicator.type]} !important;
              border-radius: 3px !important;
              box-shadow: 0 0 15px ${colors[indicator.type]} !important;
              z-index: 9999 !important;
              animation: revision-pulse 2s ease-in-out infinite !important;
              pointer-events: none !important;
            `;
            
            // Enhanced styling for different indicator types, especially needs-review
            if (indicator.type === 'needs-review') {
              // Apply stronger styling for revision indicators
              htmlElement.style.borderLeft = `4px solid ${colors[indicator.type]}`;
              htmlElement.style.boxShadow = `inset 4px 0 0 ${colors[indicator.type]}40`;
              htmlElement.style.backgroundColor = `${colors[indicator.type]}08`;
              htmlElement.classList.add('persistent-indicator');
              
              // Ensure the indicator bar has maximum visibility
              indicator_bar.style.opacity = '1';
              indicator_bar.style.visibility = 'visible';
              indicator_bar.style.display = 'block';
              indicator_bar.classList.add('persistent-bar');
            } else {
              // Standard styling for other indicators
              htmlElement.style.borderLeft = `4px solid ${colors[indicator.type]}`;
              htmlElement.style.boxShadow = `inset 4px 0 0 ${colors[indicator.type]}40`;
            }
            
            // Add tooltip with revision reason
            if (indicator.reason) {
              blockElement.setAttribute('title', indicator.reason);
            }
            
            console.log(`🎨 Applied ${indicator.type} indicator to block`);
          } else {
            console.warn(`❌ Block element not found for ID: ${indicator.blockId}`);
          }
        });
      };

      // Apply indicators with multiple attempts to catch DOM updates
      const timeoutId = setTimeout(applyRevisionIndicators, 100);
      const intervalId = setInterval(applyRevisionIndicators, 500);
      
      // Enhanced persistence monitoring for revision indicators
      const persistenceMonitor = setInterval(() => {
        revisionIndicators.forEach(indicator => {
          if (indicator.type === 'needs-review') {
            const blockElement = document.querySelector(`[data-id="${indicator.blockId}"]`) || 
                               document.querySelector(`[data-block-id="${indicator.blockId}"]`);
            
            if (blockElement && !blockElement.classList.contains('persistent-indicator')) {
              console.log('🔄 Detected missing revision indicator, reapplying:', indicator.blockId);
              applyRevisionIndicators();
            }
          }
        });
      }, 1000);
      
      // Cleanup after 10 seconds for persistence monitor
      const cleanupId = setTimeout(() => {
        clearInterval(intervalId);
        clearInterval(persistenceMonitor);
      }, 10000);
      
      return () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        clearInterval(persistenceMonitor);
        clearTimeout(cleanupId);
      };
    }, [revisionIndicators, editor.document]);

    // Save state to history for undo/redo with deduplication
    const saveToHistory = useCallback((blocks: Block[]) => {
      // Skip saving during undo/redo operations
      if (isUndoRedoOperation.current) return;

      const currentContent = JSON.stringify(blocks);

      // Skip if content hasn't actually changed
      if (currentContent === lastSavedContent.current) return;

      lastSavedContent.current = currentContent;

      setUndoRedoState(prev => {
        const newHistory = [...prev.history];
        const newIndex = prev.currentIndex + 1;

        // Remove any future history if we're not at the end
        if (newIndex < newHistory.length) {
          newHistory.splice(newIndex);
        }

        // Add new state
        newHistory.push(JSON.parse(currentContent));

        // Limit history size
        if (newHistory.length > prev.maxHistorySize) {
          newHistory.shift();
          return {
            ...prev,
            history: newHistory,
            currentIndex: newHistory.length - 1,
          };
        }

        return {
          ...prev,
          history: newHistory,
          currentIndex: newIndex,
        };
      });
    }, []);

    // Initialize history with initial content
    React.useEffect(() => {
      if (editor && undoRedoState.history.length === 0) {
        const initialContent = editor.document;
        lastSavedContent.current = JSON.stringify(initialContent);
        setUndoRedoState(prev => ({
          ...prev,
          history: [JSON.parse(JSON.stringify(initialContent))],
          currentIndex: 0,
        }));
      }
    }, [editor, undoRedoState.history.length]);

    // Track content changes for undo/redo with debouncing
    React.useEffect(() => {
      if (!editor) return;

      let timeoutId: NodeJS.Timeout;
      let isProcessing = false;

      const handleChange = () => {
        // Skip if already processing or during undo/redo
        if (isProcessing || isUndoRedoOperation.current) return;

        isProcessing = true;
        clearTimeout(timeoutId);

        timeoutId = setTimeout(() => {
          try {
            saveToHistory(editor.document);
          } finally {
            isProcessing = false;
          }
        }, 800); // Reduced debounce time for better responsiveness
      };

      let unsubscribe: (() => void) | undefined;

      try {
        unsubscribe = editor.onChange?.(handleChange);
      } catch (error) {
        console.error("Error setting up editor change listener:", error);
      }

      return () => {
        clearTimeout(timeoutId);
        isProcessing = false;
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [editor, saveToHistory]);

    // Enhanced Undo function
    const undo = useCallback(() => {
      if (!editor || !canUndo()) return;

      isUndoRedoOperation.current = true;

      try {
        setUndoRedoState(prev => {
          if (prev.currentIndex > 0) {
            const newIndex = prev.currentIndex - 1;
            const previousState = prev.history[newIndex];

            if (previousState) {
              // Update last saved content to prevent loops
              lastSavedContent.current = JSON.stringify(previousState);

              // Restore previous state
              setTimeout(() => {
                try {
                  editor.replaceBlocks(editor.document, previousState);
                } catch (error) {
                  console.error("Error during undo:", error);
                } finally {
                  isUndoRedoOperation.current = false;
                }
              }, 0);
            }

            return {
              ...prev,
              currentIndex: newIndex,
            };
          }

          isUndoRedoOperation.current = false;
          return prev;
        });
      } catch (error) {
        console.error("Undo operation failed:", error);
        isUndoRedoOperation.current = false;
      }
    }, [editor, canUndo]);

    // Enhanced Redo function
    const redo = useCallback(() => {
      if (!editor || !canRedo()) return;

      isUndoRedoOperation.current = true;

      try {
        setUndoRedoState(prev => {
          if (prev.currentIndex < prev.history.length - 1) {
            const newIndex = prev.currentIndex + 1;
            const nextState = prev.history[newIndex];

            if (nextState) {
              // Update last saved content to prevent loops
              lastSavedContent.current = JSON.stringify(nextState);

              // Restore next state
              setTimeout(() => {
                try {
                  editor.replaceBlocks(editor.document, nextState);
                } catch (error) {
                  console.error("Error during redo:", error);
                } finally {
                  isUndoRedoOperation.current = false;
                }
              }, 0);
            }

            return {
              ...prev,
              currentIndex: newIndex,
            };
          }

          isUndoRedoOperation.current = false;
          return prev;
        });
      } catch (error) {
        console.error("Redo operation failed:", error);
        isUndoRedoOperation.current = false;
      }
    }, [editor, canRedo]);

    // Enhanced keyboard shortcuts for undo/redo - TEMPORARILY DISABLED
    React.useEffect(() => {
      // DISABLED - Testing if this causes auto enter
      return () => {};
    }, [undo, redo, canUndo, canRedo]);

    // STRICT paste handling - TEMPORARILY DISABLED
    React.useEffect(() => {
      // DISABLED - Testing if this causes auto enter
      return () => {};
    }, []);


    // Enhanced imperative handle with undo/redo
    useImperativeHandle(ref, () => ({
      getEditor: () => editor,
      getContent: () => editor.document,
      setContent: (content: Block[]) => {
        if (editor && content && Array.isArray(content)) {
          console.log('🔄 SETTING EDITOR CONTENT:', content.length, 'blocks');
          console.log('🔍 First block structure:', content[0]);
          try {
            // Validate content structure before setting
            const validatedContent = content.map(block => {
              if (!block.type) {
                throw new Error(`Block missing type: ${JSON.stringify(block)}`);
              }
              return block;
            });

            editor.replaceBlocks(editor.document, validatedContent as Block[]);
            console.log('✅ Editor content updated successfully');
          } catch (error) {
            console.error('❌ Error setting editor content:', error);
            console.error('❌ Content that failed:', JSON.stringify(content, null, 2));

            // Fallback: set empty paragraph
            try {
              editor.replaceBlocks(editor.document, [{
                type: "paragraph",
                content: []
              }]);
              console.log('✅ Fallback to empty content successful');
            } catch (fallbackError) {
              console.error('❌ Even fallback failed:', fallbackError);
            }
          }
        } else {
          console.warn('⚠️ Invalid content provided to setContent:', content);
        }
      },
      insertCitation: (citationText: string) => {
        if (citationText) {
          // Format citation text
          const formattedText = citationText.startsWith('[') && citationText.endsWith(']') 
            ? citationText 
            : `[${citationText}]`;
          
          console.log('=== INSERTING CITATION ===', formattedText);
          
          // USE BLOCKNOTE'S NATIVE insertInlineContent METHOD
          try {
            editor.insertInlineContent([
              {
                type: "text",
                text: formattedText,
                styles: {
                  textColor: "blue",
                  bold: true,
                },
              },
              {
                type: "text",
                text: " ",
                styles: {
                  textColor: "default",
                  bold: false,
                },
              },
            ]);
            console.log('✅ Citation inserted using BlockNote API');
            return;
          } catch (error) {
            console.log('BlockNote API failed, trying direct insertion');
          }
          
          // FALLBACK: DIRECT SPAN INSERT 
          const proseMirror = document.querySelector('.ProseMirror');
          if (proseMirror) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              
              const citationSpan = document.createElement('span');
              citationSpan.className = 'citation-blue';
              citationSpan.textContent = formattedText;
              citationSpan.style.cssText = 'color: blue !important; font-weight: bold !important;';
              citationSpan.setAttribute('data-citation', 'true');
              
              range.deleteContents();
              range.insertNode(citationSpan);
              
              range.setStartAfter(citationSpan);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
              
              console.log('✅ Citation inserted as BLUE SPAN (fallback)');
              return;
            }
          }
          
          // Fallback - insert and style
          console.log('🚨 USING FALLBACK INSERTION');
          editor.insertInlineContent(formattedText);
          
          setTimeout(() => {
            console.log('🔍 FALLBACK STYLING ATTEMPT');
            const proseMirror = document.querySelector('.ProseMirror');
            if (proseMirror) {
              console.log('ProseMirror found in fallback');
              
              // Find text node with citation
              const walker = document.createTreeWalker(
                proseMirror,
                NodeFilter.SHOW_TEXT,
                null
              );
              
              let textNode;
              let nodeCount = 0;
              while (textNode = walker.nextNode()) {
                nodeCount++;
                console.log(`Text node ${nodeCount}:`, textNode.textContent);
                
                if (textNode.textContent?.includes(formattedText)) {
                  console.log('🎯 Found citation in text node!');
                  const parent = textNode.parentElement;
                  console.log('Parent element:', parent);
                  console.log('Parent innerHTML:', parent?.innerHTML);
                  
                  if (parent && !parent.querySelector('.citation-blue')) {
                    const text = textNode.textContent;
                    const newHTML = text.replace(
                      formattedText, 
                      `<span class="citation-blue" style="color: blue !important; font-weight: bold !important;">${formattedText}</span>`
                    );
                    console.log('Old HTML:', parent.innerHTML);
                    console.log('New HTML with citation:', newHTML);
                    
                    parent.innerHTML = parent.innerHTML.replace(text, newHTML);
                    console.log('✅ Citation styled in fallback with YELLOW background');
                    console.log('Final HTML:', parent.innerHTML);
                    break;
                  } else {
                    console.log('❌ Parent not found or citation already styled');
                  }
                }
              }
              console.log(`Total text nodes checked: ${nodeCount}`);
            } else {
              console.log('❌ ProseMirror not found in fallback');
            }
          }, 50);
          
          console.log('Used fallback insertion');
        }
      },
      undo,
      redo,
      canUndo,
      canRedo,
      openLatexModal,
    }));

    // LaTeX Modal handlers
    const handleLatexInsert = useCallback((formula: string) => {
      // Convert LaTeX to readable mathematical notation
      let finalText = "";
      
      try {
        // Convert LaTeX to readable mathematical notation
        finalText = formula.trim()
          // Cube roots (handle before square roots)
          .replace(/\\sqrt\[3\]\{([^}]+)\}/g, '∛$1')
          // Square roots
          .replace(/\\sqrt\{([^}]+)\}/g, '√$1')
          // Fractions
          .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1÷$2')
          // Powers (convert ^ to superscript notation)
          .replace(/\^2/g, '²')
          .replace(/\^3/g, '³')
          .replace(/\^4/g, '⁴')
          .replace(/\^5/g, '⁵')
          .replace(/\^6/g, '⁶')
          .replace(/\^7/g, '⁷')
          .replace(/\^8/g, '⁸')
          .replace(/\^9/g, '⁹')
          .replace(/\^0/g, '⁰')
          .replace(/\^1/g, '¹')
          // For other numbers, keep the caret notation
          .replace(/\^([0-9]+)/g, '^$1')
          // Mathematical operators
          .replace(/\*/g, '×')
          .replace(/\//g, '÷')
          // Constants (replace common decimal approximations)
          .replace(/3\.14159/g, 'π')
          .replace(/2\.71828/g, 'e')
          // Remove any remaining backslashes
          .replace(/\\/g, '');

        // If the formula is empty after conversion, show helpful message
        if (!finalText.trim()) {
          finalText = "Formula kosong - Silakan masukkan formula matematika";
        }
      } catch (e) {
        finalText = `Error: "${formula}" - Pastikan format LaTeX benar`;
      }

      // Log the formula insertion
      if (onLogFormula && !finalText.includes('Error:')) {
        onLogFormula(formula, finalText);
      }

      // Create enhanced formula display with multiple formats
      const now = new Date();
      const timestamp = now.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Determine the formula type for better presentation
      let formulaIcon = "🧮";
      let formulaCategory = "Umum";
      
      if (finalText.includes("√") || finalText.includes("∛")) {
        formulaIcon = "√";
        formulaCategory = "Akar";
      } else if (finalText.includes("²") || finalText.includes("³") || finalText.includes("⁴") || finalText.includes("⁵")) {
        formulaIcon = "🔢";
        formulaCategory = "Pangkat";
      } else if (finalText.includes("π") || finalText.includes("°")) {
        formulaIcon = "🔵";
        formulaCategory = "Geometri";
      } else if (finalText.includes("÷") || finalText.includes("×") || finalText.includes("+") || finalText.includes("-")) {
        formulaIcon = "⚡";
        formulaCategory = "Operasi";
      } else if (formula.includes("mean") || formula.includes("average")) {
        formulaIcon = "📊";
        formulaCategory = "Statistik";
      } else if (formula.includes("celsius") || formula.includes("fahrenheit")) {
        formulaIcon = "🌡️";
        formulaCategory = "Konversi";
      } else if (formula.includes("interest") || formula.includes("discount")) {
        formulaIcon = "💰";
        formulaCategory = "Keuangan";
      }

      // Create modern card-style formula display
      const isComplexFormula = formula.includes("\\sqrt") || formula.includes("\\frac") || formula.includes("^");
      
      // Create CODE EDITOR style formula display (Dark Theme)
      editor.insertBlocks(
        [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "┌──────────────────────────────────────────────────┐",
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#6b7280"
                }
              }
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "│ ",
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#6b7280"
                }
              },
              {
                type: "text",
                text: "// " + formulaCategory + " Formula",
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#10b981",
                  italic: true
                }
              },
              {
                type: "text",
                text: " │",
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#6b7280"
                }
              }
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "│ ",
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#6b7280"
                }
              },
              {
                type: "text",
                text: "result = ",
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#f59e0b"
                }
              },
              {
                type: "text",
                text: finalText,
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#60a5fa",
                  bold: true
                }
              },
              {
                type: "text",
                text: ";",
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#9ca3af"
                }
              },
              {
                type: "text",
                text: " │",
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#6b7280"
                }
              }
            ],
          },
          ...(isComplexFormula ? [{
            type: "paragraph" as const,
            content: [
              {
                type: "text" as const,
                text: "│ ",
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#6b7280"
                }
              },
              {
                type: "text" as const,
                text: "// LaTeX: ",
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#10b981",
                  italic: true
                }
              },
              {
                type: "text" as const,
                text: formula,
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#f472b6",
                  italic: true
                }
              },
              {
                type: "text" as const,
                text: " │",
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#6b7280"
                }
              }
            ],
          }] : []),
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "│ ",
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#6b7280"
                }
              },
              {
                type: "text",
                text: "// Executed at " + timestamp,
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#10b981",
                  italic: true
                }
              },
              {
                type: "text",
                text: " │",
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#6b7280"
                }
              }
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "└──────────────────────────────────────────────────┘",
                styles: {
                  backgroundColor: "#1f2937",
                  textColor: "#6b7280"
                }
              }
            ],
          }
        ],
        editor.getTextCursorPosition().block,
        "after"
      );
    }, [editor]);

    const openLatexModal = useCallback(() => {
      setIsLatexModalOpen(true);
    }, []);

    const closeLatexModal = useCallback(() => {
      setIsLatexModalOpen(false);
    }, []);

    // Enhanced AI Progress simulation
    const simulateAIProgress = useCallback(async (
      totalDuration: number = 8000,
      onProgress: (progress: number, stage: string) => void
    ) => {
      const stages = [
        { progress: 15, stage: "Memproses permintaan...", duration: 1000 },
        { progress: 30, stage: "Menganalisis konteks...", duration: 1500 },
        { progress: 50, stage: "Menghasilkan konten...", duration: 2500 },
        { progress: 75, stage: "Menyempurnakan hasil...", duration: 2000 },
        { progress: 90, stage: "Memformat konten...", duration: 800 },
        { progress: 100, stage: "Selesai!", duration: 200 },
      ];

      for (const stage of stages) {
        await new Promise(resolve => setTimeout(resolve, stage.duration));
        onProgress(stage.progress, stage.stage);
      }
    }, []);

    // AI Templates - Only 3 modes - FIXED with proper typing
    const aiTemplates: AITemplate[] = [
      {
        title: "Buat Struktur ",
        description: "Membuat outline lengkap dengan judul dan sub-judul secara otomatis berdasarkan topik",
        type: "structure",
        color: "blue",
        icon: IconList,
        defaultPrompt: "Buat outline untuk artikel",
        behavior: "rewrite" // Will replace all content
      },
      {
        title: "Isi Konten ",
        description: "Menghasilkan konten detail dan mendalam untuk bagian tertentu dalam artikel",
        type: "content",
        color: "green",
        icon: IconEdit,
        defaultPrompt: "Tulis konten detail tentang",
        behavior: "rewrite" // Changed to rewrite to show preview first
      },
      {
        title: "Lanjutkan Kalimat",
        description: "Melanjutkan kalimat atau paragraf yang sedang ditulis dengan AI cerdas",
        type: "sentence",
        color: "orange",
        icon: IconPencilPlus,
        defaultPrompt: "Lanjutkan tulisan yang sudah ada",
        behavior: "rewrite" // Changed to rewrite to show preview first
      }
    ];

    // AI Auto Templates - NEW: AI Otomatis tanpa prompt - FIXED with proper typing
    const aiAutoTemplates: AIAutoTemplate[] = [
      {
        title: "Buat Struktur ",
        description: "Membuat outline lengkap dengan judul dan sub-judul tanpa input manual",
        type: "structure",
        color: "blue",
        icon: IconList,
        behavior: "rewrite"
      },
      {
        title: "Buat Isi Konten",
        description: "Menghasilkan konten detail dan mendalam untuk topik secara otomatis",
        type: "content",
        color: "green",
        icon: IconEdit,
        behavior: "rewrite" // Change to rewrite to show preview first
      },
      {
        title: "Lanjutkan Kalimat",
        description: "Melanjutkan kalimat atau paragraf yang sudah ada dengan AI",
        type: "sentence",
        color: "orange",
        icon: IconPencilPlus,
        behavior: "rewrite" // Change to rewrite to show preview first
      }
    ];

    // Inline AI suggestions
    const inlineAISuggestions = [
      {
        icon: <IconPencilPlus size={15} />,
        title: "Lanjutkan Tulisan",
        description: "AI akan meneruskan ide dari kalimat terakhir secara kontekstual",
        action: "continue"
      },
      {
        icon: <IconFileText size={15} />,
        title: "Ringkasan Cerdas",
        description: "Menghasilkan ringkasan otomatis dari tulisan yang sudah ada",
        action: "summarize"
      },
      {
        icon: <IconBulb size={15} />,
        title: "Tulis Sesuatu...",
        description: "Mode bebas untuk meminta AI menulis sesuai kebutuhan spesifik",
        action: "write_anything"
      }
    ];

    // Enhanced typing animation with progress
    const typeText = async (text: string, targetBlock: Block, delay: number = 30): Promise<void> => {
      return new Promise(async (resolve) => {
        let currentIndex = 0;
        const words = text.split(' ');
        let insertedBlock: Block | null = null;

        // Initialize progress tracking
        setAIStreamingState(prev => ({
          ...prev,
          isStreaming: true,
          totalChunks: words.length,
          currentChunk: 0,
          progress: 0,
        }));

        // Check if target block is a judul - if so, create new paragraph below it
        if (targetBlock.type === "heading") {
          try {
            const newParagraphBlocks: PartialBlock[] = [{
              type: "paragraph",
              content: "",
            }];

            await editor.insertBlocks(newParagraphBlocks, targetBlock, "after");

            const allBlocks = editor.document;
            const targetIndex = allBlocks.findIndex(block => block.id === targetBlock.id);
            insertedBlock = allBlocks[targetIndex + 1];

            setAIStreamingState(prev => ({
              ...prev,
              currentBlock: insertedBlock,
              originalText: ""
            }));

          } catch (error) {
            console.error("Error creating paragraph block below judul:", error);
            
            notifications.show({
              title: "⚠️ Ada Kendala Teknis",
              message: `Maaf, terjadi masalah saat menambahkan teks baru.\n\n📋 Solusi yang bisa dicoba:\n• 🔄 Coba klik di tempat lain lalu coba lagi\n• ⏱️ Tunggu sebentar lalu ulangi\n• 🔃 Refresh halaman jika masih bermasalah\n\n💡 Tip: Pastikan cursor berada di posisi yang tepat`,
              color: "red",
              icon: <IconX size={16} />,
              autoClose: 6000,
              style: { whiteSpace: 'pre-line' }
            });
            resolve();
            return;
          }
        } else {
          insertedBlock = targetBlock;
        }

        if (!insertedBlock) {
          resolve();
          return;
        }

        const typeNextWord = () => {
          if (currentIndex < words.length) {
            const wordsToShow = words.slice(0, currentIndex + 1).join(' ');
            const progress = Math.round((currentIndex / words.length) * 100);

            try {
              if (targetBlock.type === "heading") {
                editor.updateBlock(insertedBlock!, {
                  type: "paragraph",
                  content: wordsToShow,
                });
              } else {
                let newContent = "";

                if (aiStreamingState.originalText && aiStreamingState.originalText.trim()) {
                  const needsSpace = !aiStreamingState.originalText.endsWith(' ') &&
                    !aiStreamingState.originalText.endsWith('.') &&
                    !aiStreamingState.originalText.endsWith(',') &&
                    !aiStreamingState.originalText.endsWith('!') &&
                    !aiStreamingState.originalText.endsWith('?') &&
                    !aiStreamingState.originalText.endsWith(':') &&
                    !aiStreamingState.originalText.endsWith(';') &&
                    !aiStreamingState.originalText.endsWith('-') &&
                    !aiStreamingState.originalText.endsWith('—');

                  newContent = aiStreamingState.originalText + (needsSpace ? ' ' : '') + wordsToShow;
                } else {
                  newContent = wordsToShow;
                }

                editor.updateBlock(insertedBlock!, {
                  type: insertedBlock!.type as "paragraph" | "heading" | "bulletListItem" | "numberedListItem",
                  content: newContent,
                });
              }

              // Update streaming state with progress
              setAIStreamingState(prev => ({
                ...prev,
                streamedText: wordsToShow,
                currentBlock: insertedBlock,
                currentChunk: currentIndex + 1,
                progress,
              }));

            } catch (error) {
              console.error("Error during typing animation:", error);
            }

            currentIndex++;
            setTimeout(typeNextWord, delay);
          } else {
            // Typing completed
            setAIStreamingState(prev => ({
              ...prev,
              isStreaming: false,
              showControls: true,
              progress: 100,
            }));
            resolve();
          }
        };

        typeNextWord();
      });
    };

    // Enhanced AI Generation with progress
    const handleAIGenerationWithProgress = async (userPrompt: string = "", type: string = "structure", behavior: string = "rewrite") => {

      // Allow mock generation even without API key for development
      console.log("🚀 Starting AI generation with progress:", { userPrompt, type, behavior, hasModel: !!aiModel });

      const startTime = Date.now();
      
      try {
        setAIProgressState(prev => ({
          ...prev,
          isLoading: true,
          progress: 0,
          stage: "Memulai...",
          startTime: startTime,
        }));

        // Start progress simulation
        const progressPromise = simulateAIProgress(8000, (progress, stage) => {
          setAIProgressState(prev => ({
            ...prev,
            progress,
            stage,
          }));
        });

        // Generate AI content (existing logic)
        const generatedText = await generateAIContent(userPrompt, type);
        console.log("Generated text in handleAIGenerationWithProgress:", generatedText ? generatedText.substring(0, 100) + "..." : "No text generated");

        // Wait for progress to complete
        await progressPromise;

        // Always ensure final state is set
        setAIProgressState(prev => ({
          ...prev,
          isLoading: false,
          progress: 100,
          stage: "Selesai!",
        }));

        // Give a moment for UI to update
        await new Promise(resolve => setTimeout(resolve, 100));

        // Log successful AI activity
        const duration = Date.now() - startTime;
        logAIActivity(
          type as 'structure' | 'content' | 'sentence',
          userPrompt || `Auto ${type}`,
          `Generated ${type} content`,
          true,
          duration
        );

        console.log("Returning generated text:", !!generatedText);
        return generatedText;
      } catch (error) {
        console.error("AI generation failed:", error);
        
        // Log failed AI activity
        const duration = Date.now() - startTime;
        logAIActivity(
          type as 'structure' | 'content' | 'sentence',
          userPrompt || `Auto ${type}`,
          `Failed to generate ${type}`,
          false,
          duration
        );

        setAIProgressState(prev => ({
          ...prev,
          isLoading: false,
          progress: 0,
          stage: "Error",
        }));
        notifications.show({
          title: 'Gagal Menghasilkan Konten',
          message: 'Terjadi kesalahan saat berkomunikasi dengan AI. Silakan coba lagi.',
          color: 'red',
          icon: <IconX size={18} />,
        });
        return "";
      }
    };

    // Accept AI content
    const acceptAIContent = () => {
      // Mark accepted AI content with indicator
      if (aiStreamingState.currentBlock) {
        addRevisionIndicator(
          aiStreamingState.currentBlock.id, 
          'ai-generated', 
          'Konten dihasilkan AI - diterima'
        );
      }
      
      setAIStreamingState({
        isStreaming: false,
        streamedText: "",
        currentBlock: null,
        originalText: "",
        showControls: false,
        position: { x: 0, y: 0 },
        progress: 0,
        totalChunks: 0,
        currentChunk: 0,
      });
      setContinueState(prev => ({ ...prev, isVisible: false }));
    };

    // Revert AI content
    const revertAIContent = () => {
      if (aiStreamingState.currentBlock) {
        try {
          const allBlocks = editor.document;
          const currentIndex = allBlocks.findIndex(block => block.id === aiStreamingState.currentBlock!.id);
          const blockId = aiStreamingState.currentBlock.id;

          if (currentIndex > 0 && allBlocks[currentIndex - 1].type === "heading" &&
            aiStreamingState.originalText === "") {
            editor.removeBlocks([aiStreamingState.currentBlock]);
            const judulBlock = allBlocks[currentIndex - 1];
            editor.setTextCursorPosition(judulBlock, "end");
          } else {
            editor.updateBlock(aiStreamingState.currentBlock, {
              type: aiStreamingState.currentBlock.type as "paragraph" | "heading" | "bulletListItem" | "numberedListItem",
              content: aiStreamingState.originalText,
            });
            editor.setTextCursorPosition(aiStreamingState.currentBlock, "end");
            
            // Enhanced revision indicator with persistent state
            // First, remove any existing indicator for this block
            setRevisionIndicators(prev => prev.filter(indicator => indicator.blockId !== blockId));
            
            // Add revision indicator to mark this block as needing review with enhanced persistence
            setTimeout(() => {
              addRevisionIndicator(
                blockId, 
                'needs-review', 
                'Konten AI dibatalkan - perlu direvisi'
              );
              
              // Force DOM update to ensure indicator persists
              setTimeout(() => {
                const blockElement = document.querySelector(`[data-id="${blockId}"]`) || 
                                   document.querySelector(`[data-block-id="${blockId}"]`);
                
                if (blockElement) {
                  console.log('🔄 Ensuring revision indicator persistence for block:', blockId);
                  
                  // Add persistent visual indicators with higher specificity
                  const htmlElement = blockElement as HTMLElement;
                  htmlElement.classList.add('revision-indicator', 'needs-review', 'persistent-indicator');
                  
                  // Apply immediate styling to ensure visibility
                  htmlElement.style.position = 'relative';
                  htmlElement.style.paddingLeft = '16px';
                  htmlElement.style.borderLeft = '4px solid #ff6b6b';
                  htmlElement.style.boxShadow = 'inset 4px 0 0 #ff6b6b40';
                  htmlElement.style.backgroundColor = 'rgba(255, 107, 107, 0.05)';
                  
                  // Create persistent indicator bar
                  let indicator_bar = blockElement.querySelector('.revision-bar') as HTMLElement;
                  if (!indicator_bar) {
                    indicator_bar = document.createElement('div');
                    indicator_bar.className = 'revision-bar persistent-bar';
                    blockElement.insertBefore(indicator_bar, blockElement.firstChild);
                  }
                  
                  // Apply strong styling that won't be easily overridden
                  indicator_bar.style.cssText = `
                    position: absolute !important;
                    left: -12px !important;
                    top: 0 !important;
                    bottom: 0 !important;
                    width: 6px !important;
                    height: 100% !important;
                    background: linear-gradient(180deg, #ff6b6b 0%, #ff5252 100%) !important;
                    border-radius: 3px !important;
                    box-shadow: 0 0 15px #ff6b6b !important;
                    z-index: 9999 !important;
                    animation: revision-pulse 2s ease-in-out infinite !important;
                    pointer-events: none !important;
                    opacity: 1 !important;
                  `;
                  
                  // Add tooltip with revision reason
                  blockElement.setAttribute('title', 'Konten AI dibatalkan - perlu direvisi');
                  
                  console.log('✅ Enhanced persistent revision indicator applied');
                }
              }, 100);
              
              // Additional persistence check after 1 second
              setTimeout(() => {
                const blockElement = document.querySelector(`[data-id="${blockId}"]`) || 
                                   document.querySelector(`[data-block-id="${blockId}"]`);
                
                if (blockElement && !blockElement.classList.contains('persistent-indicator')) {
                  console.log('🔄 Re-applying revision indicator due to persistence check');
                  addRevisionIndicator(blockId, 'needs-review', 'Konten AI dibatalkan - perlu direvisi');
                }
              }, 1000);
            }, 50);
          }

        } catch (error) {
          console.error("Error reverting AI content:", error);
        }
      }

      setAIStreamingState({
        isStreaming: false,
        streamedText: "",
        currentBlock: null,
        originalText: "",
        showControls: false,
        position: { x: 0, y: 0 },
        progress: 0,
        totalChunks: 0,
        currentChunk: 0,
      });
      setContinueState(prev => ({ ...prev, isVisible: false }));
    };

    // Utility function to extract text from any block - FIXED
    const extractTextFromBlock = useCallback((block: Block): string => {
      try {
        if (!block || !block.content) return "";

        // Cast content to unknown first, then handle safely
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const content = block.content as any;

        // Handle array content (inline content)
        if (Array.isArray(content)) {
          return content
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any) => {
              // Handle StyledText objects
              if (item && typeof item === 'object' && item.text) {
                return item.text;
              }
              // Handle Link objects with nested content
              if (item && typeof item === 'object' && item.content && Array.isArray(item.content)) {
                return item.content
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .map((subItem: any) => {
                    if (subItem && typeof subItem === 'object' && subItem.text) {
                      return subItem.text;
                    }
                    return '';
                  })
                  .join('');
              }
              // Handle plain strings (fallback)
              if (typeof item === 'string') {
                return item;
              }
              return '';
            })
            .join('').trim();
        }

        // Handle string content (for some block types)
        if (typeof content === 'string') {
          return content;
        }

        return "";
      } catch (error) {
        console.error("Error extracting text from block:", error);
        return "";
      }
    }, []);

    // Extract context from cursor position
    const extractContextFromCursor = useCallback((): string => {
      try {
        const cursorPosition = editor.getTextCursorPosition();
        if (!cursorPosition) return "";

        const currentBlock = cursorPosition.block;
        const allBlocks = editor.document;
        const currentIndex = allBlocks.findIndex(block => block.id === currentBlock.id);

        const contextBlocks = allBlocks.slice(Math.max(0, currentIndex - 3), currentIndex + 1);

        let context = "";
        contextBlocks.forEach(block => {
          const text = extractTextFromBlock(block);
          if (text) {
            if (block.type === "heading") {
              context += `\n# ${text}\n`;
            } else {
              context += `${text}\n`;
            }
          }
        });

        return context.trim();
      } catch (error) {
        console.error("Error extracting context:", error);
        return "";
      }
    }, [editor, extractTextFromBlock]);

    // Check if should show continue button - Enhanced version
    const shouldShowContinueButton = useCallback((block: Block): boolean => {
      try {
        if (!block) return false;

        // Don't show if AI is streaming
        if (aiStreamingState.isStreaming || aiStreamingState.showControls) return false;

        // Allow continue button for judul (untuk generate content)
        if (block.type === "heading") {
          return true;
        }

        // Enhanced logic for paragraphs - more permissive
        if (block.type === "paragraph") {
          const text = extractTextFromBlock(block);

          // Show continue button for any paragraph with content (even short ones)
          if (text.length >= 3) { // Reduced from 5 to 3 for better UX
            return true;
          }
        }

        // Also allow for list items
        if (block.type === "bulletListItem" || block.type === "numberedListItem") {
          const text = extractTextFromBlock(block);
          if (text.length >= 2) { // Reduced from 3 to 2 for better UX
            return true;
          }
        }

        // NEW: Allow for other block types that can contain text
        if (block.type === "checkListItem") {
          const text = extractTextFromBlock(block);
          if (text.length >= 2) {
            return true;
          }
        }

        return false;
      } catch {
        return false;
      }
    }, [extractTextFromBlock, aiStreamingState.isStreaming, aiStreamingState.showControls]);

    // Find matching judul
    const findMatchingJudul = (blocks: Block[], judulText: string, level: number, startIndex: number): number => {
      for (let i = startIndex; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.type === "heading" && (block.props as { level?: number })?.level === level) {
          const blockText = extractTextFromBlock(block);
          if (blockText === judulText) {
            return i;
          }
        }
      }
      return -1;
    };

    // Close modal and reset
    const closeModalAndReset = () => {
      closeAIModal();
      setPrompt("");
      setGeneratedContent("");
      setAIMode("new");
      setCurrentAIType("structure");
      setSavedCursorPosition(null);
      setAIProgressState({
        isLoading: false,
        progress: 0,
        stage: "",
        estimatedTime: 0,
        startTime: 0,
      });
    };

    // Handle AI Auto Generation - tanpa prompt
    const handleAIAutoGeneration = async (type: string = "structure", behavior: string = "rewrite") => {
      // Allow mock generation for development
      console.log("🎯 Auto AI generation:", { type, behavior, hasModel: !!aiModel });

      // Set current AI type untuk tracking
      setCurrentAIType(type);
      setAIMode("auto");

      // Save cursor position for content and sentence behavior
      if (behavior === "add" || behavior === "cursor") {
        const cursorPosition = editor.getTextCursorPosition();
        if (cursorPosition) {
          setSavedCursorPosition({
            blockId: cursorPosition.block.id,
            offset: (editor as any)._tiptapEditor.state.selection.from,
          });
        }
      }

      // Use enhanced progress generation
      const generatedText = await handleAIGenerationWithProgress("", type, behavior);

      console.log("handleAIAutoGeneration got text:", !!generatedText);
      if (generatedText) {
        console.log("Setting generated content in auto mode, length:", generatedText.length);
        setGeneratedContent(generatedText);
        console.log("Generated content state should be set now");
        
        // ADD OUTLINE UPDATE - same as AI Modal
        setTimeout(() => {
          // Extract title dari H1 judul yang digenerate
          const h1Match = generatedText.match(/^#\s+(.+)$/m);
          if (h1Match) {
            const extractedTitle = h1Match[1].trim();
            console.log('🎯 AI AUTO - Dispatching title update:', extractedTitle);
            
            window.dispatchEvent(new CustomEvent('slashMenuTitleUpdate', { 
              detail: { title: extractedTitle } 
            }));
          }

          // DIRECT OUTLINE EXTRACTION dari generatedContent
          console.log('🗂️ AI AUTO - Extracting judul directly from generated content');
          const judul: { id: string; text: string; level: number }[] = [];
          const lines = generatedText.split('\n');
          
          lines.forEach((line, index) => {
            const judulMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (judulMatch) {
              const level = judulMatch[1].length;
              const text = judulMatch[2].trim();
              
              judul.push({
                id: `ai-auto-judul-${index}`,
                text: text,
                level: level
              });
            }
          });
          
          console.log('🗂️ AI AUTO - Extracted judul directly:', judul);
          
          if (judul.length > 0) {
            // Dispatch direct outline set
            window.dispatchEvent(new CustomEvent('setOutlineDirectly', {
              detail: { headings: judul }
            }));
          }

          // Also force refresh outline as backup
          console.log('🗂️ AI AUTO - Dispatching force outline refresh as backup');
          window.dispatchEvent(new CustomEvent('forceOutlineRefresh'));
        }, 2000); // Longer delay untuk pastikan content benar-benar terinser
        
        openAIModal(); // Show modal with generated content
      }
    };

    // Handle AI generation (existing function with progress enhancement)
    const handleAIGeneration = async (inputPrompt: string, type: string = "structure", behavior: string = "rewrite") => {
      if (!inputPrompt.trim()) {
        notifications.show({
          title: 'Input Diperlukan',
          message: 'Silakan masukkan topik atau kata kunci sebelum menghasilkan konten.',
          color: 'yellow',
          icon: <IconAlertTriangle size={18} />,
        });
        return;
      }

      // Set current AI type untuk tracking
      setCurrentAIType(type);

      // Save cursor position for cursor and content_cursor behavior
      if (behavior === "cursor" || behavior === "content_cursor") {
        const cursorPosition = editor.getTextCursorPosition();
        if (cursorPosition) {
          setSavedCursorPosition({
            blockId: cursorPosition.block.id,
            offset: (editor as any)._tiptapEditor.state.selection.from,
          });
        }
      }

      // Use enhanced progress generation
      const generatedText = await handleAIGenerationWithProgress(inputPrompt, type, behavior);

      console.log("handleAIGeneration got text:", !!generatedText);
      if (generatedText) {
        console.log("Setting generated content in manual mode, length:", generatedText.length);
        setGeneratedContent(generatedText);
        console.log("Generated content state should be set now (manual)");
      } else {
        console.log("No generated text received in handleAIGeneration");
      }
    };

    // Analyze cursor context - Enhanced version
    const analyzeCurrentCursorContext = (): CursorContext | null => {
      try {
        const cursorPosition = editor.getTextCursorPosition();
        if (!cursorPosition) return null;

        const currentBlock = cursorPosition.block;
        const allBlocks = editor.document;
        const currentIndex = allBlocks.findIndex(block => block.id === currentBlock.id);

        const currentText = extractTextFromBlock(currentBlock);

        // Get preceding context (previous 2-3 blocks for better context)
        const precedingBlocks = allBlocks.slice(Math.max(0, currentIndex - 3), currentIndex);
        let precedingContext = "";

        precedingBlocks.forEach(block => {
          const text = extractTextFromBlock(block);
          if (text) {
            if (block.type === "heading") {
              const level = (block.props as { level?: number })?.level || 1;
              const headingPrefix = '#'.repeat(level);
              precedingContext += `${headingPrefix} ${text}\n`;
            } else {
              precedingContext += `${text} `;
            }
          }
        });

        // Check if cursor is on a heading
        if (currentBlock.type === "heading") {
          const judulText = extractTextFromBlock(currentBlock);

          if (judulText) {
            const level = (currentBlock.props as { level?: number })?.level || 1;
            return {
              targetJudul: {
                text: judulText,
                level: level,
                position: currentIndex,
                block: currentBlock
              },
              judulContent: "",
              insertPosition: currentIndex,
              isAtJudul: true,
              contextType: 'judul',
              currentText,
              precedingContext: precedingContext.trim()
            };
          }
        }

        // Check if cursor is in a list item
        if (currentBlock.type === "bulletListItem" || currentBlock.type === "numberedListItem") {
          // Find governing heading
          let governingJudul: JudulInfo | null = null;

          for (let i = currentIndex - 1; i >= 0; i--) {
            const block = allBlocks[i];
            if (block.type === "heading") {
              const judulText = extractTextFromBlock(block);
              if (judulText) {
                const level = (block.props as { level?: number })?.level || 1;
                governingJudul = {
                  text: judulText,
                  level: level,
                  position: i,
                  block: block
                };
                break;
              }
            }
          }

          return {
            targetJudul: governingJudul,
            judulContent: "",
            insertPosition: currentIndex,
            isAtJudul: false,
            contextType: 'list',
            currentText,
            precedingContext: precedingContext.trim()
          };
        }

        // ENHANCED: Check if cursor is in a regular paragraph
        if (currentBlock.type === "paragraph") {
          // Find governing heading
          let governingJudul: JudulInfo | null = null;
          let headingContent = "";
          let isDirectlyUnderJudul = false;

          // Check if this paragraph is DIRECTLY under a judul (no other paragraphs in between)
          if (currentIndex > 0 && allBlocks[currentIndex - 1].type === "heading") {
            isDirectlyUnderJudul = true;
          }

          for (let i = currentIndex - 1; i >= 0; i--) {
            const block = allBlocks[i];
            if (block.type === "heading") {
              const judulText = extractTextFromBlock(block);
              if (judulText) {
                const level = (block.props as { level?: number })?.level || 1;
                governingJudul = {
                  text: judulText,
                  level: level,
                  position: i,
                  block: block
                };

                // Collect content under this judul (but skip current block to avoid duplication)
                for (let j = i + 1; j < currentIndex; j++) {
                  const contentBlock = allBlocks[j];
                  const contentText = extractTextFromBlock(contentBlock);
                  if (contentText) {
                    headingContent += `${contentText} `;
                  }
                }
                break;
              }
            }
          }

          // FIXED: If paragraph has content and is not empty, treat as regular paragraph continuation
          // regardless of whether it's under a judul or not
          if (currentText && currentText.trim().length > 0) {
            return {
              targetJudul: governingJudul,
              judulContent: headingContent.trim(),
              insertPosition: currentIndex,
              isAtJudul: false,
              contextType: 'paragraph', // Always treat as paragraph if it has content
              currentText,
              precedingContext: precedingContext.trim()
            };
          } else {
            // Only treat as 'under_heading' if paragraph is empty and directly under heading
            return {
              targetJudul: governingJudul,
              judulContent: headingContent.trim(),
              insertPosition: currentIndex,
              isAtJudul: false,
              contextType: isDirectlyUnderJudul ? 'under_judul' : 'paragraph',
              currentText,
              precedingContext: precedingContext.trim()
            };
          }
        }

        // General case
        return {
          targetJudul: null,
          judulContent: "",
          insertPosition: currentIndex,
          isAtJudul: false,
          contextType: 'general',
          currentText,
          precedingContext: precedingContext.trim()
        };
      } catch (error) {
        console.error("Error analyzing cursor context:", error);
        return null;
      }
    };

    // Handle inline AI actions with streaming animation
    const handleInlineAIAction = async (action: string) => {
      const cursorPosition = editor.getTextCursorPosition();
      const currentBlock = cursorPosition?.block;

      if (!aiModel || !currentBlock) {
        notifications.show({
          title: 'AI Tidak Tersedia',
          message: 'Model AI atau blok saat ini tidak tersedia.',
          color: 'red',
          icon: <IconX size={18} />,
        });
        return;
      }


      // Hide popup and start streaming
      setInlineAIState(prev => ({ ...prev, isVisible: false }));
      setContinueState(prev => ({ ...prev, isVisible: false }));

      // Setup streaming state - ENHANCED for all block types
      let targetBlock = currentBlock;
      let originalText = "";

      // Different handling based on block type
      if (currentBlock.type === "heading") {
        // For judul, original text is empty since we'll create new content below
        originalText = "";
      } else if (currentBlock.type === "paragraph" ||
        currentBlock.type === "bulletListItem" ||
        currentBlock.type === "numberedListItem" ||
        currentBlock.type === "checkListItem") {
        // For text-based blocks, get the current text to continue from
        originalText = extractTextFromBlock(currentBlock);
      } else {
        // For other block types, treat as empty and create new content
        originalText = "";
      }

      setAIStreamingState({
        isStreaming: true,
        streamedText: "",
        currentBlock: targetBlock, // This will be updated in typeText if it's a heading
        originalText: originalText,
        showControls: false,
        position: { x: 0, y: 0 },
        progress: 0,
        totalChunks: 0,
        currentChunk: 0,
      });

      try {
        let systemPrompt = "";
        const maxTokens = 300; // Increased for longer continuation

        switch (action) {
          case "continue":
            const cursorContext = analyzeCurrentCursorContext();

            if (!cursorContext) {
              systemPrompt = `Lanjutkan penulisan dengan konten yang natural dan relevan.

INSTRUKSI:
- Tulis 1-2 kalimat yang mengalir dengan baik
- Gunakan bahasa Indonesia yang natural
- Berikan informasi yang valuable`;
              break;
            }

            const { contextType, currentText, precedingContext, targetJudul } = cursorContext;

            // Generate different prompts based on context type
            switch (contextType) {
              case 'judul':
                if (targetJudul) {
                  systemPrompt = `Tulis konten untuk heading berikut. HANYA tulis isi konten paragraf, JANGAN tulis ulang headingnya.

JUDUL TARGET: ${targetJudul.text} (Level ${targetJudul.level})

INSTRUKSI:
- Tulis 3-5 kalimat konten yang relevan dan detail untuk heading tersebut
- Jangan tulis ulang judul/heading
- Mulai langsung dengan konten paragraf
- Gunakan bahasa Indonesia yang natural dan informatif
- Berikan penjelasan yang comprehensive dan mendalam
- Sesuaikan kedalaman konten dengan level judul

TUGAS: Tulis konten detail untuk judul "${targetJudul.text}"`;
                }
                break;

              case 'under_judul':
                // This case is now only for EMPTY paragraphs directly under judul
                if (targetJudul) {
                  systemPrompt = `Tulis konten untuk judul berikut yang masih kosong:

JUDUL: ${targetJudul.text} (Level ${targetJudul.level})

KONTEKS DOKUMEN:
${precedingContext}

INSTRUKSI:
- Ini adalah paragraf kosong pertama di bawah judul "${targetJudul.text}"
- Tulis 3-5 kalimat konten yang relevan dan detail untuk judul tersebut
- Mulai langsung dengan konten paragraf yang informatif dan comprehensive
- Gunakan bahasa Indonesia yang natural dan professional
- Berikan penjelasan yang mendalam dan valuable
- Sesuaikan kedalaman konten dengan level judul

TUGAS: Buat konten pembuka untuk "${targetJudul.text}"`;
                }
                break;

              case 'paragraph':
              case 'list':
                // ENHANCED: This handles ALL non-empty paragraphs/lists (including those under judul)
                let blockTypeDescription = "";
                if (currentBlock.type === "bulletListItem") {
                  blockTypeDescription = "item list bullet";
                } else if (currentBlock.type === "numberedListItem") {
                  blockTypeDescription = "item list bernomor";
                } else if (currentBlock.type === "checkListItem") {
                  blockTypeDescription = "item checklist";
                } else {
                  blockTypeDescription = "paragraf";
                }

                systemPrompt = `Lanjutkan ${blockTypeDescription} yang sudah ada dari konteks berikut:

KONTEKS SEBELUMNYA:
${precedingContext}

TEKS SAAT INI (${blockTypeDescription}): ${currentText}

${targetJudul ? `JUDUL TERKAIT: ${targetJudul.text}` : ''}

INSTRUKSI KHUSUS:
- Lanjutkan langsung dari akhir teks saat ini: "${currentText}"
- JANGAN mengulang atau menulis ulang teks yang sudah ada
- Tulis 2-4 kalimat tambahan yang natural dan informatif
- Pertahankan kohesi dan koherensi dengan teks yang sudah ada
- Jaga konsistensi tone dan style penulisan
- Berikan kelanjutan yang logis, bermakna, dan comprehensive
- Sesuaikan dengan format ${blockTypeDescription}
${targetJudul ? `- Pastikan relevan dengan judul "${targetJudul.text}"` : ''}

TUGAS: Lanjutkan ${blockTypeDescription} dengan natural mengikuti alur yang sudah ada`;
                break;

              default:
                systemPrompt = `Lanjutkan tulisan dari konteks berikut:

KONTEKS SEBELUMNYA:
${precedingContext}

TEKS SAAT INI: ${currentText}

INSTRUKSI:
- Lanjutkan langsung dari akhir teks saat ini
- Tulis 1-2 kalimat tambahan yang natural
- Jaga konsistensi tone dan alur penulisan

TUGAS: Lanjutkan tulisan mengikuti konteks dan alur yang sudah ada`;
            }
            break;

          case "summarize":
            const editorBlocks = editor.document;
            let contextContent = "";

            editorBlocks.forEach(block => {
              const text = extractTextFromBlock(block);
              if (text) {
                if (block.type === "heading") {
                  const level = (block.props as { level?: number })?.level || 1;
                  const headingPrefix = '#'.repeat(level);
                  contextContent += `\n${headingPrefix} ${text}\n`;
                } else {
                  contextContent += `${text}\n`;
                }
              }
            });

            systemPrompt = `Buat ringkasan dari konten berikut:

${contextContent}

INSTRUKSI:
- Buat ringkasan dalam 2-3 kalimat
- Tangkap poin-poin utama
- Gunakan bahasa yang jelas dan ringkas`;
            break;

          case "write_anything":
            // Get current context for write anything
            const writeContext = analyzeCurrentCursorContext();
            const contextForWrite = writeContext ? writeContext.precedingContext : extractContextFromCursor();
            const currentForWrite = writeContext ? writeContext.currentText : extractTextFromBlock(currentBlock);
            
            // Use same logic as continue but with open-ended prompt
            systemPrompt = `Lanjutkan penulisan dengan konten yang kreatif dan menarik.

KONTEKS SEBELUMNYA:
${contextForWrite}

TEKS SAAT INI: ${currentForWrite}

INSTRUKSI:
- Lanjutkan langsung dari teks yang sudah ada (jika ada)
- Tulis 2-5 kalimat yang natural, engaging, dan informatif
- Gunakan bahasa Indonesia yang ekspresif dan comprehensive
- Berikan informasi yang valuable, menarik, dan mendalam
- Jaga konsistensi tone dengan teks sebelumnya
- Berikan penjelasan yang detail dan substantif

TUGAS: Lanjutkan tulisan dengan kreatif dan natural`;
            break;

          default:
            setAIStreamingState({
              isStreaming: false,
              streamedText: "",
              currentBlock: null,
              originalText: "",
              showControls: false,
              position: { x: 0, y: 0 },
              progress: 0,
              totalChunks: 0,
              currentChunk: 0,
            });
            return;
        }

        let text = '';
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount <= maxRetries) {
          try {
            // const result = await generateText({
            //   model: aiModel,
            //   prompt: systemPrompt,
            //   maxTokens,
            //   temperature: 0.7,
            //   presencePenalty: 0.2,
            //   frequencyPenalty: 0.1,
            // });
            // text = result.text;
            const text1 = await callMCPAPI(systemPrompt, maxTokens);
            text = removeDaftarPustakaSection(text1!);
            break; // Success, exit retry loop
          } catch (aiError: any) {
            retryCount++;
            console.error(`AI generation attempt ${retryCount} failed:`, aiError);

            if (retryCount > maxRetries) {
              // All retries exhausted, handle the error
              if (aiError.message?.includes('overloaded') || aiError.message?.includes('rate limit')) {
                notifications.show({
                  title: '🤖 AI Server Sibuk',
                  message: 'Server AI sedang overload setelah beberapa percobaan. Silakan tunggu 1-2 menit dan coba lagi.',
                  color: 'orange',
                  icon: <IconAlertTriangle size={18} />,
                  autoClose: 7000,
                });
              } else if (aiError.message?.includes('quota') || aiError.message?.includes('credit')) {
                notifications.show({
                  title: '💳 Quota AI Habis',
                  message: 'Quota AI sudah habis. Silakan hubungi admin atau coba lagi nanti.',
                  color: 'red',
                  icon: <IconX size={18} />,
                  autoClose: 7000,
                });
              } else {
                notifications.show({
                  title: '⚠️ AI Error',
                  message: `AI mengalami kendala setelah ${maxRetries} percobaan: ${aiError.message || 'Unknown error'}`,
                  color: 'red',
                  icon: <IconX size={18} />,
                  autoClose: 5000,
                });
              }

              setAIStreamingState({
                isStreaming: false,
                streamedText: "",
                currentBlock: null,
                originalText: "",
                showControls: false,
                position: { x: 0, y: 0 },
                progress: 0,
                totalChunks: 0,
                currentChunk: 0,
              });
              return;
            } else {
              // Wait before retry with exponential backoff
              const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
              console.log(`Retrying in ${waitTime}ms...`);

              notifications.show({
                title: `🔄 Percobaan ${retryCount}/${maxRetries}`,
                message: `AI sibuk, mencoba lagi dalam ${waitTime/1000} detik...`,
                color: 'blue',
                autoClose: waitTime - 500,
              });

              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }

        if (text && text.trim()) {
          // Start typing animation - now handles all block types properly
          await typeText(text.trim(), targetBlock);
        } else {
          notifications.show({
            title: 'AI Tidak Menghasilkan Konten',
            message: 'AI tidak memberikan respons. Silakan coba lagi dengan prompt yang berbeda.',
            color: 'yellow',
            icon: <IconAlertTriangle size={18} />,
          });
          setAIStreamingState({
            isStreaming: false,
            streamedText: "",
            currentBlock: null,
            originalText: "",
            showControls: false,
            position: { x: 0, y: 0 },
            progress: 0,
            totalChunks: 0,
            currentChunk: 0,
          });
        }

      } catch (error: any) {
        console.error("Inline AI action failed:", error);

        // Only show generic error if we haven't already handled AI-specific errors
        if (!error.message?.includes('overloaded') && !error.message?.includes('quota')) {
          notifications.show({
            title: 'Gagal Menggunakan AI',
            message: 'Terjadi kesalahan saat mencoba menggunakan fitur AI. Silakan coba lagi.',
            color: 'red',
            icon: <IconX size={18} />,
          });
        }
        setAIStreamingState({
          isStreaming: false,
          streamedText: "",
          currentBlock: null,
          originalText: "",
          showControls: false,
          position: { x: 0, y: 0 },
          progress: 0,
          totalChunks: 0,
          currentChunk: 0,
        });
      }
    };

    // FIXED: Handle selection change with better positioning logic
    const handleSelectionChange = useCallback(() => {
      try {
        // Use setTimeout to debounce and prevent conflicts with other UI events
        setTimeout(() => {
          const cursorPosition = editor.getTextCursorPosition();
          if (!cursorPosition) {
            setContinueState(prev => ({ ...prev, isVisible: false }));
            setInlineAIState(prev => ({ ...prev, isVisible: false }));
            return;
          }

          const currentBlock = cursorPosition.block;

          if (shouldShowContinueButton(currentBlock)) {
            // FIXED: Get more accurate cursor position
            try {
              // Get the current block element in the DOM
              const blockElement = document.querySelector(`[data-id="${currentBlock.id}"]`);

              if (blockElement) {
                const rect = blockElement.getBoundingClientRect();
                const contextText = extractContextFromCursor();

                // Position the button BELOW the text block (like in the image)
                const selection = window.getSelection();
                let buttonX = rect.left; // Start from left edge of block
                let buttonY = rect.bottom + 8; // 8px below the block
                
                // Try to get more precise cursor position for horizontal alignment
                if (selection && selection.rangeCount > 0) {
                  try {
                    const range = selection.getRangeAt(0);
                    const rangeRect = range.getBoundingClientRect();
                    
                    if (rangeRect.width > 0 || rangeRect.height > 0) {
                      // Align button horizontally with cursor position
                      buttonX = rangeRect.left; // Align with cursor
                      buttonY = rect.bottom + 8; // Still below the block
                    }
                  } catch (e) {
                    console.log('Could not get selection range rect, using block position');
                  }
                }

                // Make sure button stays within viewport
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                const finalX = Math.max(10, Math.min(buttonX, viewportWidth - 200)); // Keep within viewport width
                const finalY = Math.min(buttonY, viewportHeight - 80); // Keep within viewport height

                setContinueState({
                  isVisible: true,
                  position: {
                    x: finalX,
                    y: finalY
                  },
                  currentBlock,
                  contextText
                });

                setInlineAIState(prev => ({
                  ...prev,
                  currentBlock,
                  isVisible: false
                }));
              } else {
                // Fallback: Try to get editor container position
                const editorContainer = document.querySelector('.bn-editor') ||
                  document.querySelector('[role="textbox"]') ||
                  document.querySelector('.ProseMirror');

                if (editorContainer) {
                  const rect = editorContainer.getBoundingClientRect();
                  const contextText = extractContextFromCursor();

                  setContinueState({
                    isVisible: true,
                    position: {
                      x: rect.left, // Align with left edge of block
                      y: rect.bottom + 8 // Below the block
                    },
                    currentBlock,
                    contextText
                  });

                  setInlineAIState(prev => ({
                    ...prev,
                    currentBlock,
                    isVisible: false
                  }));
                } else {
                  // Last fallback: Use fixed position
                  setContinueState({
                    isVisible: true,
                    position: {
                      x: window.innerWidth - 100,
                      y: 100
                    },
                    currentBlock,
                    contextText: extractContextFromCursor()
                  });
                }
              }
            } catch (positionError) {
              console.warn("Could not get cursor position for continue button:", positionError);
              setContinueState(prev => ({ ...prev, isVisible: false }));
            }
          } else {
            setContinueState(prev => ({ ...prev, isVisible: false }));
            setInlineAIState(prev => ({ ...prev, isVisible: false }));
          }
        }, 200); // Increased delay for better stability
      } catch (error) {
        console.error("Error handling selection change:", error);
        setContinueState(prev => ({ ...prev, isVisible: false }));
        setInlineAIState(prev => ({ ...prev, isVisible: false }));
      }
    }, [editor, shouldShowContinueButton, extractContextFromCursor]);

    // Setup selection change listener with proper cleanup and debouncing
    React.useEffect(() => {
      let timeoutId: NodeJS.Timeout;
      let unsubscribe: (() => void) | undefined;
      let isUpdating = false;

      const debouncedHandler = () => {
        if (isUpdating) return; // Prevent multiple simultaneous updates

        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          isUpdating = true;
          try {
            handleSelectionChange();
          } finally {
            isUpdating = false;
          }
        }, 150);
      };

      try {
        unsubscribe = editor.onChange?.(debouncedHandler);
      } catch (error) {
        console.error("Error setting up editor change listener:", error);
      }

      // Also listen to selection changes in the document
      const selectionHandler = () => {
        if (isUpdating) return;

        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          isUpdating = true;
          try {
            handleSelectionChange();
          } finally {
            isUpdating = false;
          }
        }, 150);
      };

      // Listen to various events that might change cursor position
      document.addEventListener('selectionchange', selectionHandler);
      document.addEventListener('click', selectionHandler);
      document.addEventListener('keyup', selectionHandler);
      window.addEventListener('resize', () => {
        // Hide button on resize to prevent positioning issues
        setContinueState(prev => ({ ...prev, isVisible: false }));
      });

      return () => {
        clearTimeout(timeoutId);
        if (unsubscribe) {
          unsubscribe();
        }
        document.removeEventListener('selectionchange', selectionHandler);
        document.removeEventListener('click', selectionHandler);
        document.removeEventListener('keyup', selectionHandler);
        window.removeEventListener('resize', () => { });
      };
    }, [editor, handleSelectionChange]);

    // Mock AI Response for testing when API key not available
    const generateMockAIResponse = async (prompt: string, type: string = "structure"): Promise<string> => {
      // Shorter delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Simplified context processing for mock responses
      let contextContent = "";
      let existingJudul: string[] = [];
      
      try {
        const editorBlocks = editor.document || [];
        // Limit processing to avoid hangs
        const limitedBlocks = editorBlocks.slice(0, 20);
        
        limitedBlocks.forEach(block => {
          try {
            const text = extractTextFromBlock(block);
            if (text && text.length < 500) { // Limit text length
              if (block.type === "heading") {
                const level = (block.props as { level?: number })?.level || 1;
                const headingPrefix = '#'.repeat(Math.min(level, 4));
                contextContent += `\n${headingPrefix} ${text}\n`;
                existingJudul.push(text.trim());
              } else {
                contextContent += `${text.substring(0, 200)}\n`; // Limit content length
              }
            }
          } catch (blockError) {
            console.warn("Block processing error:", blockError);
          }
        });
      } catch (contextError) {
        console.warn("Context processing error:", contextError);
        contextContent = "";
        existingJudul = [];
      }
      
      const mockResponses = {
        structure: `# ${prompt}

## Pendahuluan

## Pembahasan Utama

### Sub-bab 1: Konsep Dasar

### Sub-bab 2: Implementasi Praktis

### Sub-bab 3: Tantangan dan Solusi

### Sub-bab 4: Best Practices dan Guidelines

## Case Studies dan Real-world Examples

### Case Study 1: Enterprise Implementation

### Case Study 2: Startup Success Story

## Future Trends dan Predictions

### Emerging Technologies

### Market Trends

## Tools dan Resources

### Development Tools

### Learning Resources

## Kesimpulan

### Key Takeaways

### Recommendations untuk Next Steps`,

        content: contextContent ? 
          // If there's existing content, generate content for empty headings
          (() => {
            const emptyJudul = existingJudul.filter(heading => {
              // Check if heading has content after it
              const headingRegex = new RegExp(`#{1,6}\\s+${heading}\\s*$`, 'm');
              const headingIndex = contextContent.search(headingRegex);
              if (headingIndex === -1) return false;
              
              const afterHeading = contextContent.substring(headingIndex + heading.length);
              const nextHeadingIndex = afterHeading.search(/\n#{1,6}\s+/);
              const sectionContent = nextHeadingIndex > -1 ? 
                afterHeading.substring(0, nextHeadingIndex) : afterHeading;
              
              return sectionContent.trim().length < 50; // Less than 50 chars = empty
            });
            
            if (emptyJudul.length > 0) {
              // Generate content for the first empty heading
              const targetJudul = emptyJudul[0];
              return `Berdasarkan struktur yang sudah ada, berikut adalah konten untuk "${targetJudul}":

${targetJudul.toLowerCase().includes('pendahuluan') ? `
Dalam era digital yang berkembang pesat, ${prompt} telah menjadi salah satu topik yang sangat relevan dan penting untuk dipahami. Konsep ${prompt} tidak hanya mencakup aspek teknis, tetapi juga melibatkan berbagai dimensi sosial, ekonomi, dan budaya yang saling berinteraksi.

Pentingnya memahami ${prompt} dalam konteks modern tidak dapat diabaikan. Dengan kemajuan teknologi yang terus berlangsung, ${prompt} telah mengalami transformasi signifikan yang mempengaruhi cara kita bekerja, belajar, dan berinteraksi dengan dunia sekitar.

Artikel ini akan memberikan panduan komprehensif tentang ${prompt}, mulai dari konsep dasar hingga implementasi praktis yang dapat diterapkan dalam kehidupan sehari-hari.` :

targetJudul.toLowerCase().includes('konsep') ? `
${prompt} secara fundamental dapat didefinisikan sebagai sebuah paradigma yang mengintegrasikan berbagai elemen teknologi, metodologi, dan praktik terbaik. Untuk memahami ${prompt} secara menyeluruh, kita perlu mempelajari beberapa komponen utama.

**Definisi dan Terminologi**
${prompt} encompass berbagai aspek yang saling berkaitan. Terminologi yang digunakan dalam ${prompt} telah berkembang seiring dengan evolusi teknologi dan kebutuhan industri.

**Prinsip-prinsip Fundamental**
Terdapat beberapa prinsip dasar yang menjadi landasan ${prompt}:
- Skalabilitas dan fleksibilitas sistem
- Efisiensi dalam penggunaan sumber daya
- Keamanan dan reliability
- User experience yang optimal` :

targetJudul.toLowerCase().includes('implementasi') ? `
Implementasi ${prompt} dalam praktik sehari-hari memerlukan pendekatan yang sistematis dan terstruktur. Berikut adalah panduan langkah demi langkah yang dapat diikuti.

**Phase 1: Perencanaan dan Analisis**
Sebelum mengimplementasikan ${prompt}, penting untuk melakukan analisis mendalam terhadap kebutuhan, resources yang tersedia, dan objectives yang ingin dicapai. Phase ini meliputi assessment infrastruktur existing, identifikasi gap dan requirements, serta risk analysis dan mitigation planning.

**Phase 2: Development dan Testing**
Tahap development merupakan fase eksekusi dari design yang telah dibuat. Proses ini melibatkan coding dan development berdasarkan best practices, testing yang comprehensive, dan quality assurance yang ketat.` :

targetJudul.toLowerCase().includes('tantangan') ? `
Implementasi ${prompt} tidak terlepas dari berbagai tantangan yang perlu diantisipasi dan diatasi. Tantangan-tantangan ini dapat dibagi menjadi beberapa kategori utama.

**Tantangan Teknis**
Scalability issues merupakan salah satu tantangan utama, dimana system bottlenecks dapat terjadi saat load tinggi. Solusinya adalah implementasi microservices architecture dan horizontal scaling dengan tools seperti container orchestration dengan Kubernetes.

**Tantangan Organisational** 
Change management menjadi tantangan tersendiri karena adanya resistance terhadap perubahan dari team. Solusi yang efektif adalah comprehensive training program dan gradual transition dengan pendekatan agile methodology.` :

targetJudul.toLowerCase().includes('kesimpulan') ? `
${prompt} represents a paradigm shift dalam cara kita approach technology solutions. Successful implementation requires careful planning, systematic execution, dan continuous improvement mindset.

Key takeaways dari pembahasan ini mencakup understanding fundamental concepts yang crucial untuk success, practical implementation yang memerlukan structured approach, dan challenges yang dapat diatasi dengan proper planning dan execution.

Melihat ke depan, ${prompt} akan terus berkembang dan memberikan opportunities baru untuk innovation dan growth. Organizations yang dapat effectively leverage ${prompt} akan memiliki competitive advantage yang significant.` :

`Berdasarkan konteks "${targetJudul}" dalam topik ${prompt}, berikut adalah pembahasan yang mendalam:

Aspek ini memiliki peran penting dalam keseluruhan pemahaman tentang ${prompt}. Untuk mengimplementasikan dengan sukses, diperlukan pendekatan yang sistematis dan pemahaman yang mendalam tentang berbagai faktor yang terlibat.

Dalam praktiknya, ${targetJudul.toLowerCase()} dapat diterapkan melalui berbagai metodologi yang telah terbukti efektif. Best practices menunjukkan bahwa kombinasi antara teori dan praktik memberikan hasil yang optimal.

Key considerations yang perlu diperhatikan meliputi aspek teknis, organisational, dan strategic yang saling berinteraksi untuk mencapai objectives yang diinginkan.`
}`;
            } else {
              return `Melanjutkan dari struktur yang sudah ada, berikut adalah pengembangan konten lebih lanjut:

Berdasarkan outline yang telah dibuat, setiap section dapat dikembangkan dengan konten yang lebih detail dan komprehensif. Hal ini akan memberikan value yang lebih besar kepada pembaca dan memastikan coverage yang menyeluruh terhadap topik ${prompt}.

Pengembangan konten ini dapat dilakukan secara bertahap, dimana setiap heading dapat diisi dengan informasi yang relevan, examples yang practical, dan insights yang valuable untuk audience yang ditargetkan.`;
            }
          })() : 
          // If no existing content, generate normal content response
          `Berdasarkan topik "${prompt}", berikut adalah pembahasan mendalam dan komprehensif:

## Overview dan Konteks

${prompt} merupakan topik yang sangat relevan dalam konteks saat ini dan memiliki impact yang signifikan terhadap berbagai aspek kehidupan modern. Pentingnya memahami ${prompt} tidak dapat diabaikan karena dampaknya yang far-reaching terhadap industri, society, dan individual development.

## Historical Background

Dalam konteks historis, ${prompt} telah mengalami evolusi yang remarkable sejak pertama kali diperkenalkan. Evolution ini dapat dibagi menjadi beberapa phases:

**Phase 1: Early Development**
Pada tahap awal, ${prompt} masih dalam bentuk yang rudimentary dan limited scope. Namun, foundation yang dibangun pada phase ini menjadi cornerstone untuk development selanjutnya.

**Phase 2: Rapid Growth**
Era pertumbuhan cepat ditandai dengan adoption yang widespread dan innovation yang accelerated. Period ini melihat emergence berbagai tools, technologies, dan methodologies yang supporting ${prompt}.

**Phase 3: Maturation**
Phase maturation brought standardization, best practices, dan comprehensive frameworks yang memungkinkan scalable implementation dari ${prompt}.

**Phase 4: Modern Era**
Era modern characterized by integration dengan emerging technologies seperti AI, cloud computing, dan IoT, membuat ${prompt} menjadi lebih powerful dan versatile.

## Technical Deep Dive

### Core Components

${prompt} consists of several core components yang bekerja secara synergistic:

1. **Infrastructure Layer**
   - Hardware requirements dan specifications
   - Network topology dan connectivity
   - Storage systems dan data management
   - Security infrastructure dan protocols

2. **Platform Layer**
   - Operating systems dan middleware
   - Runtime environments dan containers
   - Service mesh dan orchestration
   - Monitoring dan logging systems

3. **Application Layer**
   - Business logic implementation
   - User interface dan experience
   - API design dan integration
   - Data processing dan analytics

4. **Integration Layer**
   - Third-party service connections
   - Legacy system interfaces
   - External API management
   - Data synchronization mechanisms

### Architecture Patterns

Several architecture patterns commonly used dalam ${prompt} implementation:

**Microservices Architecture**
- Decomposition of monolithic applications
- Independent deployment dan scaling
- Technology diversity dan flexibility
- Fault isolation dan resilience

**Event-Driven Architecture**
- Asynchronous communication patterns
- Loose coupling between components
- Scalability dan responsiveness
- Real-time processing capabilities

**Serverless Architecture**
- Function-as-a-Service paradigm
- Auto-scaling dan cost optimization
- Reduced operational overhead
- Event-triggered execution model

## Implementation Strategies

### Planning Phase

Successful implementation dari ${prompt} requires thorough planning:

**Requirements Analysis**
- Functional requirements identification
- Non-functional requirements specification
- Constraint analysis dan limitations
- Success criteria definition

**Resource Assessment**
- Human resource availability
- Technical infrastructure readiness
- Budget allocation dan cost estimation
- Timeline planning dan milestones

**Risk Management**
- Risk identification dan assessment
- Mitigation strategies development
- Contingency planning
- Monitoring dan review processes

### Execution Phase

**Development Methodology**
- Agile development practices
- DevOps integration
- Continuous integration/deployment
- Quality assurance processes

**Testing Strategy**
- Unit testing implementation
- Integration testing procedures
- Performance testing scenarios
- Security testing protocols

**Deployment Approach**
- Environment preparation
- Rollout strategy planning
- Monitoring setup
- Rollback procedures

## Industry Applications

### Sector-Specific Implementations

**Financial Services**
${prompt} dalam financial services focuses pada security, compliance, dan real-time processing. Key applications include:
- Payment processing systems
- Risk management platforms
- Regulatory compliance tools
- Customer analytics solutions

**Healthcare Industry**
Healthcare implementations emphasize privacy, accuracy, dan interoperability:
- Electronic health records
- Telemedicine platforms
- Medical imaging systems
- Clinical decision support

**E-commerce Platforms**
E-commerce applications prioritize scalability, user experience, dan performance:
- Product catalog management
- Order processing systems
- Recommendation engines
- Supply chain optimization

**Manufacturing Sector**
Manufacturing focuses pada automation, efficiency, dan quality control:
- Production line monitoring
- Quality assurance systems
- Supply chain management
- Predictive maintenance

## Advanced Topics

### Performance Optimization

**Caching Strategies**
- In-memory caching solutions
- Distributed caching systems
- Cache invalidation policies
- Performance impact analysis

**Database Optimization**
- Query optimization techniques
- Index strategy planning
- Data partitioning approaches
- Replication dan sharding

**Network Optimization**
- Content delivery networks
- Load balancing strategies
- Protocol optimization
- Bandwidth management

### Security Considerations

**Authentication dan Authorization**
- Multi-factor authentication
- Role-based access control
- OAuth dan OpenID implementations
- Session management

**Data Protection**
- Encryption at rest dan in transit
- Data masking dan anonymization
- Backup dan recovery procedures
- Compliance requirements

**Threat Management**
- Vulnerability assessment
- Penetration testing
- Incident response planning
- Security monitoring

## Emerging Trends

### Technology Integration

**Artificial Intelligence**
- Machine learning algorithms
- Natural language processing
- Computer vision applications
- Predictive analytics

**Internet of Things**
- Sensor data collection
- Real-time monitoring
- Edge computing integration
- Device management platforms

**Blockchain Technology**
- Distributed ledger systems
- Smart contract implementation
- Cryptocurrency integration
- Supply chain transparency

### Market Evolution

**Industry 4.0**
- Smart manufacturing
- Industrial IoT
- Cyber-physical systems
- Digital twins

**Digital Transformation**
- Legacy system modernization
- Cloud migration strategies
- Process automation
- Data-driven decision making

## Challenges dan Solutions

### Technical Challenges

**Scalability Issues**
Problem: System performance degradation dengan increased load
Solution: Horizontal scaling dengan microservices architecture
Implementation: Container orchestration dengan Kubernetes

**Data Management**
Problem: Handling large volumes of diverse data
Solution: Big data technologies dan data lakes
Tools: Apache Hadoop, Spark, dan NoSQL databases

**Integration Complexity**
Problem: Connecting diverse systems dan technologies
Solution: API-first approach dengan comprehensive documentation
Standards: REST, GraphQL, dan message queuing systems

### Business Challenges

**Change Management**
Problem: Organizational resistance to new technologies
Solution: Comprehensive training dan gradual transition
Approach: Change champions dan success story sharing

**Cost Management**
Problem: Budget constraints dan ROI concerns
Solution: Phased implementation dengan clear metrics
Strategy: Proof of concept before full deployment

**Skills Gap**
Problem: Lack of technical expertise
Solution: Training programs dan strategic partnerships
Investment: Certification programs dan knowledge transfer

## Best Practices

### Development Practices

**Code Quality**
- Coding standards enforcement
- Code review processes
- Automated testing integration
- Documentation requirements

**Version Control**
- Git workflow implementation
- Branch management strategies
- Release management procedures
- Collaboration guidelines

**DevOps Integration**
- Continuous integration setup
- Automated deployment pipelines
- Infrastructure as code
- Monitoring dan alerting

### Operational Practices

**Monitoring dan Observability**
- Application performance monitoring
- Infrastructure monitoring
- Log aggregation dan analysis
- Distributed tracing

**Incident Management**
- Incident response procedures
- Post-mortem analysis
- Root cause identification
- Prevention strategies

**Capacity Planning**
- Resource utilization monitoring
- Growth projection analysis
- Scaling strategy planning
- Cost optimization

## Future Outlook

### Technology Roadmap

**Short-term (1-2 years)**
- Enhanced automation capabilities
- Improved user experiences
- Better integration tools
- Advanced analytics features

**Medium-term (3-5 years)**
- AI-powered automation
- Edge computing adoption
- Quantum computing exploration
- Advanced security measures

**Long-term (5+ years)**
- Autonomous systems
- Quantum-classical hybrid solutions
- Neuromorphic computing
- Advanced human-computer interfaces

### Market Predictions

The future of ${prompt} looks promising dengan several key trends:
- Increased adoption across industries
- Greater focus pada sustainability
- Enhanced user-centric design
- Improved accessibility dan inclusivity

## Conclusion

${prompt} represents a fundamental shift dalam how we approach modern challenges. Success requires comprehensive understanding, careful planning, dan continuous adaptation to changing technologies dan market conditions.

Key success factors include:
1. Strong leadership commitment
2. Skilled team development
3. Robust technical infrastructure
4. Effective change management
5. Continuous learning culture

Moving forward, organizations yang successfully leverage ${prompt} akan have significant competitive advantages dan will be better positioned untuk future growth dan innovation.`,

        sentence: contextContent ? 
          // If there's existing content, continue from the last sentence
          (() => {
            const lastParagraph = contextContent.trim().split('\n').filter(line => 
              !line.startsWith('#') && line.trim().length > 20
            ).slice(-1)[0] || '';
            
            if (lastParagraph) {
              // Generate continuation based on the last sentence
              if (lastParagraph.includes('implementasi') || lastParagraph.includes('penerapan')) {
                return `Selanjutnya, aspek praktis dari implementasi ini memerlukan perhatian khusus terhadap berbagai faktor pendukung. Koordinasi antar tim, alokasi sumber daya yang tepat, dan timeline yang realistis menjadi kunci keberhasilan dalam mencapai objectives yang telah ditetapkan.`;
              } else if (lastParagraph.includes('teknologi') || lastParagraph.includes('digital')) {
                return `Perkembangan teknologi yang rapid ini juga membawa implications yang significant terhadap cara kita approach problem-solving dan decision-making processes. Integration dengan existing systems memerlukan careful planning dan comprehensive testing untuk memastikan compatibility dan optimal performance.`;
              } else if (lastParagraph.includes('analisis') || lastParagraph.includes('penelitian')) {
                return `Hasil analisis ini memberikan insights yang valuable untuk pengembangan strategies yang lebih effective. Data-driven approach memungkinkan organizations untuk membuat decisions yang lebih informed dan mengoptimalkan resource allocation untuk maximum impact.`;
              } else if (lastParagraph.includes('kesimpulan') || lastParagraph.includes('hasil')) {
                return `Implications dari findings ini extend beyond immediate applications untuk include long-term strategic considerations. Organizations yang proactively embrace these insights akan better positioned untuk navigate challenges dan capitalize opportunities di masa depan.`;
              } else {
                return `Melanjutkan dari pembahasan sebelumnya, dapat ditambahkan bahwa aspek ini memiliki interconnections yang complex dengan berbagai elements lainnya dalam ecosystem. Understanding terhadap relationships ini essential untuk developing comprehensive solutions yang sustainable dan scalable.`;
              }
            } else {
              return `Melanjutkan dari konteks "${prompt}", dapat dijelaskan bahwa topik ini memiliki relevansi tinggi dalam diskusi saat ini. Development yang ongoing menunjukkan adanya opportunities yang significant untuk further exploration dan practical implementation.`;
            }
          })() :
          // If no existing content, generate normal sentence continuation
          `Melanjutkan dari konteks "${prompt}", dapat dijelaskan bahwa topik ini memiliki relevansi tinggi dalam diskusi akademik saat ini. Perkembangan terkini menunjukkan adanya tren positif yang mendukung eksplorasi lebih lanjut dalam area ini.

Dalam perspective yang lebih luas, ${prompt} telah menjadi focal point berbagai research initiatives dan industry developments. Evidence menunjukkan bahwa understanding yang mendalam tentang ${prompt} essential untuk professional growth dan organizational success.`
      };

      return mockResponses[type as keyof typeof mockResponses] || mockResponses.content;
    };

    // AI Generation function - Updated with behavior parameter
    const generateAIContent = async (prompt: string, type: string = "structure") => {

    //   if (!aiModel) {
    //     console.log("⚠️ AI Model not available, using mock response for testing");
    //     // Silently fallback to mock response - no notification needed
    //     try {
    //       const mockResponse = await generateMockAIResponse(prompt, type);
    //       console.log("✅ Mock response generated successfully");
    //       return mockResponse;
    //     } catch (error) {
    //       console.error("❌ Mock response failed:", error);
    //       return `# ${prompt}\n\n## Outline Sederhana\n\nKonten akan dihasilkan di sini.`;
    //     }
    //   }

      try {
        let systemPrompt = "";

        if (aiMode === "continue") {
          const editorBlocks = editor.document;
          let contextContent = "";

          editorBlocks.forEach(block => {
            const text = extractTextFromBlock(block);
            if (text) {
              if (block.type === "heading") {
                const level = (block.props as { level?: number })?.level || 1;
                const headingPrefix = '#'.repeat(level);
                contextContent += `\n${headingPrefix} ${text}\n`;
              } else {
                contextContent += `${text}\n`;
              }
            }
          });

          systemPrompt = `Anda adalah AI writer yang akan melanjutkan konten yang sudah ada di editor.

KONTEN YANG SUDAH ADA:
${contextContent}

TUGAS ANDA:
1. Analisis struktur dan konten yang sudah ada
2. Identifikasi heading/subheading yang masih kosong atau perlu dilengkapi
3. Lanjutkan dengan menulis konten yang natural dan coherent
4. Fokus pada heading yang belum memiliki konten atau konten yang masih singkat

INSTRUKSI PENULISAN:
- Tulis konten dalam format yang sama (gunakan # ## ### untuk heading)
- Setiap heading yang kosong atau singkat, isi dengan 2-3 paragraf detail
- Jaga konsistensi tone dan style dengan konten yang sudah ada
- Berikan informasi yang valuable dan mendalam
- Jangan mengulang informasi yang sudah ada

KONTEKS TAMBAHAN: ${prompt}`;
        } else {
          // Handle different behaviors based on type
          switch (type) {
            case "structure":
              // Rewrite behavior - creates complete structure
              systemPrompt = `Buat struktur outline lengkap untuk topik: ${prompt}

ATURAN STRUKTUR HEADING:
-- Gunakan # untuk judul utama (hanya 1)
-- Gunakan ## untuk bab-bab utama (level 2)
-- Gunakan ### untuk sub-bab (level 3)
-- Gunakan #### untuk detail bagian (level 4)

INSTRUKSI PENTING:
-- HANYA tulis heading dan subheading
-- JANGAN tulis konten paragraf apapun
-- TIDAK ada penjelasan atau deskripsi
-- Buat struktur yang komprehensif dan logis
-- Struktur ini akan mengganti semua konten yang ada

TUGAS:
Buat HANYA outline heading untuk "${prompt}" tanpa konten paragraf.`;
              break;

            case "content":
              // Content cursor behavior - adds content under current heading
              const contentEditorBlocks = editor.document;
              let contentContext = "";

              // Get current cursor position to understand context
              const cursorPosition = editor.getTextCursorPosition();
              let currentHeading = "";

              if (cursorPosition) {
                const allBlocks = editor.document;
                const currentIndex = allBlocks.findIndex(block => block.id === cursorPosition.block.id);

                // Find the governing heading by looking backwards
                for (let i = currentIndex; i >= 0; i--) {
                  const block = allBlocks[i];
                  if (block.type === "heading") {
                    currentHeading = extractTextFromBlock(block);
                    break;
                  }
                }
              }

              contentEditorBlocks.forEach(block => {
                const text = extractTextFromBlock(block);
                if (text) {
                  if (block.type === "heading") {
                    const level = (block.props as { level?: number })?.level || 1;
                    const headingPrefix = '#'.repeat(level);
                    contentContext += `\n${headingPrefix} ${text}\n`;
                  } else {
                    contentContext += `${text}\n`;
                  }
                }
              });

              systemPrompt = `Buat konten detail untuk heading yang sedang aktif di cursor:

STRUKTUR DOKUMEN SAAT INI:
${contentContext}

HEADING YANG SEDANG AKTIF: ${currentHeading || "Heading Utama"}
TOPIK KONTEN: ${prompt}

INSTRUKSI UNTUK KONTEN DI HEADING INI:
-- Fokus pada heading "${currentHeading || "Heading Utama"}" yang sedang aktif
-- Tulis konten detail dan informatif tentang "${prompt}" yang relevan dengan heading tersebut
-- Buat 2-4 paragraf konten yang mendalam
-- JANGAN tulis ulang heading atau struktur
-- HANYA tulis konten paragraf yang akan ditempatkan di bawah heading aktif
-- Pastikan konten sesuai dengan konteks dan level heading

TUGAS:
Buat konten detail tentang "${prompt}" untuk heading "${currentHeading || "Heading Utama"}".`;
              break;

            case "sentence":
              // Cursor behavior - continues from current position with more content
              const cursorBlocks = editor.document;
              let cursorContext = "";

              cursorBlocks.forEach(block => {
                const text = extractTextFromBlock(block);
                if (text) {
                  if (block.type === "heading") {
                    const level = (block.props as { level?: number })?.level || 1;
                    const headingPrefix = '#'.repeat(level);
                    cursorContext += `\n${headingPrefix} ${text}\n`;
                  } else {
                    cursorContext += `${text}\n`;
                  }
                }
              });

              systemPrompt = `Lanjutkan dan kembangkan tulisan dari posisi cursor dengan konteks berikut:

KONTEN YANG SUDAH ADA:
${cursorContext}

KONTEKS TAMBAHAN: ${prompt}

INSTRUKSI KHUSUS UNTUK MELANJUTKAN TULISAN:
-- Analisis paragraf atau kalimat terakhir di editor
-- Lanjutkan dengan alur pemikiran yang natural dan logis
-- Jaga konsistensi tone, style, dan topik dengan tulisan sebelumnya
-- Kembangkan ide yang sudah dimulai tanpa mengulang informasi
-- Tulis 2-4 paragraf tambahan yang substantial dan informatif
-- Berikan penjelasan yang mendalam dan detail
-- Pastikan konten yang dihasilkan cukup panjang dan bermakna
-- Konten akan ditambahkan di posisi cursor aktif

CATATAN PENTING: 
-- Jangan hanya melanjutkan 1-2 kalimat pendek
-- Buatlah konten yang cukup substansial (minimal 3-5 kalimat per paragraf)
-- Berikan value yang jelas dan informasi yang berguna

TUGAS: Lanjutkan dan kembangkan tulisan dengan substansi yang cukup tentang "${prompt}".`;
              break;

            default:
              systemPrompt = `Buat konten untuk topik: ${prompt}

INSTRUKSI:
-- Tulis konten yang relevan dan informatif
-- Gunakan bahasa Indonesia yang natural
-- Berikan informasi yang valuable`;
          }
        }

        // const { text } = await generateText({
        //   model: aiModel,
        //   prompt: systemPrompt,
        //   maxTokens: aiMode === "continue" ? 4000 : (type === "structure" ? 1000 : type === "sentence" ? 1500 : 2000),
        //   temperature: 0.7,
        //   presencePenalty: 0.1,
        //   frequencyPenalty: 0.1,
        // });
        const text1 = await callMCPAPI(systemPrompt, type === "structure" ? 1000 : type === "sentence" ? 1500 : 2000);
        const text = removeDaftarPustakaSection(text1!);

        return text;
      } catch (error: any) {
        console.error("❌ AI generation failed:", error);

        // Show user-friendly error notification
        notifications.show({
          title: '❌ AI Generation Error',
          message: error?.message || 'Gagal generate konten. Coba lagi atau gunakan model AI lain.',
          color: 'red',
          autoClose: 5000,
        });

        return null;
      }
    };

    // Smart content merging - FIXED
    const insertContentWithSmartMerging = async () => {
      try {
        if (!generatedContent || !generatedContent.trim()) {
          console.warn("No content to merge");
          return;
        }

        const currentBlocks = editor.document;
        const generatedLines = generatedContent.split('\n').filter((line: string) => line.trim());

        let currentBlockIndex = 0;
        let i = 0;

        while (i < generatedLines.length && currentBlockIndex < currentBlocks.length) {
          const line = generatedLines[i].trim();
          if (!line) {
            i++;
            continue;
          }

          const headingMatch = line.match(/^(#+)\s+(.+)$/);

          if (headingMatch) {
            const level = headingMatch[1].length;
            const judulText = headingMatch[2];

            const matchingBlockIndex = findMatchingJudul(currentBlocks, judulText, level, currentBlockIndex);

            if (matchingBlockIndex !== -1) {
              currentBlockIndex = matchingBlockIndex;
              i++;

              const contentToInsert: PartialBlock[] = [];
              while (i < generatedLines.length) {
                const contentLine = generatedLines[i].trim();
                if (!contentLine) {
                  i++;
                  continue;
                }

                if (contentLine.match(/^#+\s+/)) {
                  break;
                }

                contentToInsert.push({
                  type: "paragraph",
                  content: contentLine,
                });
                i++;
              }

              if (contentToInsert.length > 0) {
                const targetBlock = currentBlocks[currentBlockIndex];
                await editor.insertBlocks(contentToInsert, targetBlock, "after");
                currentBlockIndex += contentToInsert.length + 1;
              }
            } else {
              i++;
            }
          } else {
            i++;
          }
        }
      } catch (error) {
        console.error("Error in smart merging:", error);
        // Fallback to simple insertion
        const lines = generatedContent.split('\n').filter((line: string) => line.trim());
        const blocksToInsert: PartialBlock[] = lines.map((line: string) => ({
          type: "paragraph",
          content: line.trim(),
        }));

        if (blocksToInsert.length > 0) {
          const lastBlock = editor.document[editor.document.length - 1];
          await editor.insertBlocks(blocksToInsert, lastBlock, "after");
        }
      }
    };

    // Helper function to find the start position of a block
    const getBlockStartPos = (blockId: string): number | null => {
      const editorState = (editor as any)._tiptapEditor.state;
      let pos: number | null = null;
      editorState.doc.descendants((node: any, p: number) => {
        if (node.attrs.id === blockId) {
          pos = p;
          return false;
        }
        return true;
      });
      return pos;
    };


    // FIXED: Insert content to editor with proper sentence continuation
    const insertContentToEditor = async (behavior: string = "rewrite") => {
      if (!generatedContent || !generatedContent.trim()) {
        console.warn("No generated content to insert");
        return;
      }

      try {
        if (aiMode === "continue") {
          await insertContentWithSmartMerging();
          
          // Add outline refresh for continue mode
          setTimeout(() => {
            console.log('🗂️ AI CONTINUE - Dispatching force outline refresh');
            window.dispatchEvent(new CustomEvent('forceOutlineRefresh'));
          }, 1000);
          
          closeModalAndReset();
          console.log("Content merged with smart merging, modal closed");
          return;
        }

        const lines = generatedContent.split('\n').filter((line: string) => line.trim());

        if (lines.length === 0) {
          console.warn("No valid lines to insert");
          return;
        }

        const blocksToInsert: PartialBlock[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Parse headings
          const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
          if (headingMatch) {
            const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
            const judulText = headingMatch[2].trim();

            blocksToInsert.push({
              type: "heading",
              content: judulText,
              props: { level },
            });
          }
          // Parse bullet lists
          else if (line.match(/^[\*\-]\s+/)) {
            const listText = line.replace(/^[\*\-]\s+/, '').trim();
            blocksToInsert.push({
              type: "bulletListItem",
              content: listText,
            });
          }
          // Parse numbered lists
          else if (line.match(/^\d+\.\s+/)) {
            const listText = line.replace(/^\d+\.\s+/, '').trim();
            blocksToInsert.push({
              type: "numberedListItem",
              content: listText,
            });
          }
          // Default paragraph
          else {
            blocksToInsert.push({
              type: "paragraph",
              content: line,
            });
          }
        }

        if (blocksToInsert.length > 0) {
          switch (behavior) {
            case "rewrite":
              // Replace all content (untuk mode structure)
              await editor.replaceBlocks(editor.document, blocksToInsert);

              // Set cursor to the first block
              setTimeout(() => {
                try {
                  const firstBlock = editor.document[0];
                  if (firstBlock) {
                    editor.setTextCursorPosition(firstBlock, "start");
                  }
                } catch (e) {
                  console.log("Cursor positioning adjustment:", e);
                }
              }, 100);
              break;

            case "content_cursor":
              // Insert content under current heading (untuk mode content)
              try {
                let targetBlock = editor.document.find(b => b.id === savedCursorPosition?.blockId);
                if (!targetBlock) {
                  const cursorPosition = editor.getTextCursorPosition();
                  targetBlock = cursorPosition?.block || null;
                }

                if (targetBlock) {
                  // Find the current heading or closest heading before cursor
                  const allBlocks = editor.document;
                  const currentIndex = allBlocks.findIndex(block => block.id === targetBlock!.id);

                  let headingIndex = currentIndex;

                  // If current block is not a heading, find the previous heading
                  if (targetBlock.type !== "heading") {
                    for (let i = currentIndex; i >= 0; i--) {
                      if (allBlocks[i].type === "heading") {
                        headingIndex = i;
                        break;
                      }
                    }
                  }

                  const judulBlock = allBlocks[headingIndex];

                  // Find where to insert (RIGHT AFTER heading, not at the end of existing content)
                  let insertIndex = headingIndex; // Start from heading position

                  // Insert langsung setelah heading, bukan setelah semua content
                  const insertAfterBlock = allBlocks[insertIndex]; // Langsung gunakan heading block

                  console.log("Inserting after heading:", extractTextFromBlock(insertAfterBlock));

                  await editor.insertBlocks(blocksToInsert, insertAfterBlock, "after");

                  // Set cursor ke block PERTAMA yang baru di-insert
                  setTimeout(() => {
                    try {
                      const newAllBlocks = editor.document;
                      const newHeadingIndex = newAllBlocks.findIndex(block => block.id === insertAfterBlock.id);
                      const firstInsertedIndex = newHeadingIndex + 1; // Block pertama setelah heading

                      if (firstInsertedIndex < newAllBlocks.length) {
                        const firstInsertedBlock = newAllBlocks[firstInsertedIndex];
                        if (firstInsertedBlock) {
                          console.log("Setting cursor to first inserted block:", extractTextFromBlock(firstInsertedBlock));
                          editor.setTextCursorPosition(firstInsertedBlock, "start");
                        }
                      }
                    } catch (e) {
                      console.log("Cursor positioning adjustment:", e);
                    }
                  }, 150);
                } else {
                  // Fallback: insert di akhir jika tidak ada cursor position
                  const lastBlock = editor.document[editor.document.length - 1];
                  await editor.insertBlocks(blocksToInsert, lastBlock, "after");

                  // Set cursor ke block pertama yang di-insert
                  setTimeout(() => {
                    const newAllBlocks = editor.document;
                    const lastBlockIndex = newAllBlocks.findIndex(block => block.id === lastBlock.id);
                    const firstNewBlockIndex = lastBlockIndex + 1;
                    if (firstNewBlockIndex < newAllBlocks.length) {
                      const firstNewBlock = newAllBlocks[firstNewBlockIndex];
                      if (firstNewBlock) {
                        editor.setTextCursorPosition(firstNewBlock, "start");
                      }
                    }
                  }, 150);
                }
              } catch (error) {
                console.error("Error inserting at content cursor position:", error);
                // Fallback: insert di akhir
                const lastBlock = editor.document[editor.document.length - 1];
                await editor.insertBlocks(blocksToInsert, lastBlock, "after");
              }
              break;

            case "cursor":
              try {
                const targetBlock = editor.document.find(b => b.id === savedCursorPosition?.blockId);
                const absoluteOffset = savedCursorPosition?.offset;

                if (targetBlock && absoluteOffset !== undefined &&
                  (targetBlock.type === "paragraph" ||
                    targetBlock.type === "bulletListItem" ||
                    targetBlock.type === "numberedListItem") &&
                  blocksToInsert.length === 1 &&
                  blocksToInsert[0].type === "paragraph") {

                  const textToAppend = blocksToInsert[0].content as string;

                  // Use the Tiptap editor to set the selection to the saved absolute position
                  (editor as any)._tiptapEditor.commands.setTextSelection(absoluteOffset);

                  // Check if a space is needed
                  const currentText = extractTextFromBlock(targetBlock);
                  const blockStartPos = getBlockStartPos(targetBlock.id);
                  // Ensure relative offset is not negative
                  const relativeOffset = blockStartPos !== null ? Math.max(0, absoluteOffset - blockStartPos - 1) : 0;
                  const charBeforeCursor = currentText.charAt(relativeOffset - 1);

                  const needsSpace = charBeforeCursor && !/\s/.test(charBeforeCursor);
                  const finalText = (needsSpace ? ' ' : '') + textToAppend;

                  await editor.insertInlineContent(finalText);
                  console.log("Successfully inserted text at precise cursor position.");

                } else {
                  let insertionBlock = editor.document.find(b => b.id === savedCursorPosition?.blockId);
                  if (!insertionBlock) {
                    const pos = editor.getTextCursorPosition();
                    insertionBlock = pos?.block || editor.document[editor.document.length - 1];
                  }

                  await editor.insertBlocks(blocksToInsert, insertionBlock, "after");

                  setTimeout(() => {
                    try {
                      const newAllBlocks = editor.document;
                      const targetIndex = newAllBlocks.findIndex(block => block.id === insertionBlock!.id);
                      const firstInsertedIndex = targetIndex + 1;
                      if (firstInsertedIndex < newAllBlocks.length) {
                        const firstInsertedBlock = newAllBlocks[firstInsertedIndex];
                        if (firstInsertedBlock) {
                          editor.setTextCursorPosition(firstInsertedBlock, "start");
                        }
                      }
                    } catch (e) {
                      console.log("Cursor positioning adjustment:", e);
                    }
                  }, 150);
                }
              } catch (error) {
                console.error("Error inserting at cursor position:", error);
                const lastBlock = editor.document[editor.document.length - 1];
                await editor.insertBlocks(blocksToInsert, lastBlock, "after");
              }
              break;

            case "add":
              // NEW: Add behavior untuk AI Auto mode
              try {
                let targetBlock = editor.document.find(b => b.id === savedCursorPosition?.blockId);
                if (!targetBlock) {
                  const cursorPosition = editor.getTextCursorPosition();
                  targetBlock = cursorPosition?.block || null;
                }

                if (targetBlock) {
                  await editor.insertBlocks(blocksToInsert, targetBlock, "after");

                  // Set cursor ke block pertama yang baru di-insert
                  setTimeout(() => {
                    try {
                      const newAllBlocks = editor.document;
                      const targetIndex = newAllBlocks.findIndex(block => block.id === targetBlock!.id);
                      const firstInsertedIndex = targetIndex + 1;

                      if (firstInsertedIndex < newAllBlocks.length) {
                        const firstInsertedBlock = newAllBlocks[firstInsertedIndex];
                        if (firstInsertedBlock) {
                          editor.setTextCursorPosition(firstInsertedBlock, "start");
                        }
                      }
                    } catch (e) {
                      console.log("Cursor positioning adjustment:", e);
                    }
                  }, 150);
                } else {
                  // Fallback: insert di akhir jika tidak ada cursor position
                  const lastBlock = editor.document[editor.document.length - 1];
                  await editor.insertBlocks(blocksToInsert, lastBlock, "after");

                  // Set cursor ke block pertama yang di-insert
                  setTimeout(() => {
                    const newAllBlocks = editor.document;
                    const lastBlockIndex = newAllBlocks.findIndex(block => block.id === lastBlock.id);
                    const firstNewBlockIndex = lastBlockIndex + 1;
                    if (firstNewBlockIndex < newAllBlocks.length) {
                      const firstNewBlock = newAllBlocks[firstNewBlockIndex];
                      if (firstNewBlock) {
                        editor.setTextCursorPosition(firstNewBlock, "start");
                      }
                    }
                  }, 150);
                }
              } catch (error) {
                console.error("Error inserting at add position:", error);
                // Fallback: insert di akhir
                const lastBlock = editor.document[editor.document.length - 1];
                await editor.insertBlocks(blocksToInsert, lastBlock, "after");
              }
              break;

            default:
              // Default to add behavior
              const defaultLastBlock = editor.document[editor.document.length - 1];
              await editor.insertBlocks(blocksToInsert, defaultLastBlock, "after");
          }
        }

        // Add outline refresh after content insertion
        setTimeout(() => {
          // Extract title from H1 in generated content
          const h1Match = generatedContent.match(/^#\s+(.+)$/m);
          if (h1Match) {
            const extractedTitle = h1Match[1].trim();
            console.log('🎯 AI MODAL - Dispatching title update:', extractedTitle);
            
            window.dispatchEvent(new CustomEvent('slashMenuTitleUpdate', { 
              detail: { title: extractedTitle } 
            }));
          }

          // Extract outline directly from generated content
          console.log('🗂️ AI MODAL - Extracting headings directly from generated content');
          const headings: { id: string; text: string; level: number }[] = [];
          const lines = generatedContent.split('\n');
          
          lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('#')) {
              const level = (trimmed.match(/^#+/) || [''])[0].length;
              const text = trimmed.replace(/^#+\s*/, '').trim();
              if (text) {
                headings.push({
                  id: `heading-${index}-${Math.random().toString(36).substr(2, 9)}`,
                  text: text,
                  level: Math.min(level, 6)
                });
              }
            }
          });
          
          console.log('🗂️ AI MODAL - Extracted headings directly:', headings);
          
          if (headings.length > 0) {
            // Dispatch direct outline set
            window.dispatchEvent(new CustomEvent('setOutlineDirectly', {
              detail: { headings: headings }
            }));
          }

          // Also force refresh outline as backup
          console.log('🗂️ AI MODAL - Dispatching force outline refresh as backup');
          window.dispatchEvent(new CustomEvent('forceOutlineRefresh'));
        }, 1000); // Give time for content to be properly inserted

        closeModalAndReset();
        console.log("Content inserted to editor, modal closed");
      } catch (error) {
        console.error("Error inserting content:", error);
        notifications.show({
          title: 'Gagal Memasukkan Konten',
          message: 'Terjadi kesalahan saat mencoba memasukkan konten ke editor.',
          color: 'red',
          icon: <IconX size={18} />,
        });
      }
    };

    // Custom AI Slash Menu Items - NOW TWO ITEMS: Manual dan Auto
    const getCustomAISlashMenuItems = React.useMemo(() => {
      console.log('Debug AI Model:', aiModel, 'Google API Key:', process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? 'Available' : 'Missing');
      // Temporary: Show AI menu items even without API key for debugging
      // if (!aiModel) {
      //   console.warn('AI Model not available, AI menu items will be hidden');
      //   return [];
      // }

      return [
        {
          title: "Ai dengan Prompt",
          onItemClick: () => {
            // Save precise cursor position when slash menu is clicked
            const cursorPosition = editor.getTextCursorPosition();
            if (cursorPosition) {
              setSavedCursorPosition({
                blockId: cursorPosition.block.id,
                offset: (editor as any)._tiptapEditor.state.selection.from,
              });
            }
            setAIMode("new");
            setCurrentAIType("structure");
            openAIModal();
          },
          aliases: ["generate", "write", "tulis", "ai", "assistant", "ask", "help", "continue", "lanjut", "sentence", "struktur", "konten"],
          group: "AI Tools",
          subtext: "Penyusunan Konten dengan prompt untuk struktur bab, isi konten, dan melanjutkan kalimat",
          icon: <IconPencilPlus size={18} />,
        },
        {
          title: "Ai tanpa Prompt / Otomatis",
          onItemClick: () => {
            // Save precise cursor position when slash menu is clicked
            const cursorPosition = editor.getTextCursorPosition();
            if (cursorPosition) {
              setSavedCursorPosition({
                blockId: cursorPosition.block.id,
                offset: (editor as any)._tiptapEditor.state.selection.from,
              });
            }
            setAIMode("auto");
            setCurrentAIType("structure");
            openAIModal();
          },
          aliases: ["auto", "otomatis", "automatic", "smart", "cerdas", "instant", "langsung"],
          group: "AI Tools",
          subtext: "Penyusunan Konten tanpa prompt untuk struktur bab, isi konten, dan melanjutkan kalimat",
          icon: <IconSparkles size={18} />
        },
        // ############### PERBAIKAN LATEX DIMULAI DI SINI ###############
        {
          title: "LaTeX Formula",
          onItemClick: openLatexModal,
          aliases: ["latex", "math", "equation", "formula", "rumus", "matematika"],
          group: "Formatting",
          subtext: "Sisipkan formula matematika menggunakan LaTeX",
          icon: <IconMath size={18} />,
        },
        // ############### PERBAIKAN LATEX SELESAI DI SINI ###############
      ];
    }, [openAIModal, editor, openLatexModal]); // Remove aiModel dependency temporarily

    // Custom Slash Menu Items
    const getCustomSlashMenuItems = React.useMemo(() => {
      const baseItems = getDefaultReactSlashMenuItems(editor);

      const translatedItems = baseItems.map(item => {
        if (item.title === "Table") {
          return {
            ...item,
            title: "Tabel",
            subtext: "Tabel dengan sel yang bisa diedit",
          };
        }

        if (item.title === "Numbered List") {
          return {
            ...item,
            title: "List Angka",
            subtext: "Buat List dengan angka",
          };
        }

        if (item.title === "Bulleted List" || item.title === "Bullet List") {
          return {
            ...item,
            title: "List Butir",
            subtext: "Buat list dengan poin",
          };
        }

        if (item.title === "Heading 1") {
          return {
            ...item,
            subtext: "Gunakan untuk judul utama halaman",
          };
        }

        if (item.title === "Heading 2") {
          return {
            ...item,
            subtext: "Gunakan untuk subjudul dalam konten",
          };
        }

        if (item.title === "Heading 3") {
          return {
            ...item,
            subtext: "Gunakan untuk sub-bagian dari Heading 2",
          };
        }


        return item;
      });

      const orderedItems = [
        ...getCustomAISlashMenuItems,
        ...translatedItems.filter(item =>
          ['Heading 1', 'Heading 2', 'Heading 3'].includes(item.title)
        ),
        ...translatedItems.filter(item =>
          ['List Angka', 'List Butir'].includes(item.title)
        ),
        ...translatedItems.filter(item =>
          ['Tabel', 'Divider'].includes(item.title)
        )
      ];

      return orderedItems;
    }, [editor, getCustomAISlashMenuItems]);

    // Handle content changes
    React.useEffect(() => {
      let isProcessingChange = false;
      let timeoutId: NodeJS.Timeout;

      const handleChange = () => {
        // Prevent race conditions and rapid-fire onChange calls
        if (isProcessingChange) return;

        isProcessingChange = true;
        clearTimeout(timeoutId);

        // Minimal debounce for outline updates (reduced from 100ms to 50ms for faster response)
        timeoutId = setTimeout(() => {
          if (onContentChange) {
            onContentChange(editor.document);
          }
          isProcessingChange = false;
        }, 50); // Faster for real-time outline updates
      };

      let unsubscribe: (() => void) | undefined;

      try {
        unsubscribe = editor.onChange?.(handleChange);
      } catch (error) {
        console.error("Error setting up content change listener:", error);
      }

      return () => {
        clearTimeout(timeoutId);
        isProcessingChange = false;
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [editor, onContentChange]);

    // MINIMAL CSS ONLY - NO AUTO STYLING
    useEffect(() => {
      console.log('ADDING MINIMAL CITATION CSS ONLY');
      
      // Remove existing
      const existing = document.getElementById('citation-styles');
      if (existing) existing.remove();
      
      // MINIMAL CSS  
      const style = document.createElement('style');
      style.id = 'citation-styles';
      style.innerHTML = `
        /* NUCLEAR CITATION STYLING - MAXIMUM PRIORITY */
        .citation-blue,
        span.citation-blue,
        .ProseMirror .citation-blue,
        .ProseMirror span.citation-blue,
        .bn-editor .citation-blue,
        [class*="citation-blue"],
        *[class*="citation-blue"] {
          color: blue !important;
          font-weight: bold !important;
          background: transparent !important;
        }
        
        /* ABSOLUTE OVERRIDE - USE HIGHEST SPECIFICITY */
        .ProseMirror p span.citation-blue,
        .ProseMirror div span.citation-blue,
        .bn-editor p span.citation-blue,
        .bn-editor div span.citation-blue {
          color: blue !important;
          font-weight: bold !important;
          background: transparent !important;
        }
        
        /* ADDITIONAL CITATION PATTERNS */
        .ProseMirror span[data-citation="true"],
        .bn-editor span[data-citation="true"] {
          color: blue !important;
          font-weight: bold !important;
        }
      `;
      document.head.appendChild(style);
      
      console.log('✅ CSS added - NO AUTO STYLING WILL RUN');
      
    }, []);

    const clearInputs = () => {
      setPrompt("");
      setGeneratedContent("");
    };

    const handleDelete = async () => {
      await editor.replaceBlocks(editor.document, [{
        type: "paragraph",
        content: ""
      }]);
      // Set cursor to the start of the new empty block
      if (editor.document.length > 0) {
        editor.setTextCursorPosition(editor.document[0], "start");
      }
      closeDeleteConfirmation();
      notifications.show({
        title: "Konten Dihapus",
        message: "Semua konten di editor telah berhasil dihapus.",
        color: "green",
        icon: <IconCheck size={18} />,
      });
    };


    return (
      <>

        <div style={{ 
          position: 'relative', 
          height: '100%', 
          minWidth: '280px',
          overflowX: 'hidden',
          width: '100%',
          maxWidth: '100%',
          ...style 
        }}>
          {/* Enhanced Modern Undo/Redo Controls */}
          <Paper
            className="editor-toolbar"
            p="sm"
            mb="md"
            withBorder={false}
            style={{
              background: computedColorScheme === "dark"
                ? 'linear-gradient(135deg, rgba(26, 27, 30, 0.8), rgba(30, 32, 36, 0.8))'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.9))',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${computedColorScheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
              borderRadius: '16px',
              boxShadow: computedColorScheme === "dark"
                ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                : '0 8px 32px rgba(0, 0, 0, 0.1)',
              flexShrink: 0,
              overflowX: 'auto'
            }}
          >
            <Group gap="sm" justify="space-between" wrap="wrap" style={{ minWidth: 0 }}>
              <Group gap="xs">
                <Tooltip
                  label={`Undo (Ctrl+Z)${canUndo() ? ` - ${undoRedoState.history.length - undoRedoState.currentIndex - 1} langkah tersedia` : ''}`}
                  position="bottom"
                  withArrow
                >
                  <ActionIcon
                    variant={canUndo() ? "gradient" : "subtle"}
                    gradient={canUndo() ? { from: 'blue', to: 'cyan' } : undefined}
                    color={canUndo() ? undefined : "gray"}
                    onClick={undo}
                    disabled={!canUndo()}
                    size="md"
                    radius="xl"
                    style={{
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: canUndo() ? 'scale(1)' : 'scale(0.9)',
                      opacity: canUndo() ? 1 : 0.5,
                      boxShadow: canUndo() ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                    }}
                  >
                    <IconArrowBackUp size={18} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip
                  label={`Redo (Ctrl+Y)${canRedo() ? ` - ${undoRedoState.history.length - undoRedoState.currentIndex - 1} langkah tersedia` : ''}`}
                  position="bottom"
                  withArrow
                >
                  <ActionIcon
                    variant={canRedo() ? "gradient" : "subtle"}
                    gradient={canRedo() ? { from: 'blue', to: 'cyan' } : undefined}
                    color={canRedo() ? undefined : "gray"}
                    onClick={redo}
                    disabled={!canRedo()}
                    size="md"
                    radius="xl"
                    style={{
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: canRedo() ? 'scale(1)' : 'scale(0.9)',
                      opacity: canRedo() ? 1 : 0.5,
                      boxShadow: canRedo() ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                    }}
                  >
                    <IconArrowForwardUp size={18} />
                  </ActionIcon>
                </Tooltip>
                
                {/* AI Tools Dropdown Menu */}
                <Menu shadow="lg" width={280} position="bottom-end">
                  <Menu.Target>
                    <Tooltip label="AI Tools - Klik untuk membuka semua fitur AI">
                      <ActionIcon
                        variant="gradient"
                        gradient={{ from: 'blue', to: 'cyan' }}
                        size="lg"
                        radius="xl"
                        style={{
                          transition: 'all 0.3s ease',
                          '&:hover': { transform: 'scale(1.05)' }
                        }}
                      >
                        <IconSparkles size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Label>
                      <Group gap="xs">
                        <IconSparkles size={16} />
                        <Text fw={600} c="blue">AI TOOLS</Text>
                        <Badge variant="dot" color="green" size="xs">Aktif</Badge>
                      </Group>
                    </Menu.Label>

                    {aiTemplates.map((template, index) => (
                      <Menu.Item
                        key={index}
                        leftSection={<template.icon size={16} color={template.color} />}
                        onClick={() => {
                          setCurrentAIType(template.type);
                          setAIMode("new");
                          setGeneratedContent("");
                          openAIModal();
                        }}
                      >
                        <div>
                          <Text size="sm" fw={500}>{template.title}</Text>
                          <Text size="xs" c="dimmed">{template.description}</Text>
                        </div>
                      </Menu.Item>
                    ))}

                    <Menu.Divider />

                    <Menu.Item
                      leftSection={<IconWand size={16} color="violet" />}
                      onClick={() => handleInlineAIAction('continue')}
                    >
                      <div>
                        <Text size="sm" fw={500}>🪄 Lanjutkan Menulis</Text>
                        <Text size="xs" c="dimmed">AI akan meneruskan tulisan dari posisi cursor</Text>
                      </div>
                    </Menu.Item>

                    <Menu.Item
                      leftSection={<IconFileText size={16} color="teal" />}
                      onClick={() => handleInlineAIAction('summarize')}
                    >
                      <div>
                        <Text size="sm" fw={500}>📋 Ringkas Artikel</Text>
                        <Text size="xs" c="dimmed">Buat ringkasan dari konten yang sudah ditulis</Text>
                      </div>
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                
                <Tooltip label="Hapus semua konten artikel (tidak bisa dibatalkan)">
                  <Button
                    variant="outline"
                    color="red"
                    size="compact-md"
                    onClick={openDeleteConfirmation}
                  >
                    <IconTrash size={18} />
                  </Button>
                </Tooltip>

              </Group>

              <Group gap="sm">
                {/* History indicator with progress */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: computedColorScheme === "dark"
                    ? 'rgba(59, 130, 246, 0.1)'
                    : 'rgba(59, 130, 246, 0.05)',
                  border: `1px solid ${computedColorScheme === "dark" ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.1)"}`,
                }}>
                  <Text size="xs" fw={600} c="blue">
                    {undoRedoState.currentIndex + 1}/{undoRedoState.history.length}
                  </Text>
                  <div style={{
                    width: '40px',
                    height: '4px',
                    borderRadius: '2px',
                    background: computedColorScheme === "dark" ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${((undoRedoState.currentIndex + 1) / undoRedoState.history.length) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                      borderRadius: '2px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>

                {/* AI Activity Log Indicator */}
                {aiActivityLog.length > 0 && (
                  <Tooltip
                    label={
                      <Stack gap="xs">
                        <Text size="xs" fw={600}>Log Aktivitas AI:</Text>
                        {aiActivityLog.slice(0, 3).map((log) => (
                          <Group key={log.id} gap="xs">
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: log.success ? '#10b981' : '#ef4444'
                            }} />
                            <Text size="xs">
                              {log.type} • {log.duration}ms • {log.timestamp.toLocaleTimeString()}
                            </Text>
                          </Group>
                        ))}
                        {aiActivityLog.length > 3 && (
                          <Text size="xs" c="dimmed">+{aiActivityLog.length - 3} lainnya</Text>
                        )}
                      </Stack>
                    }
                    position="top"
                    withArrow
                  >
                    <div style={{
                      padding: '4px 6px',
                      borderRadius: '4px',
                      background: computedColorScheme === "dark" 
                        ? 'rgba(16, 185, 129, 0.1)' 
                        : 'rgba(16, 185, 129, 0.05)',
                      border: `1px solid ${computedColorScheme === "dark" ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)"}`,
                      cursor: 'pointer'
                    }}>
                      <Text size="xs" fw={600} c="green">
                        AI: {aiActivityLog.length}
                      </Text>
                    </div>
                  </Tooltip>
                )}

                {/* Revision Indicators Panel */}
                {revisionIndicators.length > 0 && (
                  <Tooltip
                    label={
                      <Stack gap="xs">
                        <Text size="xs" fw={600}>Indikator Revisi:</Text>
                        {revisionIndicators.slice(0, 4).map((indicator) => (
                          <Group key={indicator.blockId} gap="xs">
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: indicator.color
                            }} />
                            <Text size="xs">
                              {indicator.type === 'needs-review' ? 'Perlu Review' : 
                               indicator.type === 'ai-generated' ? 'Hasil AI' :
                               indicator.type === 'modified' ? 'Dimodifikasi' : 'Disarankan'} 
                              • {indicator.timestamp.toLocaleTimeString()}
                            </Text>
                          </Group>
                        ))}
                        {revisionIndicators.length > 4 && (
                          <Text size="xs" c="dimmed">+{revisionIndicators.length - 4} lainnya</Text>
                        )}
                        <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
                          Klik blok dengan indikator warna untuk info detail
                        </Text>
                      </Stack>
                    }
                    position="top"
                    withArrow
                  >
                    <div style={{
                      padding: '4px 6px',
                      borderRadius: '4px',
                      background: computedColorScheme === "dark" 
                        ? 'rgba(255, 107, 107, 0.1)' 
                        : 'rgba(255, 107, 107, 0.05)',
                      border: `1px solid ${computedColorScheme === "dark" ? "rgba(255, 107, 107, 0.2)" : "rgba(255, 107, 107, 0.1)"}`,
                      cursor: 'pointer',
                      marginLeft: '8px'
                    }}>
                      <Text size="xs" fw={600} style={{ color: '#ff6b6b' }}>
                        Revisi: {revisionIndicators.length}
                      </Text>
                    </div>
                  </Tooltip>
                )}
                </div>

                {/* Quick save indicator */}
                {lastSavedContent.current && (
                  <Tooltip label="Tersimpan otomatis" position="bottom">
                    <ThemeIcon
                      size="sm"
                      variant="light"
                      color="green"
                      radius="xl"
                      style={{
                        animation: 'fade-in 0.3s ease-out'
                      }}
                    >
                      <IconCheck size={12} />
                    </ThemeIcon>
                  </Tooltip>
                )}
              </Group>
            </Group>
          </Paper>

          {/* AI Streaming Progress Overlay */}
          {aiStreamingState.isStreaming && (
            <Box
              pos="fixed"
              top={20}
              right={20}
              style={{ zIndex: 1000 }}
              className="ai-progress-container"
            >
              <Paper p="md" shadow="lg" radius="md" bg="blue.0">
                <Group gap="md">
                  <RingProgress
                    size={60}
                    thickness={6}
                    sections={[{ value: aiStreamingState.progress, color: 'blue' }]}
                    label={
                      <Center>
                        <Text size="xs" fw={700} c="blue">
                          {aiStreamingState.progress}%
                        </Text>
                      </Center>
                    }
                  />
                  <Stack gap="xs">
                    <Text size="sm" fw={600} c="blue">
                      AI sedang mengetik...
                    </Text>
                    <Text size="xs" c="dimmed">
                      {aiStreamingState.currentChunk}/{aiStreamingState.totalChunks} kata
                    </Text>
                    <Progress
                      value={aiStreamingState.progress}
                      size="xs"
                      radius="xl"
                      color="blue"
                    />
                  </Stack>
                </Group>
              </Paper>
            </Box>
          )}

          <div style={{ height: '100%', overflow: 'auto', position: 'relative' }}>
            <style>{`
              /* GLOBAL AGGRESSIVE RESPONSIVE FIXES */
              
              /* Prevent zoom on input focus (mobile) */
              @media (max-width: 768px) {
                input[type="text"],
                input[type="email"], 
                input[type="password"],
                textarea,
                select {
                  font-size: 16px !important;
                  transform: scale(1) !important;
                }
                
                /* Fix entire layout structure */
                .mantine-AppShell-root {
                  display: flex !important;
                  flex-direction: column !important;
                }
                
                .mantine-AppShell-navbar {
                  position: fixed !important;
                  top: 0 !important;
                  left: -280px !important;
                  width: 280px !important;
                  height: 100vh !important;
                  z-index: 9999 !important;
                  transition: left 0.3s ease !important;
                  background: white !important;
                  border-right: 1px solid #e9ecef !important;
                }
                
                .mantine-AppShell-navbar[data-opened="true"] {
                  left: 0 !important;
                }
                
                .mantine-AppShell-main {
                  padding: 8px !important;
                  margin-left: 0 !important;
                  width: 100% !important;
                  max-width: 100vw !important;
                  box-sizing: border-box !important;
                }
                
                .mantine-AppShell-aside {
                  position: fixed !important;
                  top: 0 !important;
                  right: -100vw !important;
                  width: 100vw !important;
                  height: 100vh !important;
                  z-index: 9998 !important;
                  transition: right 0.3s ease !important;
                  background: white !important;
                  overflow-y: auto !important;
                }
                
                .mantine-AppShell-aside[data-opened="true"] {
                  right: 0 !important;
                }
                
                /* Header responsive */
                .mantine-AppShell-header {
                  padding: 8px 16px !important;
                }
                
                .mantine-AppShell-header .mantine-Group-root {
                  gap: 8px !important;
                }
                
                .mantine-AppShell-header .mantine-Text-root {
                  font-size: 16px !important;
                }
              }
              
              @media (max-width: 480px) {
                /* Extra mobile fixes */
                .mantine-AppShell-navbar {
                  width: 260px !important;
                  left: -260px !important;
                }
                
                .mantine-AppShell-main {
                  padding: 4px !important;
                }
                
                .mantine-AppShell-header {
                  padding: 4px 8px !important;
                }
                
                .mantine-AppShell-header .mantine-Text-root {
                  font-size: 14px !important;
                }
                
                .mantine-AppShell-header .mantine-ActionIcon-root {
                  min-width: 36px !important;
                  min-height: 36px !important;
                }
              }
              
              /* Touch-friendly improvements */
              * {
                -webkit-tap-highlight-color: rgba(59, 130, 246, 0.3) !important;
                -webkit-touch-callout: none !important;
              }
              
              /* Prevent horizontal scroll */
              html, body {
                overflow-x: hidden !important;
                max-width: 100vw !important;
              }
              
              /* Page layout improvements */
              @media (max-width: 768px) {
                /* Left sidebar improvements */
                [data-testid="sidebar-left"],
                .sidebar-left {
                  position: fixed !important;
                  top: 0 !important;
                  left: -100% !important;
                  width: 280px !important;
                  height: 100vh !important;
                  z-index: 9999 !important;
                  transition: left 0.3s ease !important;
                  background: rgba(255, 255, 255, 0.98) !important;
                  backdrop-filter: blur(10px) !important;
                  border-right: 2px solid rgba(59, 130, 246, 0.1) !important;
                  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1) !important;
                }
                
                [data-testid="sidebar-left"][data-opened="true"],
                .sidebar-left.opened {
                  left: 0 !important;
                }
                
                /* Right panel improvements */
                [data-testid="sidebar-right"],
                .sidebar-right {
                  position: fixed !important;
                  top: 0 !important;
                  right: -100% !important;
                  width: 100vw !important;
                  height: 100vh !important;
                  z-index: 9998 !important;
                  transition: right 0.3s ease !important;
                  background: rgba(255, 255, 255, 0.98) !important;
                  backdrop-filter: blur(10px) !important;
                  border-left: 2px solid rgba(59, 130, 246, 0.1) !important;
                  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1) !important;
                  overflow-y: auto !important;
                }
                
                [data-testid="sidebar-right"][data-opened="true"],
                .sidebar-right.opened {
                  right: 0 !important;
                }
                
                /* Main content area */
                .main-content,
                [data-testid="main-content"] {
                  width: 100% !important;
                  max-width: 100vw !important;
                  margin: 0 !important;
                  padding: 8px !important;
                  box-sizing: border-box !important;
                }
              }
              
              @media (max-width: 480px) {
                /* Mobile specific adjustments */
                [data-testid="sidebar-left"],
                .sidebar-left {
                  width: 260px !important;
                }
                
                .main-content,
                [data-testid="main-content"] {
                  padding: 4px !important;
                }
              }
              
              /* Global Mobile-First Responsive Overrides */
              @media (max-width: 768px) {
                /* Cards and Papers - Mobile Optimized */
                .mantine-Paper-root {
                  margin: 2px !important;
                  padding: 12px !important;
                  border-radius: 12px !important;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
                }
                
                /* Reference cards in sidebar */
                .mantine-Paper-root:has(.reference-item),
                [data-testid*="reference"] .mantine-Paper-root {
                  margin: 4px 8px !important;
                  padding: 16px !important;
                  min-height: 80px !important;
                }
                
                /* Button improvements for mobile */
                .mantine-Button-root {
                  min-height: 48px !important;
                  padding: 12px 20px !important;
                  font-size: 14px !important;
                  font-weight: 600 !important;
                  border-radius: 12px !important;
                  touch-action: manipulation !important;
                }
                
                .mantine-ActionIcon-root {
                  min-width: 48px !important;
                  min-height: 48px !important;
                  border-radius: 12px !important;
                  touch-action: manipulation !important;
                }
                
                /* Text improvements */
                .mantine-Text-root {
                  font-size: 14px !important;
                  line-height: 1.5 !important;
                }
                
                .mantine-Title-root {
                  font-size: 18px !important;
                  line-height: 1.3 !important;
                }
                
                /* Input and form improvements */
                .mantine-Input-root,
                .mantine-Textarea-root {
                  min-height: 48px !important;
                  font-size: 16px !important;
                  border-radius: 12px !important;
                }
                
                .mantine-TextInput-input,
                .mantine-Textarea-input {
                  padding: 12px 16px !important;
                }
                
                /* Search input specific */
                .mantine-Spotlight-root,
                [data-testid*="search"] input {
                  font-size: 16px !important;
                  min-height: 48px !important;
                  padding: 12px 16px !important;
                }
                
                /* Group and Stack spacing */
                .mantine-Group-root {
                  gap: 12px !important;
                  flex-wrap: wrap !important;
                }
                
                .mantine-Stack-root {
                  gap: 12px !important;
                }
                
                /* Editor toolbar specific */
                .editor-toolbar .mantine-Group-root {
                  gap: 8px !important;
                  flex-direction: row !important;
                  justify-content: space-between !important;
                  align-items: center !important;
                }
                
                .editor-toolbar .mantine-Group-root > .mantine-Group-root {
                  justify-content: center !important;
                  flex-wrap: wrap !important;
                  gap: 8px !important;
                }
                
                /* Modal improvements */
                .mantine-Modal-root {
                  padding: 16px !important;
                }
                
                .mantine-Modal-content {
                  max-height: calc(100vh - 32px) !important;
                  margin: 0 !important;
                  border-radius: 16px !important;
                  max-width: calc(100vw - 32px) !important;
                }
                
                .mantine-Modal-body {
                  padding: 20px !important;
                }
                
                .mantine-Modal-header {
                  padding: 16px 20px !important;
                  border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
                }
                
                /* Drawer improvements for sidebars */
                .mantine-Drawer-content {
                  border-radius: 0 !important;
                }
                
                .mantine-Drawer-body {
                  padding: 16px !important;
                }
                
                .mantine-Drawer-header {
                  padding: 16px !important;
                  border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
                }
              }
              
              @media (max-width: 480px) {
                /* Extra aggressive mobile styling */
                body {
                  overflow-x: hidden !important;
                }
                
                .mantine-AppShell-root {
                  min-width: 100vw !important;
                  overflow-x: hidden !important;
                }
                
                /* Mobile optimized cards */
                .mantine-Paper-root {
                  margin: 4px !important;
                  padding: 12px !important;
                  border-radius: 10px !important;
                  min-height: 60px !important;
                }
                
                /* Outline Article card specific */
                .mantine-Paper-root:has([data-testid*="outline"]),
                .outline-card {
                  margin: 8px !important;
                  padding: 16px !important;
                  min-height: 100px !important;
                  border: 2px solid rgba(59, 130, 246, 0.2) !important;
                  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(147, 197, 253, 0.05)) !important;
                }
                
                /* Reference cards */
                .reference-card,
                [data-testid*="reference"] {
                  margin: 6px 4px !important;
                  padding: 12px !important;
                  min-height: 70px !important;
                  border-left: 4px solid #3b82f6 !important;
                }
                
                .mantine-Button-root {
                  min-height: 44px !important;
                  padding: 10px 16px !important;
                  font-size: 14px !important;
                  font-weight: 600 !important;
                  border-radius: 10px !important;
                }
                
                .mantine-ActionIcon-root {
                  min-width: 44px !important;
                  min-height: 44px !important;
                  border-radius: 10px !important;
                }
                
                /* Text sizing for mobile */
                .mantine-Text-root {
                  font-size: 13px !important;
                  line-height: 1.4 !important;
                }
                
                .mantine-Title-root {
                  font-size: 16px !important;
                  line-height: 1.3 !important;
                }
                
                /* Mobile input improvements */
                .mantine-Input-root,
                .mantine-Textarea-root {
                  min-height: 44px !important;
                  font-size: 16px !important;
                  border-radius: 10px !important;
                }
                
                .mantine-TextInput-input,
                .mantine-Textarea-input {
                  padding: 10px 14px !important;
                }
                
                /* Search input */
                .mantine-Spotlight-root,
                [data-testid*="search"] input {
                  font-size: 16px !important;
                  min-height: 44px !important;
                  padding: 10px 14px !important;
                  border-radius: 10px !important;
                }
                
                /* Spacing adjustments */
                .mantine-Group-root {
                  gap: 8px !important;
                }
                
                .mantine-Stack-root {
                  gap: 8px !important;
                }
                
                /* Modal mobile */
                .mantine-Modal-content {
                  width: 100vw !important;
                  height: 100vh !important;
                  max-width: none !important;
                  max-height: none !important;
                  margin: 0 !important;
                  border-radius: 0 !important;
                }
                
                .mantine-Modal-body {
                  padding: 16px !important;
                  max-height: calc(100vh - 60px) !important;
                  overflow-y: auto !important;
                }
                
                .mantine-Modal-header {
                  padding: 12px 16px !important;
                  flex-shrink: 0 !important;
                }
                
                /* Tooltip mobile */
                .mantine-Tooltip-tooltip {
                  font-size: 11px !important;
                  padding: 6px 10px !important;
                  max-width: 250px !important;
                  border-radius: 8px !important;
                }
                
                /* Save buttons at bottom */
                .save-buttons,
                [data-testid*="save"] {
                  position: sticky !important;
                  bottom: 0 !important;
                  background: rgba(255, 255, 255, 0.95) !important;
                  backdrop-filter: blur(10px) !important;
                  padding: 12px !important;
                  border-top: 1px solid rgba(0, 0, 0, 0.1) !important;
                  z-index: 100 !important;
                }
              }
              
              /* BlockNote Editor Mobile Responsive Overrides */
              .ProseMirror {
                font-size: 16px !important;
                line-height: 1.6 !important;
                padding: 16px !important;
              }
              
              @media (max-width: 768px) {
                .ProseMirror {
                  font-size: 15px !important;
                  padding: 12px !important;
                }
              }
              
              @media (max-width: 480px) {
                .ProseMirror {
                  font-size: 14px !important;
                  padding: 8px !important;
                  min-height: 200px !important;
                }
              }
              
              /* AI Modal Mobile Responsive */
              @media (max-width: 768px) {
                .mantine-Modal-content {
                  width: calc(100vw - 16px) !important;
                  max-width: none !important;
                  margin: 8px !important;
                  max-height: calc(100vh - 16px) !important;
                }
                
                .mantine-Modal-body {
                  padding: 12px !important;
                  max-height: calc(100vh - 120px) !important;
                  overflow-y: auto !important;
                }
                
                .mantine-Modal-header {
                  padding: 12px !important;
                  flex-shrink: 0 !important;
                }
              }
              
              @media (max-width: 480px) {
                .mantine-Modal-content {
                  width: 100vw !important;
                  height: 100vh !important;
                  margin: 0 !important;
                  border-radius: 0 !important;
                }
                
                .mantine-Modal-body {
                  padding: 8px !important;
                  max-height: calc(100vh - 80px) !important;
                }
                
                .mantine-Modal-header {
                  padding: 8px !important;
                }
              }
              
              /* Try targeting ALL possible floating elements */
              * {
                --bn-formatting-toolbar-padding: 2px 4px !important;
              }
              
              /* Ultra-wide targeting approach */
              div[style*="position: absolute"],
              div[style*="position: fixed"],
              [data-radix-popper-content-wrapper],
              .mantine-Popover-dropdown,
              .mantine-Paper-root[style*="background"],
              [role="dialog"],
              [role="tooltip"],
              [role="toolbar"] {
                padding: var(--bn-formatting-toolbar-padding) !important;
                border-radius: 8px !important;
              }
              
              /* Brute force all buttons in floating elements */
              div[style*="position: absolute"] button,
              div[style*="position: fixed"] button,
              [data-radix-popper-content-wrapper] button,
              .mantine-Popover-dropdown button,
              .mantine-Paper-root button,
              [role="dialog"] button,
              [role="tooltip"] button,
              [role="toolbar"] button {
                margin: 0 1px !important;
                min-width: 32px !important;
                height: 32px !important;
              }
              
              /* RESPONSIVE Slash Menu Styling - Fixed Size */
              .bn-suggestion-menu {
                position: absolute !important;
                max-width: 650px !important;
                width: auto !important;
                min-width: 580px !important;
                max-height: 400px !important;
                overflow-y: auto !important;
                border-radius: 12px !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
                backdrop-filter: blur(12px) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                z-index: 1000 !important;
                padding: 4px 8px 4px 4px !important;
              }
              
              .bn-suggestion-menu::-webkit-scrollbar {
                width: 6px !important;
              }
              
              .bn-suggestion-menu::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.1) !important;
                border-radius: 3px !important;
              }
              
              .bn-suggestion-menu::-webkit-scrollbar-thumb {
                background: rgba(0, 0, 0, 0.3) !important;
                border-radius: 3px !important;
              }
              
              .bn-suggestion-menu::-webkit-scrollbar-thumb:hover {
                background: rgba(0, 0, 0, 0.5) !important;
              }
              
              .bn-suggestion-menu-item {
                padding: 10px 16px 10px 14px !important;
                margin: 1px 2px !important;
                border-radius: 8px !important;
                transition: all 0.2s ease !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
                min-height: auto !important;
                touch-action: manipulation !important;
              }
              
              .bn-suggestion-menu-item:hover,
              .bn-suggestion-menu-item:active {
                transform: none !important;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2) !important;
                background: rgba(59, 130, 246, 0.08) !important;
              }
              
              .bn-suggestion-menu-item-icon {
                flex-shrink: 0 !important;
                width: 20px !important;
                height: 20px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: rgba(59, 130, 246, 0.1) !important;
                border-radius: 6px !important;
                padding: 2px !important;
              }
              
              .bn-suggestion-menu-item-content {
                flex: 1 !important;
                min-width: 0 !important;
                max-width: calc(100% - 60px) !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 4px !important;
              }
              
              .bn-suggestion-menu-item-title {
                font-size: 14px !important;
                font-weight: 600 !important;
                color: inherit !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                line-height: 1.3 !important;
                margin: 0 !important;
              }
              
              .bn-suggestion-menu-item-subtitle {
                font-size: 12px !important;
                opacity: 0.7 !important;
                line-height: 1.4 !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                margin: 0 !important;
              }
              
              .bn-suggestion-menu-group-label {
                font-size: 11px !important;
                font-weight: 700 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.5px !important;
                padding: 8px 16px 6px 16px !important;
                margin: 2px 2px 0px 2px !important;
                opacity: 0.6 !important;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
                background: transparent !important;
              }
              
              .bn-suggestion-menu-group-label:first-child {
                margin-top: 2px !important;
              }
              
              /* Tablet Responsive (768px and down) */
              @media (max-width: 768px) {
                .bn-suggestion-menu {
                  max-width: calc(100vw - 32px) !important;
                  min-width: 280px !important;
                  max-height: 350px !important;
                }
                
                .bn-suggestion-menu-item {
                  padding: 10px 20px 10px 14px !important;
                  gap: 10px !important;
                }
                
                .bn-suggestion-menu-item-icon {
                  width: 18px !important;
                  height: 18px !important;
                }
                
                .bn-suggestion-menu-item-title {
                  font-size: 13px !important;
                }
                
                .bn-suggestion-menu-item-subtitle {
                  font-size: 11px !important;
                }
              }
              
              /* Mobile Responsive (480px and down) */
              @media (max-width: 480px) {
                .bn-suggestion-menu {
                  max-width: calc(100vw - 16px) !important;
                  min-width: 260px !important;
                  max-height: 300px !important;
                }
                
                .bn-suggestion-menu-item {
                  padding: 8px 18px 8px 12px !important;
                  gap: 8px !important;
                  margin: 1px 2px !important;
                }
                
                .bn-suggestion-menu-item-icon {
                  width: 16px !important;
                  height: 16px !important;
                }
                
                .bn-suggestion-menu-item-title {
                  font-size: 13px !important;
                  font-weight: 600 !important;
                }
                
                .bn-suggestion-menu-item-subtitle {
                  font-size: 10px !important;
                  line-height: 1.3 !important;
                }
                
                .bn-suggestion-menu-group-label {
                  padding: 8px 12px 4px 12px !important;
                  font-size: 9px !important;
                }
              }
              
              /* Extra Small Mobile (360px and down) */
              @media (max-width: 360px) {
                .bn-suggestion-menu {
                  max-width: calc(100vw - 8px) !important;
                  min-width: 240px !important;
                }
                
                .bn-suggestion-menu-item {
                  padding: 6px 16px 6px 10px !important;
                  gap: 6px !important;
                }
                
                .bn-suggestion-menu-item-icon {
                  width: 14px !important;
                  height: 14px !important;
                }
                
                .bn-suggestion-menu-item-title {
                  font-size: 12px !important;
                }
                
                .bn-suggestion-menu-item-subtitle {
                  font-size: 9px !important;
                }
              }
              
              /* Dark Mode Support for All Components */
              [data-mantine-color-scheme="dark"] {
                /* AppShell dark mode */
                .mantine-AppShell-navbar {
                  background: rgba(16, 18, 22, 0.98) !important;
                  border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
                }
                
                .mantine-AppShell-aside {
                  background: rgba(16, 18, 22, 0.98) !important;
                  border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
                }
                
                /* Papers and cards dark mode */
                .mantine-Paper-root {
                  background: rgba(26, 27, 30, 0.8) !important;
                  border: 1px solid rgba(255, 255, 255, 0.1) !important;
                }
                
                /* Outline card dark mode */
                .outline-card,
                .mantine-Paper-root:has([data-testid*="outline"]) {
                  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 197, 253, 0.1)) !important;
                  border: 2px solid rgba(59, 130, 246, 0.3) !important;
                }
                
                /* Reference cards dark mode */
                .reference-card,
                [data-testid*="reference"] {
                  border-left-color: #60a5fa !important;
                  background: rgba(30, 32, 36, 0.8) !important;
                }
              }
              
              /* Dark mode slash menu */
              [data-mantine-color-scheme="dark"] .bn-suggestion-menu {
                background: rgba(16, 18, 22, 0.98) !important;
                border: 2px solid rgba(255, 255, 255, 0.15) !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6) !important;
              }
              
              [data-mantine-color-scheme="dark"] .bn-suggestion-menu-item:hover,
              [data-mantine-color-scheme="dark"] .bn-suggestion-menu-item:active {
                background: rgba(59, 130, 246, 0.15) !important;
              }
              
              [data-mantine-color-scheme="dark"] .bn-suggestion-menu-item-icon {
                background: rgba(59, 130, 246, 0.2) !important;
              }
              
              [data-mantine-color-scheme="dark"] .bn-suggestion-menu-group-label {
                border-bottom-color: rgba(255, 255, 255, 0.15) !important;
                background: rgba(255, 255, 255, 0.05) !important;
              }
              
              /* Mobile menu animations and transitions */
              @media (max-width: 768px) {
                .sidebar-overlay {
                  position: fixed !important;
                  top: 0 !important;
                  left: 0 !important;
                  width: 100vw !important;
                  height: 100vh !important;
                  background: rgba(0, 0, 0, 0.5) !important;
                  z-index: 9997 !important;
                  opacity: 0 !important;
                  visibility: hidden !important;
                  transition: all 0.3s ease !important;
                  backdrop-filter: blur(4px) !important;
                }
                
                .sidebar-overlay.active {
                  opacity: 1 !important;
                  visibility: visible !important;
                }
                
                /* Enhanced mobile animations */
                .mantine-AppShell-navbar,
                .mantine-AppShell-aside,
                [data-testid="sidebar-left"],
                [data-testid="sidebar-right"] {
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }
                
                /* Smooth scroll for mobile */
                .mantine-AppShell-aside {
                  -webkit-overflow-scrolling: touch !important;
                  scrollbar-width: none !important;
                }
                
                .mantine-AppShell-aside::-webkit-scrollbar {
                  display: none !important;
                }
              }
            `}</style>
            <BlockNoteView
              editor={editor}
              slashMenu={false}
              theme={computedColorScheme}
            >
              <SuggestionMenuController
                triggerCharacter={"/"}
                getItems={async (query) =>
                  filterSuggestionItems(
                    getCustomSlashMenuItems,
                    query
                  )
                }
              />
            </BlockNoteView>
          </div>

          {/* Inline AI Suggestions Popup */}
          {inlineAIState.isVisible && (
            <div
              ref={inlineAIRef}
              style={{
                position: 'absolute',
                left: inlineAIState.position.x,
                top: inlineAIState.position.y,
                zIndex: 1000,
                pointerEvents: 'auto',
                maxWidth: '320px'
              }}
            >
              <div
                style={{
                  backgroundColor: computedColorScheme === "dark" ? "#2c2e33" : "#ffffff",
                  border: `2px solid ${computedColorScheme === "dark" ? "#495057" : "#e9ecef"}`,
                  borderRadius: "12px",
                  boxShadow: computedColorScheme === "dark"
                    ? "0 8px 20px rgba(0, 0, 0, 0.4)"
                    : "0 8px 20px rgba(0, 0, 0, 0.15)",
                  padding: "8px",
                  minWidth: "280px",
                  maxHeight: "280px",
                  overflowY: "auto"
                }}
              >
                {/* Header */}
                <div style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid ${computedColorScheme === "dark" ? "#495057" : "#e9ecef"}`,
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconSparkles size={16} color={computedColorScheme === "dark" ? "#9ca3af" : "#6b7280"} />
                    <span style={{
                      color: computedColorScheme === "dark" ? "#9ca3af" : "#6b7280",
                      fontSize: '14px',
                      fontWeight: 500
                    }}>
                      AI Penulis Interaktif
                    </span>
                  </div>
                </div>

                {/* Menu Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {inlineAISuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        handleInlineAIAction(suggestion.action);
                      }}
                      style={{
                        all: 'unset',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: 'transparent',
                        color: computedColorScheme === "dark" ? '#e5e7eb' : '#374151',
                        border: '2px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = computedColorScheme === "dark" ? '#495057' : '#f8f9fa';
                        e.currentTarget.style.borderColor = computedColorScheme === "dark" ? '#6c757d' : '#dee2e6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '16px', display: 'flex', alignItems: 'center' }}>
                        {suggestion.icon}
                      </span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          marginBottom: '2px',
                          color: computedColorScheme === "dark" ? '#e5e7eb' : '#374151'
                        }}>
                          {suggestion.title}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: computedColorScheme === "dark" ? '#9ca3af' : '#6b7280'
                        }}>
                          {suggestion.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Continue Writing Button with BlockNote-style animations */}
          {continueState.isVisible && !isAutoContinuing && !aiStreamingState.isStreaming && !aiStreamingState.showControls && (
            <div
              ref={continueRef}
              className="continue-button-wrapper"
              style={{
                position: 'fixed',
                left: continueState.position.x,
                top: continueState.position.y,
                zIndex: 999,
                pointerEvents: 'auto',
                transition: 'all 0.2s ease-out' // Smooth transition for position changes
              }}
            >
              <Tooltip label="Lanjutkan Menulis dengan AI" position="top" withArrow>
                <ActionIcon
                  className="continue-button"
                  size="lg"
                  radius="xl"
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'cyan' }}
                  onClick={() => handleInlineAIAction('continue')}
                  style={{
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.2)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    backdropFilter: 'blur(10px)',
                    position: 'relative',
                    overflow: 'visible'
                  }}
                >
                  <IconSparkles
                    className="icon-sparkle"
                    size={18}
                    style={{
                      filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))'
                    }}
                  />
                </ActionIcon>
              </Tooltip>
            </div>
          )}

          {/* NEW: AI Streaming Controls */}
          {aiStreamingState.showControls && aiStreamingState.currentBlock && (
            <div
              ref={streamingControlsRef}
              className="ai-streaming-controls"
              style={{
                position: 'fixed',
                right: '20px',
                bottom: '20px',
                zIndex: 1000,
                pointerEvents: 'auto'
              }}
            >
              <Paper
                p="md"
                radius="lg"
                className="ai-streaming-overlay"
                style={{
                  background: computedColorScheme === "dark"
                    ? "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 197, 253, 0.15))"
                    : "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 197, 253, 0.1))",
                  border: `2px solid ${computedColorScheme === "dark" ? "rgba(59, 130, 246, 0.4)" : "rgba(59, 130, 246, 0.3)"}`,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
                }}
              >
                <Stack gap="sm" align="center">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconSparkles size={18} color="#3b82f6" />
                    <Text size="sm" fw={500} c="blue">
                      AI telah selesai menulis
                    </Text>
                  </div>

                  <Group gap="sm">
                    <Tooltip label="Terima dan gunakan konten yang dihasilkan AI">
                      <Button
                        size="sm"
                        variant="gradient"
                        gradient={{ from: 'green', to: 'teal' }}
                        leftSection={<IconCheck size={16} />}
                        onClick={acceptAIContent}
                        style={{ fontWeight: 600 }}
                      >
                        Setuju
                      </Button>
                    </Tooltip>

                    <Tooltip label="Tolak dan kembalikan ke konten sebelumnya">
                      <Button
                        size="sm"
                        variant="outline"
                        color="red"
                        leftSection={<IconX size={16} />}
                        onClick={revertAIContent}
                        style={{ fontWeight: 600 }}
                      >
                        kembalikan
                      </Button>
                    </Tooltip>

                    <Tooltip label="Hapus konten AI dan mulai ulang dari awal">
                      <Button
                        size="sm"
                        variant="outline"
                        color="blue"
                        leftSection={<IconRefresh size={16} />}
                        onClick={() => {
                          revertAIContent();
                          setTimeout(() => handleInlineAIAction('continue'), 100);
                        }}
                        style={{ fontWeight: 600 }}
                      >
                        Mulai Ulang
                      </Button>
                    </Tooltip>
                  </Group>
                </Stack>
              </Paper>
            </div>
          )}

          {/* MODERN & ELEGANT: AI Processing Indicator */}
          {(aiProgressState.isLoading && !aiModalOpened) && (
            <>
              {/* Glassmorphism overlay with modern design */}
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6))',
                  backdropFilter: 'blur(20px)',
                  zIndex: 999999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'auto'
                }}
              >
                <div
                  style={{
                    background: computedColorScheme === "dark"
                      ? 'linear-gradient(145deg, rgba(26, 27, 30, 0.95), rgba(30, 32, 36, 0.95))'
                      : 'linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95))',
                    border: computedColorScheme === "dark"
                      ? '1px solid rgba(59, 130, 246, 0.3)'
                      : '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '20px',
                    padding: '40px 32px',
                    boxShadow: computedColorScheme === "dark"
                      ? '0 25px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                      : '0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                    minWidth: '380px',
                    maxWidth: '420px',
                    textAlign: 'center',
                    backdropFilter: 'blur(20px)',
                    animation: 'fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginTop: '80px'
                  }}
                >
                  {/* Animated icon container */}
                  <div style={{
                    marginBottom: '24px',
                    position: 'relative'
                  }}>
                    <RingProgress
                      size={120}
                      thickness={8}
                      sections={[{ value: aiProgressState.progress, color: 'blue' }]}
                      label={
                        <Center>
                          <Stack gap="xs" align="center">
                            <IconSparkles
                              size={28}
                              color="#3b82f6"
                              style={{
                                animation: 'sparkle-rotate 3s linear infinite'
                              }}
                            />
                            <Text size="lg" fw={700} c="blue">
                              {aiProgressState.progress}%
                            </Text>
                          </Stack>
                        </Center>
                      }
                    />
                  </div>

                  {/* Modern typography */}
                  <Text
                    size="xl"
                    fw={700}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      marginBottom: '8px',
                      fontSize: '24px'
                    }}
                  >
                    {aiProgressState.stage}
                  </Text>
                  <Text
                    size="md"
                    c="dimmed"
                    style={{
                      fontSize: '16px',
                      lineHeight: 1.5,
                      opacity: 0.8,
                      marginBottom: '16px'
                    }}
                  >
                    Menghasilkan konten berkualitas dengan AI
                  </Text>

                  {/* Enhanced progress bar */}
                  <Progress
                    value={aiProgressState.progress}
                    size="lg"
                    radius="xl"
                    color="blue"
                    style={{ width: "100%" }}
                  />

                  <Text size="sm" c="dimmed" mt="sm">
                    Estimasi: {Math.round((100 - aiProgressState.progress) * 0.08)}s tersisa
                  </Text>
                </div>
              </div>
            </>
          )}

          {/* MODERN & ELEGANT: AI Streaming Indicator */}
          {aiStreamingState.isStreaming && (
            <>
              {/* Sleek streaming indicator */}
              <div
                style={{
                  position: 'fixed',
                  top: '100px',
                  right: '24px',
                  zIndex: 999997,
                  pointerEvents: 'none'
                }}
              >
                <div
                  style={{
                    background: computedColorScheme === "dark"
                      ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15))'
                      : 'linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95))',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    boxShadow: computedColorScheme === "dark"
                      ? '0 12px 32px rgba(16, 185, 129, 0.2)'
                      : '0 12px 32px rgba(16, 185, 129, 0.15)',
                    minWidth: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backdropFilter: 'blur(20px)',
                    animation: 'slide-up 0.4s ease-out'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'sparkle-pulse 2s ease-in-out infinite'
                  }}>
                    <IconSparkles
                      size={20}
                      color="white"
                      style={{
                        animation: 'sparkle-rotate 2s linear infinite'
                      }}
                    />
                  </div>
                  <div>
                    <Text
                      size="md"
                      fw={600}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '2px'
                      }}
                    >
                      AI sedang menulis
                    </Text>
                    <Text size="sm" c="dimmed" style={{ opacity: 0.7 }}>
                      {aiStreamingState.currentChunk}/{aiStreamingState.totalChunks} kata ({aiStreamingState.progress}%)
                    </Text>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* MODERN & ELEGANT: Auto Continue */}
          {isAutoContinuing && (
            <>
              {/* Premium glassmorphism overlay */}
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.2))',
                  backdropFilter: 'blur(20px)',
                  zIndex: 999995,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div
                  style={{
                    background: computedColorScheme === "dark"
                      ? 'linear-gradient(145deg, rgba(26, 27, 30, 0.95), rgba(30, 32, 36, 0.95))'
                      : 'linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95))',
                    border: computedColorScheme === "dark"
                      ? '1px solid rgba(139, 92, 246, 0.3)'
                      : '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '20px',
                    padding: '40px 32px',
                    boxShadow: computedColorScheme === "dark"
                      ? '0 25px 50px rgba(139, 92, 246, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                      : '0 25px 50px rgba(139, 92, 246, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                    minWidth: '380px',
                    maxWidth: '420px',
                    textAlign: 'center',
                    backdropFilter: 'blur(20px)',
                    animation: 'fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginTop: '80px'
                  }}
                >
                  <div style={{
                    marginBottom: '24px',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      animation: 'sparkle-pulse 2s ease-in-out infinite',
                      boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)'
                    }}>
                      <IconWand
                        size={32}
                        color="white"
                        style={{
                          animation: 'sparkle-rotate 3s linear infinite'
                        }}
                      />
                    </div>
                  </div>

                  <Text
                    size="xl"
                    fw={700}
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      marginBottom: '8px',
                      fontSize: '24px'
                    }}
                  >
                    AI Auto Continue
                  </Text>
                  <Text
                    size="md"
                    c="dimmed"
                    style={{
                      fontSize: '16px',
                      lineHeight: 1.5,
                      opacity: 0.8
                    }}
                  >
                    Melanjutkan tulisan dengan konteks cerdas
                  </Text>
                </div>
              </div>
            </>
          )}

          {/* Minimal status indicator */}
          {(aiStreamingState.isStreaming || aiProgressState.isLoading || isAutoContinuing) && (
            <div
              style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 999999,
                background: computedColorScheme === "dark"
                  ? 'rgba(34, 197, 94, 0.9)'
                  : 'rgba(34, 197, 94, 1)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <IconSparkles size={12} /> AI Active
            </div>
          )}
        </div>

        {/* Enhanced AI Modal */}
        <Modal
          opened={aiModalOpened}
          onClose={closeModalAndReset}
          title={
            <Group gap="md">
              <ThemeIcon
                size="lg"
                gradient={aiMode === "auto" ? { from: 'blue', to: 'cyan' } : { from: 'blue', to: 'cyan' }}
                variant="gradient"
              >
                {aiMode === "auto" ? <IconSparkles size={20} /> : <IconSparkles size={20} />}
              </ThemeIcon>
              <Text fw={700} size="xl">
                {aiMode === "continue" ? " AI Lanjutan Konten" :
                  aiMode === "auto" ? " AI Otomatis - Tanpa Prompt" :
                    "AI dengan Prompt"}
              </Text>
            </Group>
          }
          size="xl"
          radius="lg"
          padding="xl"
          centered
          styles={{
            content: { borderRadius: '16px' },
            header: { borderBottom: `2px solid ${computedColorScheme === "dark" ? "#404040" : "#dee2e6"}` }
          }}
        >
          <Stack gap="xl">
            {/* DEBUG: Check generated content state */}
            <Text size="xs" c="gray" style={{position: 'absolute', top: 5, right: 5}}>
              Debug: {generatedContent ? `Has content (${generatedContent.length} chars)` : 'No content'}
            </Text>
            {!generatedContent ? (
              <>
                {/* Prompt Input - ONLY show for non-auto modes */}
                {aiMode !== "auto" && (
                  <Paper p="lg" radius="md" bg={computedColorScheme === "dark" ? "dark.6" : "gray.1"}>
                    <Stack gap="md">
                      <Group justify="space-between">
                        <Group gap="xs">
                          <IconBulb size={20} />
                          <Text fw={500} size="md">
                            Topik atau Kata Kunci
                          </Text>
                        </Group>
                        <Tooltip label="Bersihkan semua input dan mulai dari awal">
                          <Button
                            variant="subtle"
                            color="gray"
                            onClick={clearInputs}
                            size="xs"
                          >
                            Bersihkan
                          </Button>
                        </Tooltip>
                      </Group>
                      <Textarea
                        placeholder="Untuk mode 'Struktur' - jelaskan topik secara umum . Untuk mode 'Konten' - masukkan bab/sub bab spesifik. Untuk mode 'Kalimat' - berikan konteks atau arah lanjutan "
                        value={prompt}
                        onChange={(event) => setPrompt(event.currentTarget.value)}
                        minRows={3}
                        maxRows={6}
                        autosize
                        size="md"
                        styles={{
                          input: {
                            fontSize: '14px',
                            lineHeight: 1.5,
                            border: `1px solid ${computedColorScheme === "dark" ? "#495057" : "#ced4da"}`,
                          }
                        }}
                      />
                    </Stack>
                  </Paper>
                )}

                {/* Info untuk AI Lanjutan */}
                {aiMode === "continue" && (
                  <Paper p="lg" radius="md" bg="blue.0">
                    <Stack gap="md">
                      <Group>
                        <IconRobot size={20} />
                        <Text fw={500} size="md" c="blue">
                          AI akan otomatis melanjutkan konten yang sudah ada
                        </Text>
                      </Group>
                      <Text size="sm" c="blue">
                        AI akan menganalisis judul/subjudul di editor dan melengkapi konten yang masih kosong atau singkat.
                      </Text>
                    </Stack>
                  </Paper>
                )}

                {/* AI Templates Grid */}
                <Stack gap="md">
                  <Text fw={500} size="lg" c="dimmed">
                    {aiMode === "auto" ? "Pilih mode generate:" : "Pilih mode generate: "}
                  </Text>

                  <SimpleGrid cols={aiMode === "continue" ? 1 : 3} spacing="lg">
                    {(() => {
                      if (aiMode === "continue") {
                        return [{
                          title: "Lanjutkan Konten",
                          description: "AI akan melengkapi judul yang masih kosong dengan konten detail",
                          type: "content",
                          color: "green",
                          icon: IconEdit,
                          defaultPrompt: "Lanjutkan dan lengkapi konten",
                          behavior: "add"
                        }];
                      } else if (aiMode === "auto") {
                        return aiAutoTemplates;
                      }
                      return aiTemplates;
                    })().map((template) => (
                      <Card
                        key={template.type}
                        p="xs"
                        withBorder
                        radius="md"
                        style={{
                          cursor: "pointer",
                          transition: 'all 0.2s ease',
                          height: '200px', // Increased height for better visibility
                        }}
                        onClick={() => {
                          console.log("Template clicked:", template.title, "Mode:", aiMode, "Type:", template.type, "Behavior:", template.behavior);
                          if (aiMode === "auto") {
                            // Auto mode - no prompt needed
                            handleAIAutoGeneration(template.type, template.behavior);
                          } else {
                            // Manual mode - need prompt
                            const finalPrompt = prompt.trim() || ('defaultPrompt' in template ? template.defaultPrompt : "Generate content");
                            console.log("Final prompt:", finalPrompt);
                            handleAIGeneration(finalPrompt, template.type, template.behavior);
                          }
                        }}
                      >
                        <Stack gap="xs" align="center" justify="center" h="100%">
                          <ThemeIcon
                            size="xl"
                            color={template.color}
                            variant="light"
                            radius="md"
                          >
                            <template.icon size={24} />
                          </ThemeIcon>
                          <Text size="md" fw={500} ta="center" lh={1.1}>
                            {template.title}
                          </Text>
                          <Text size="xs" c="dimmed" ta="center" px="lg">
                            {template.description}
                          </Text>
                        </Stack>
                      </Card>
                    ))}
                  </SimpleGrid>
                </Stack>

                {/* Enhanced Loading State with Progress */}
                {aiProgressState.isLoading && (
                  <Paper p="xl" radius="md" bg="blue.0">
                    <Stack gap="md" align="center">
                      <RingProgress
                        size={80}
                        thickness={8}
                        sections={[{ value: aiProgressState.progress, color: 'blue' }]}
                        label={
                          <Center>
                            <Text size="lg" fw={700} c="blue">
                              {aiProgressState.progress}%
                            </Text>
                          </Center>
                        }
                      />
                      <Stack gap="xs" align="center">
                        <Text size="lg" c="blue" fw={600}>
                          {aiProgressState.stage}
                        </Text>
                        <Progress
                          value={aiProgressState.progress}
                          size="md"
                          radius="xl"
                          color="blue"
                          style={{ width: "100%" }}
                        />
                        <Text size="sm" c="blue">
                          Estimasi: {Math.round((100 - aiProgressState.progress) * 0.1)}s tersisa
                        </Text>
                      </Stack>
                    </Stack>
                  </Paper>
                )}
              </>
            ) : (
              /* Generated Content Display */
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <div>
                    <Text fw={600} size="lg" c="blue" component="span">
                      <IconSparkles size={20} /> Konten Yang Dihasilkan
                    </Text>
                    {aiMode === "continue" && (
                      <Badge size="sm" color="green" variant="light" ml="sm">
                        Mode Lanjutkan
                      </Badge>
                    )}
                    {aiMode === "auto" && (
                      <Badge size="sm" color="blue" variant="light" ml="sm">
                        Mode Otomatis
                      </Badge>
                    )}
                    {currentAIType && (
                      <Badge size="sm" color="blue" variant="light" ml="sm">
                        {currentAIType === "structure" ? "Struktur" :
                          currentAIType === "content" ? "Konten" : "Kalimat"}
                      </Badge>
                    )}
                  </div>
                  <CopyButton value={generatedContent} timeout={2000}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? "Konten sudah tersalin!" : "Salin konten ke clipboard"}>
                        <Button
                          leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                          variant="light"
                          color={copied ? "teal" : "gray"}
                          onClick={copy}
                          size="sm"
                        >
                          {copied ? "Tersalin!" : "Salin Teks"}
                        </Button>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>

                {/* Content Preview */}
                <Paper
                  p="lg"
                  radius="md"
                  style={{
                    height: '500px',
                    overflow: 'auto',
                    border: `1px solid ${computedColorScheme === "dark" ? "#495057" : "#dee2e6"}`,
                    background: computedColorScheme === "dark" ? "#2c2e33" : "#f8f9fa",
                  }}
                >
                  <Text
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'Inter, sans-serif',
                      lineHeight: 1.6,
                    }}
                    size="sm"
                  >
                    {generatedContent}
                  </Text>
                </Paper>

                {/* Action Buttons */}
                <Group gap="md" grow>
                  <Tooltip label="Masukkan konten AI yang dihasilkan ke dalam editor">
                    <Button
                      size="lg"
                      variant="gradient"
                      gradient={{ from: 'blue', to: 'cyan' }}
                      leftSection={<IconPencil size={20} />}
                      onClick={() => {
                        const behaviorMap: { [key: string]: string } = {
                          "structure": "rewrite",
                          "content": currentAIType === "content" && aiMode === "auto" ? "add" : "content_cursor",
                          "sentence": currentAIType === "sentence" && aiMode === "auto" ? "add" : "cursor"
                        };
                        const behavior = behaviorMap[currentAIType] || "rewrite";
                        insertContentToEditor(behavior);
                      }}
                      style={{
                        height: '50px',
                        fontWeight: 600,
                      }}
                    >
                      {currentAIType === "structure" ? "Ganti Semua Struktur" :
                        (currentAIType === "content" && aiMode === "auto") ? "Tambah Konten" :
                          currentAIType === "content" ? "Tambah di Heading" :
                            (currentAIType === "sentence" && aiMode === "auto") ? "Tambah Kalimat" :
                              currentAIType === "sentence" ? "Lanjutkan di Cursor" :
                                aiMode === "continue" ? "Tambahkan ke Editor" : "Masukkan ke Editor"}
                    </Button>
                  </Tooltip>

                  <Tooltip label="Hapus konten saat ini dan generate ulang dengan AI">
                    <Button
                      size="lg"
                      variant="outline"
                      color="gray"
                      leftSection={<IconSparkles size={20} />}
                      onClick={() => {
                        setGeneratedContent("");
                        if (aiMode !== "auto") {
                          setPrompt("");
                        }
                      }}
                      style={{
                        height: '50px',
                        fontWeight: 600,
                      }}
                    >
                      Generate Ulang
                    </Button>
                  </Tooltip>
                </Group>

                {/* Behavior Info */}
                <Paper p="md" radius="md" bg={computedColorScheme === "dark" ? "dark.7" : "gray.0"}>
                  <Group gap="xs" justify="center">
                    <IconInfoCircle size={18} />
                    <Text size="sm" c="dimmed" ta="center">
                      {currentAIType === "structure" && "Mode Struktur akan mengganti semua konten yang ada."}
                      {(currentAIType === "content" && aiMode === "auto") && "Mode Konten Otomatis akan menambahkan konten di posisi kursor."}
                      {(currentAIType === "content" && aiMode !== "auto") && "Mode Konten akan menambahkan konten di bawah heading saat ini."}
                      {(currentAIType === "sentence") && "Mode Kalimat akan melanjutkan tulisan di posisi kursor."}
                    </Text>
                  </Group>
                </Paper>
              </Stack>
            )}
          </Stack>
        </Modal>

        {/* NEW: Modern & Elegant Delete Confirmation Modal */}
        <Modal
          opened={deleteConfirmationOpened}
          onClose={closeDeleteConfirmation}
          centered
          withCloseButton={false}
          radius="lg"
          padding="xl"
          size="md"
        >
          <Stack gap="lg" align="center">
            <ThemeIcon color="red" size={60} radius="xl" variant="light">
              <IconAlertTriangle size={32} />
            </ThemeIcon>
            <Stack gap={0} align="center">
              <Text size="xl" fw={700} ta="center">
                Anda Yakin Ingin Menghapus?
              </Text>
              <Text c="dimmed" ta="center">
                Semua konten dalam editor akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
              </Text>
            </Stack>
            <Group grow w="100%">
              <Tooltip label="Batalkan dan kembali ke editor">
                <Button
                  variant="default"
                  onClick={closeDeleteConfirmation}
                  size="md"
                >
                  Batal
                </Button>
              </Tooltip>
              <Tooltip label="Konfirmasi hapus semua konten (tidak dapat dibatalkan)">
                <Button
                  color="red"
                  onClick={handleDelete}
                  size="md"
                >
                  Ya, Hapus Semua
                </Button>
              </Tooltip>
            </Group>
          </Stack>
        </Modal>

        {/* LaTeX Modal with Suspense */}
        {isLatexModalOpen && (
          <React.Suspense fallback={null}>
            <LaTeXModal
              opened={isLatexModalOpen}
              onClose={closeLatexModal}
              onInsert={handleLatexInsert}
            />
          </React.Suspense>
        )}

        {/* Search Modal with Suspense */}
        {searchModalOpened && (
          <React.Suspense fallback={null}>
            <SearchModal
              opened={searchModalOpened}
              onClose={closeSearchModal}
              searchMode={searchMode}
              onSearch={handleSearch}
              onReplace={handleReplace}
              currentMatch={0}
              totalMatches={0}
            />
          </React.Suspense>
        )}

        {/* Go to Line Modal with Suspense */}
        {goToLineModalOpened && (
          <React.Suspense fallback={null}>
            <GoToLineModal
              opened={goToLineModalOpened}
              onClose={closeGoToLineModal}
              onGoToLine={handleGoToLine}
              maxLines={editor?.document?.length || 1000}
            />
          </React.Suspense>
        )}

      </>
    );
  });

export default BlockNoteEditorComponent;
export type { BlockNoteEditorRef };