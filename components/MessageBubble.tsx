'use client'

import React, { useState } from 'react';
import { Message, Attachment, Agent } from '../types';
import Avatar from './Avatar';
import { Brain, Zap, Loader2, FileText, FileCode, File as FileIcon, Copy, ThumbsUp, ThumbsDown, Check, Pin, Reply, CornerDownRight, Gavel, Briefcase, LineChart, Code, Mic2 } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  agentMap?: Record<string, Agent>; // Map ID to Agent
  agentNameOverride?: string;
  onPin?: (id: string) => void;
  onReply?: (id: string) => void;
  onFeedback?: (id: string, value: 'up' | 'down') => void;
  showThreadConnector?: boolean;
  hasNextAgent?: boolean;
}

// --- Markdown Parsing Helpers ---

const parseBoldAndInlineCode = (text: string) => {
  const codeParts = text.split(/(`[^`]+`)/g);
  return codeParts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
       return (
         <code key={index} className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-[0.9em] border border-slate-200 mx-0.5">
            {part.slice(1, -1)}
         </code>
       );
    }
    const boldParts = part.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((subPart, subIndex) => {
      if (subPart.startsWith('**') && subPart.endsWith('**')) {
        return <strong key={`${index}-${subIndex}`} className="font-bold text-slate-900">{subPart.slice(2, -2)}</strong>;
      }
      return <span key={`${index}-${subIndex}`}>{subPart}</span>;
    });
  });
};

const renderMessageContent = (content: string) => {
    const blocks = [];
    const lines = content.split('\n');
    let currentType: 'text' | 'code' | 'quote' | 'list' = 'text';
    let currentContent: string[] = [];
    let codeLang = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('```')) {
            if (currentType === 'code') {
                blocks.push({ type: 'code', content: currentContent, lang: codeLang });
                currentContent = [];
                currentType = 'text';
            } else {
                if (currentContent.length > 0) {
                    blocks.push({ type: currentType, content: currentContent });
                    currentContent = [];
                }
                codeLang = line.trim().slice(3);
                currentType = 'code';
            }
            continue;
        }
        if (currentType === 'code') {
            currentContent.push(line);
            continue;
        }
        if (line.startsWith('> ')) {
            if (currentType !== 'quote') {
                if (currentContent.length > 0) {
                    blocks.push({ type: currentType, content: currentContent });
                    currentContent = [];
                }
                currentType = 'quote';
            }
            currentContent.push(line.slice(2));
            continue;
        }
        const isList = line.trim().startsWith('- ') || line.trim().startsWith('* ') || /^\d+\.\s/.test(line.trim());
        if (isList) {
             if (currentType !== 'list') {
                if (currentContent.length > 0) {
                    blocks.push({ type: currentType, content: currentContent });
                    currentContent = [];
                }
                currentType = 'list';
             }
             currentContent.push(line);
             continue;
        }
        if (currentType !== 'text') {
            if (currentContent.length > 0) {
                blocks.push({ type: currentType, content: currentContent });
                currentContent = [];
            }
            currentType = 'text';
        }
        currentContent.push(line);
    }
    if (currentContent.length > 0) {
        blocks.push({ type: currentType, content: currentContent, lang: codeLang });
    }

    return blocks.map((block, idx) => {
        if (block.type === 'code') {
            return (
                <div key={idx} className="my-3 rounded-lg overflow-hidden bg-slate-900 shadow-sm border border-slate-800">
                    <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                       <span className="text-xs font-mono text-slate-400">{block.lang || 'Code'}</span>
                       <Copy size={12} className="text-slate-500 cursor-pointer hover:text-slate-300" />
                    </div>
                    <pre className="p-4 text-xs md:text-sm font-mono text-slate-300 overflow-x-auto whitespace-pre scrollbar-thin">
                        {block.content.join('\n')}
                    </pre>
                </div>
            );
        }
        if (block.type === 'quote') {
            return (
                <blockquote key={idx} className="border-l-4 border-slate-300 pl-4 py-2 my-3 bg-slate-50/50 italic text-slate-600 rounded-r-lg">
                    {block.content.map((line, lIdx) => (
                        <div key={lIdx}>{parseBoldAndInlineCode(line)}</div>
                    ))}
                </blockquote>
            );
        }
        if (block.type === 'list') {
            return (
                <ul key={idx} className="my-3 space-y-1.5 ml-1">
                    {block.content.map((line, lIdx) => (
                        <li key={lIdx} className="flex gap-2 items-start">
                            <span className="text-slate-400 mt-1.5 text-[10px] shrink-0">●</span>
                            <span className="leading-relaxed">{parseBoldAndInlineCode(line.replace(/^[-*]\s|^\d+\.\s/, ''))}</span>
                        </li>
                    ))}
                </ul>
            );
        }
        return (
            <div key={idx} className="whitespace-pre-wrap my-1 leading-relaxed">
               {block.content.join('\n').split('\n').map((line, lIdx) => (
                   <React.Fragment key={lIdx}>
                       {lIdx > 0 && <br />}
                       {parseBoldAndInlineCode(line)}
                   </React.Fragment>
               ))}
            </div>
        );
    });
};

