'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, X, Loader2, FileText, FileCode, UploadCloud } from 'lucide-react';
import { Attachment, Agent } from '../types';

interface ChatInputProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  onVoiceTranscription: (audioBase64: string, mimeType: string) => Promise<string>;
  disabled?: boolean;
  agents: Record<string, Agent>;
  activeQuote?: { text: string; id: number } | null;
  onClearQuote?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onVoiceTranscription, disabled, agents, activeQuote, onClearQuote }) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Mention State
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const lastQuoteId = useRef<number>(0);
  const dragCounter = useRef(0);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Handle incoming reply quotes
  useEffect(() => {
    if (activeQuote && activeQuote.id !== lastQuoteId.current) {
      lastQuoteId.current = activeQuote.id;
      setInput(prev => {
        const newVal = (prev ? prev + '\n\n' : '') + activeQuote.text;
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(newVal.length, newVal.length);
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
            }
        }, 10);
        return newVal;
      });
      onClearQuote?.();
    }
  }, [activeQuote, onClearQuote]);

  // Mention Logic
  useEffect(() => {
    const lastAtPos = input.lastIndexOf('@');
    if (lastAtPos !== -1) {
        const textAfterAt = input.slice(lastAtPos + 1);
        if (textAfterAt.includes(' ')) {
            setShowMentions(false);
        } else {
            setShowMentions(true);
            setMentionQuery(textAfterAt.toLowerCase());
            setMentionIndex(0);
        }
    } else {
        setShowMentions(false);
    }
  }, [input]);

  const getFilteredAgents = () => {
      return Object.values(agents).filter((a: Agent) => a.name.toLowerCase().startsWith(mentionQuery));
  };

  const insertMention = (agentName: string) => {
      const lastAtPos = input.lastIndexOf('@');
      const newInput = input.substring(0, lastAtPos) + `@${agentName} ` + input.substring(lastAtPos + mentionQuery.length + 1);
      setInput(newInput);
      setShowMentions(false);
      textareaRef.current?.focus();
  };

  const processFiles = (files: File[]) => {
      files.forEach((file: File) => {
          if (file.size > 10 * 1024 * 1024) {
              alert(`File ${file.name} is too large. Max 10MB.`);
              return;
          }

          const isImage = file.type.startsWith('image/');
          const isPDF = file.type === 'application/pdf';
          const isText = file.type.startsWith('text/') || 
                         /\.(md|json|csv|js|ts|py|jsx|tsx|html|css|txt)$/.test(file.name);

          const reader = new FileReader();
          
          if (isImage || isPDF) {
              reader.onload = (ev) => {
                  const result = ev.target?.result as string;
                  const base64Data = result.split(',')[1];
                  
                  const newAttachment: Attachment = {
                      id: Date.now().toString() + Math.random().toString(),
                      type: isImage ? 'image' : 'file',
                      name: file.name,
                      mimeType: file.type,
                      url: isImage ? result : undefined,
                      data: base64Data
                  };
                  setAttachments(prev => [...prev, newAttachment]);
              };
              reader.readAsDataURL(file);
          } else if (isText) {
              reader.onload = (ev) => {
                  const textContent = ev.target?.result as string;
                  const newAttachment: Attachment = {
                      id: Date.now().toString() + Math.random().toString(),
                      type: 'file',
                      name: file.name,
                      mimeType: file.type || 'text/plain',
                      textContent: textContent
                  };
                  setAttachments(prev => [...prev, newAttachment]);
              };
              reader.readAsText(file);
          } else {
              alert(`File type for ${file.name} not supported yet.`);
          }
      });
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
      if (e.clipboardData.files && e.clipboardData.files.length > 0) {
          e.preventDefault();
          processFiles(Array.from(e.clipboardData.files));
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          processFiles(Array.from(e.target.files));
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        if (audioBlob.size > 0) {
           await processAudioTranscription(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please ensure you have granted permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudioTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            const mimeType = blob.type || 'audio/webm';
            const text = await onVoiceTranscription(base64Data, mimeType);
            if (text) {
                setInput(prev => prev ? `${prev} ${text}` : text);
            }
            setIsTranscribing(false);
        };
        reader.readAsDataURL(blob);
    } catch (err) {
        console.error("Transcription failed", err);
        setIsTranscribing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
  };

  const removeAttachment = (id: string) => {
      setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || disabled || isTranscribing) return;
    onSendMessage(input, attachments);
    setInput('');
    setAttachments([]);
    setShowMentions(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    
    if (showMentions) {
        const filtered = getFilteredAgents();
        if (filtered.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex((prev) => (prev + 1) % filtered.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(filtered[mentionIndex].name);
                return;
            }
            if (e.key === 'Escape') {
                setShowMentions(false);
                return;
            }
        }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getFileIcon = (att: Attachment) => {
      if (att.type === 'image') return null;
      if (att.mimeType === 'application/pdf') return <FileText className="text-red-500" size={24} />;
      if (att.mimeType.includes('json') || att.mimeType.includes('javascript') || att.name.endsWith('.py') || att.name.endsWith('.ts')) return <FileCode className="text-green-600" size={24} />;
      return <FileText className="text-blue-500" size={24} />;
  };

  return (
    <div className="sticky bottom-0 z-20">
        {/* Gradient mask to fade content behind */}
        <div className="absolute inset-x-0 -top-24 h-24 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none" />

        <div className="p-4 md:pb-6 md:pt-2 transition-all relative">
      
            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-blue-50/90 border-2 border-dashed border-blue-400 flex flex-col items-center justify-center backdrop-blur-sm animate-fade-in m-2 rounded-3xl">
                    <UploadCloud size={48} className="text-blue-500 mb-2" />
                    <p className="text-lg font-semibold text-blue-700">Drop files here</p>
                </div>
            )}

            {/* Attachments Preview */}
            {attachments.length > 0 && (
                <div className="max-w-4xl mx-auto mb-3 flex gap-3 overflow-x-auto py-2 px-1 scrollbar-thin">
                    {attachments.map((att) => (
                        <div key={att.id} className="relative group flex-shrink-0 animate-scale-in">
                            {att.type === 'image' && att.url ? (
                                <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shadow-sm ring-2 ring-white">
                                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-16 h-16 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center p-1 gap-1 shadow-sm ring-2 ring-white">
                                    {getFileIcon(att)}
                                    <span className="text-[8px] text-slate-600 truncate w-full text-center font-medium px-1 leading-tight">{att.name}</span>
                                </div>
                            )}
                            <button 
                                onClick={() => removeAttachment(att.id)}
                                className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-0.5 shadow-md hover:bg-red-500 transition-colors z-10 scale-75 hover:scale-100"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
      
            {/* Mention Autocomplete Popup */}
            {showMentions && getFilteredAgents().length > 0 && (
                <div className="absolute bottom-full left-4 md:left-1/2 md:-translate-x-1/2 w-64 bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 ring-1 ring-black/5 overflow-hidden z-30 animate-fade-in-up mb-2">
                    <div className="px-3 py-2 bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Mention Agent
                    </div>
                    {getFilteredAgents().map((agent: Agent, idx) => (
                        <button
                            key={agent.id}
                            onClick={() => insertMention(agent.name)}
                            className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${idx === mentionIndex ? 'bg-blue-50/80' : 'hover:bg-slate-50/50'}`}
                        >
                            <div className={`w-6 h-6 rounded-full overflow-hidden flex items-center justify-center ring-1 ring-black/5`}>
                                <img src={agent.avatar_url} className="w-full h-full object-cover" />
                            </div>
                            <span className="font-medium text-slate-800">{agent.name}</span>
                        </button>
                    ))}
                </div>
            )}

            <form 
                onSubmit={handleSubmit} 
                className={`max-w-4xl mx-auto relative flex items-end gap-2 transition-all ${disabled ? 'opacity-50' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragEnter}
                onDrop={handleDrop}
            >
                
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden" 
                    multiple
                    accept="image/*,application/pdf,text/*,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py"
                />

                <div className={`
                    flex-1 relative flex items-end transition-all duration-200 ease-out
                    ${isRecording 
                        ? 'bg-red-50 border-red-200 ring-4 ring-red-50 shadow-lg' 
                        : 'bg-white border-slate-200 shadow-2xl hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10'
                    }
                    border rounded-3xl
                `}>
                    
                    {isRecording ? (
                        <div className="flex-1 h-[56px] flex items-center px-5 justify-between w-full">
                            <div className="flex items-center gap-3">
                                <div className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </div>
                                <span className="text-red-600 font-medium text-sm animate-pulse">Recording audio...</span>
                                {/* Mock Waveform */}
                                <div className="flex items-center gap-1 h-4 ml-4">
                                    {[1,2,3,2,4,5,3,2,1,2,3,4].map((h, i) => (
                                        <div 
                                            key={i} 
                                            className="w-1 bg-red-300 rounded-full animate-pulse" 
                                            style={{ height: `${h * 4}px`, animationDelay: `${i * 0.1}s` }}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={stopRecording}
                                className="text-xs font-bold text-red-600 bg-white border border-red-100 px-4 py-1.5 rounded-full hover:bg-red-50 transition-colors shadow-sm"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            <button 
                                type="button" 
                                disabled={disabled || isTranscribing} 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 ml-1 mb-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 self-end" 
                                title="Attach file"
                            >
                                <Paperclip size={20} className="rotate-45" />
                            </button>

                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                disabled={disabled || isRecording}
                                placeholder={
                                    isTranscribing ? "Transcribing..." :
                                    disabled ? "Agents are thinking..." : "Type a message..."
                                }
                                className="flex-1 max-h-[200px] bg-transparent !border-0 !ring-0 !outline-none !shadow-none resize-none text-slate-700 placeholder:text-slate-400 text-[15px] leading-relaxed py-3.5 px-2 scrollbar-thin"
                                style={{ boxShadow: 'none', border: 'none', outline: 'none' }}
                                rows={1}
                            />

                            <div className="flex items-center mb-1 mr-1 gap-1 self-end">
                                {!input.trim() && attachments.length === 0 && (
                                    <button 
                                        type="button" 
                                        disabled={disabled || isTranscribing} 
                                        onClick={toggleRecording}
                                        className={`p-3 rounded-xl transition-all duration-200 ${isTranscribing ? 'text-slate-400' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`} 
                                        title="Voice input"
                                    >
                                        {isTranscribing ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
                                    </button>
                                )}

                                {(input.trim() || attachments.length > 0) && (
                                    <button 
                                        type="submit" 
                                        disabled={disabled || isTranscribing}
                                        className="p-3 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
                                    >
                                        <Send size={18} className="ml-0.5" />
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>

            </form>
            
            <div className="text-center mt-3 flex items-center justify-center gap-4 opacity-50 hover:opacity-100 transition-opacity duration-300">
                <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                    <span className="hidden md:inline">Return to send • Shift + Return for new line • </span>
                    <span>Type @ to mention</span>
                </p>
            </div>
        </div>
    </div>
  );
};

export default ChatInput;