// --- Component ---

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  agentMap,
  agentNameOverride, 
  onPin, 
  onReply, 
  onFeedback,
  showThreadConnector,
  hasNextAgent
}) => {
  const isUser = message.sender_type === 'user';
  const agent = (!isUser && agentMap) ? agentMap[message.sender_id] : null;
  const isThinking = message.metadata?.isThinking;
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const isRelated = !!message.metadata?.relatedToMessageId;
  
  const [copied, setCopied] = useState(false);
  const displayName = isUser ? 'You' : (agentNameOverride || agent?.name || 'Agent');

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const spacingClass = showThreadConnector ? '-mt-5 mb-2' : 'mb-6';
  let containerClass = `flex w-full ${spacingClass} group transition-all relative`;
  let bubbleClass = 'relative px-5 py-4 rounded-2xl shadow-sm max-w-[85%] md:max-w-[75%] text-sm leading-relaxed transition-all';
  let metaClass = 'flex items-center gap-2 mb-1 px-1 text-xs font-medium';
  
  // Styles based on Agent Color
  const getAgentStyles = (color?: string) => {
      switch(color) {
          case 'blue': return { bg: 'bg-white', border: 'border-blue-200', text: 'text-blue-600', fill: 'fill-blue-600', icon: <Zap size={12} /> };
          case 'amber': return { bg: 'bg-amber-50/50', border: 'border-amber-100', text: 'text-amber-700', fill: 'fill-amber-600', icon: <Brain size={12} /> };
          case 'purple': return { bg: 'bg-purple-50/50', border: 'border-purple-100', text: 'text-purple-700', fill: 'fill-purple-600', icon: <Gavel size={12} /> };
          case 'green': return { bg: 'bg-green-50/50', border: 'border-green-100', text: 'text-green-700', fill: 'fill-green-600', icon: <LineChart size={12} /> };
          case 'teal': return { bg: 'bg-teal-50/50', border: 'border-teal-100', text: 'text-teal-700', fill: 'fill-teal-600', icon: <Briefcase size={12} /> };
          case 'pink': return { bg: 'bg-pink-50/50', border: 'border-pink-100', text: 'text-pink-700', fill: 'fill-pink-600', icon: <Code size={12} /> };
          case 'emerald': return { bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-800', fill: 'fill-emerald-600', icon: <Check size={12} /> };
          case 'rose': return { bg: 'bg-rose-50/50', border: 'border-rose-100', text: 'text-rose-800', fill: 'fill-rose-600', icon: <Mic2 size={12} /> };
          case 'slate': return { bg: 'bg-slate-100/50', border: 'border-slate-200', text: 'text-slate-600', fill: 'fill-slate-500', icon: <Gavel size={12} /> };
          case 'indigo': return { bg: 'bg-indigo-50/50', border: 'border-indigo-100', text: 'text-indigo-700', fill: 'fill-indigo-600', icon: <Brain size={12} /> };
          case 'orange': return { bg: 'bg-orange-50/50', border: 'border-orange-100', text: 'text-orange-700', fill: 'fill-orange-600', icon: <Zap size={12} /> };
          case 'cyan': return { bg: 'bg-cyan-50/50', border: 'border-cyan-100', text: 'text-cyan-700', fill: 'fill-cyan-600', icon: <Zap size={12} /> };
          default: return { bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-600', fill: 'fill-slate-600', icon: <Zap size={12} /> };
      }
  };

  const styles = getAgentStyles(agent?.ui_color);

  if (isUser) {
    containerClass += ' justify-end mb-8';
    bubbleClass += ' bg-slate-800 text-white rounded-br-none';
    metaClass += ' justify-end text-slate-500';
  } else {
    containerClass += ' justify-start';
    bubbleClass += ` rounded-bl-none border ${styles.bg} ${styles.border} text-slate-800`;
    metaClass += ` justify-start ${styles.text}`;
  }

  if (message.isPinned) {
      bubbleClass += isUser ? ' ring-2 ring-blue-400' : ' ring-2 ring-amber-400 bg-amber-50';
  }

  const renderAttachment = (att: Attachment) => {
      if (att.type === 'image' && att.url) {
          return (
            <div key={att.id} className="rounded-lg overflow-hidden border border-white/10 max-w-[200px] shadow-sm">
                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
            </div>
          );
      }
      let Icon = FileIcon;
      if (att.mimeType === 'application/pdf') Icon = FileText;
      if (att.mimeType.includes('code') || att.name.match(/\.(js|ts|py|json|html|css)$/)) Icon = FileCode;
      return (
          <div key={att.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isUser ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'} min-w-[200px]`}>
              <div className={`p-2 rounded-lg ${isUser ? 'bg-slate-600' : 'bg-slate-100'}`}>
                  <Icon size={20} className={isUser ? 'text-slate-300' : 'text-slate-500'} />
              </div>
              <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs truncate">{att.name}</p>
                  <p className={`text-[10px] ${isUser ? 'text-slate-400' : 'text-slate-500'}`}>{att.type === 'file' ? 'Document' : 'Image'}</p>
              </div>
          </div>
      );
  };

  return (
    <div className={containerClass}>
      {hasNextAgent && !isUser && (
        <div className="absolute top-5 bottom-0 left-5 w-0.5 bg-slate-200 -translate-x-1/2 z-0"></div>
      )}

      {!isUser && agent && (
        <div className="mr-3 flex-shrink-0 mt-0 z-10 relative">
           <Avatar 
             src={agent.avatar_url} 
             fallback={displayName} 
             senderType="agent"
             uiColor={agent.ui_color}
             size="md"
             className={isThinking ? 'animate-pulse' : ''}
           />
        </div>
      )}

      <div className={`flex flex-col max-w-full z-10 ${isUser ? 'items-end' : 'items-start'}`}>
         <div className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={metaClass}>
            {isUser ? (
                <span>You</span>
            ) : (
                <>
                {isRelated && <CornerDownRight size={10} className="text-slate-400 mr-0.5" />}
                {styles.icon}
                <span>{displayName}</span>
                </>
            )}
            <span className="text-slate-400 font-normal ml-1">• {message.created_at}</span>
            </div>
         </div>

        <div className={bubbleClass}>
            {message.isPinned && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-white p-1 rounded-full shadow-sm z-10">
                    <Pin size={10} fill="currentColor" />
                </div>
            )}

            {hasAttachments && (
                <div className="mb-3 flex gap-2 flex-wrap">
                    {message.attachments?.map(renderAttachment)}
                </div>
            )}

           {isThinking && !message.content ? (
             <div className="flex items-center gap-2 text-slate-400 italic">
               <Loader2 size={16} className="animate-spin" />
               <span>Thinking...</span>
             </div>
           ) : (
             <div className="min-w-0">
               {isUser ? (
                 <div className="whitespace-pre-wrap">{message.content}</div> 
               ) : (
                 <>
                    {renderMessageContent(message.content)}
                    {isThinking && (
                        <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-slate-400/50 animate-pulse rounded-sm"></span>
                    )}
                 </>
               )}
             </div>
           )}
        </div>
        
        {/* Actions only visible when not thinking completely, or if content is streaming */}
        {(!isThinking || message.content) && (
          <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end mr-1' : 'justify-start ml-1'} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
              <button onClick={handleCopy} className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors" title="Copy">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button onClick={() => onReply?.(message.id)} className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors" title="Reply">
                  <Reply size={14} />
              </button>
              <button onClick={() => onPin?.(message.id)} className={`p-1 rounded hover:bg-slate-100 transition-colors ${message.isPinned ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`} title="Pin">
                  <Pin size={14} fill={message.isPinned ? "currentColor" : "none"} />
              </button>
              {!isUser && (
                <>
                  <div className="w-px h-3 bg-slate-200 mx-1"></div>
                  <button onClick={() => onFeedback?.(message.id, 'up')} className={`p-1 rounded transition-colors ${message.feedback === 'up' ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-green-600 hover:bg-slate-100'}`}>
                    <ThumbsUp size={14} />
                  </button>
                  <button onClick={() => onFeedback?.(message.id, 'down')} className={`p-1 rounded transition-colors ${message.feedback === 'down' ? 'text-red-600 bg-red-50' : 'text-slate-400 hover:text-red-600 hover:bg-slate-100'}`}>
                    <ThumbsDown size={14} />
                  </button>
                </>
              )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="ml-3 flex-shrink-0 mt-auto">
          <Avatar fallback="ME" senderType="user" size="md" />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
