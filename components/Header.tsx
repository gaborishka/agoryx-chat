'use client'

import React, { useState } from 'react';
import { Menu, Settings, Layers, Link as LinkIcon, Gavel, Users, ChevronDown, PlusCircle, Check, Repeat } from 'lucide-react';
import { ChatMode, Agent, ConversationAgentConfig } from '../types';
import Avatar from './Avatar';

interface HeaderProps {
  title: string;
  onToggleSidebar: () => void;
  chatMode: ChatMode;
  onSetChatMode: (mode: ChatMode) => void;
  onOpenDashboard: () => void;
  onOpenAgentConfig: () => void;
  agents: Record<string, Agent>;
  activeConfig: ConversationAgentConfig;
  onToggleCouncilExpert: (id: string) => void;
  enableAutoReply: boolean;
  onToggleAutoReply: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  onToggleSidebar, 
  chatMode,
  onSetChatMode,
  onOpenDashboard,
  onOpenAgentConfig,
  agents,
  activeConfig,
  onToggleCouncilExpert,
  enableAutoReply,
  onToggleAutoReply
}) => {
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showCouncilConfig, setShowCouncilConfig] = useState(false);

  const EXPERT_IDS = ['lawyer', 'economist', 'strategist', 'tech'];
  
  const sys1 = agents[activeConfig.system1Id];
  const sys2 = agents[activeConfig.system2Id];
  const councilIds = activeConfig.councilIds || [];

  const getModeLabel = (mode: ChatMode) => {
      switch(mode) {
          case 'collaborative': return 'Dual Core';
          case 'parallel': return 'Parallel';
          case 'expert-council': return 'Council';
          case 'debate': return 'Debate';
          default: return 'Chat';
      }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20 sticky top-0">
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-full lg:hidden text-slate-600"
        >
          <Menu size={20} />
        </button>
        
        <div className="flex flex-col">
          <h1 className="font-semibold text-slate-800 text-lg truncate max-w-[140px] sm:max-w-md">
            {title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500">
             {chatMode === 'expert-council' ? (
                <span className="text-purple-600 font-medium flex items-center gap-1">
                    <Users size={10} />
                    {councilIds.length} Experts Active
                </span>
             ) : chatMode === 'debate' ? (
                <span className="text-rose-600 font-medium flex items-center gap-1">
                    <Gavel size={10} />
                    Moderated Debate
                </span>
             ) : (
                <div className="flex items-center gap-2">
                   {sys1 && (
                      <span className="flex items-center gap-1 font-medium" style={{color: `var(--color-${sys1.ui_color}-600)`}}>
                          <span className={`w-1.5 h-1.5 rounded-full bg-${sys1.ui_color}-500`}></span>
                          {sys1.name}
                      </span>
                   )}
                   <span className="text-slate-300">|</span>
                   {sys2 && (
                      <span className="flex items-center gap-1 font-medium" style={{color: `var(--color-${sys2.ui_color}-600)`}}>
                          <span className={`w-1.5 h-1.5 rounded-full bg-${sys2.ui_color}-500`}></span>
                          {sys2.name}
                      </span>
                   )}
                </div>
             )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        
        {/* Auto-Reply / Extra Message Toggle */}
        <button
            onClick={onToggleAutoReply}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all mr-2 ${
                enableAutoReply 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
            title="Auto-Reply: Allow agents to reply to each other automatically"
        >
            <Repeat size={14} className={enableAutoReply ? 'text-indigo-600' : 'text-slate-400'} />
            <span className="hidden sm:inline">{enableAutoReply ? 'Auto-Reply On' : 'Auto-Reply Off'}</span>
        </button>

        {/* Expert Council Config Button */}
        {chatMode === 'expert-council' && (
            <div className="relative">
                <button 
                  onClick={() => setShowCouncilConfig(!showCouncilConfig)}
                  className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-purple-50 border border-purple-100 px-2 py-1.5 rounded-lg hover:bg-purple-100 transition-colors mr-2"
                >
                    <PlusCircle size={14} />
                    <span className="hidden sm:inline">Select Experts</span>
                </button>
                {showCouncilConfig && (
                   <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowCouncilConfig(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-40 p-2 animate-fade-in-up">
                        <div className="text-xs font-bold text-slate-400 px-2 py-1 mb-1 uppercase">Expert Panel</div>
                        {Object.values(agents).filter((a: Agent) => !a.isSystem || EXPERT_IDS.includes(a.id)).map((agent: Agent) => {
                            const isActive = councilIds.includes(agent.id);
                            return (
                                <button 
                                    key={agent.id}
                                    onClick={() => onToggleCouncilExpert(agent.id)}
                                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-purple-50 text-purple-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${isActive ? 'border-purple-200' : 'border-slate-200'}`}>
                                        <img src={agent.avatar_url} alt={agent.name} className="w-full h-full rounded-full" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-medium">{agent.name}</div>
                                        <div className="text-[10px] opacity-80 truncate">{agent.description}</div>
                                    </div>
                                    {isActive && <Check size={14} className="text-purple-600" />}
                                </button>
                            );
                        })}
                    </div>
                   </>
                )}
            </div>
        )}

        {/* Agents Config (Any Mode can now be configured) */}
        <button 
            onClick={onOpenAgentConfig}
            className="hidden sm:flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all mr-2 group"
        >
            {chatMode === 'debate' ? (
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center border border-white shadow-sm">
                    <Gavel size={12} />
                </div>
            ) : chatMode === 'expert-council' ? (
                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center border border-white shadow-sm">
                    <Users size={12} />
                </div>
            ) : (
                <div className="flex -space-x-2">
                    {sys1 && (
                    <div className="w-6 h-6 rounded-full ring-2 ring-white z-10 overflow-hidden bg-white">
                        <img src={sys1.avatar_url} alt={sys1.name} className="w-full h-full object-cover" />
                    </div>
                    )}
                    {sys2 && (
                    <div className="w-6 h-6 rounded-full ring-2 ring-white z-0 overflow-hidden bg-white">
                        <img src={sys2.avatar_url} alt={sys2.name} className="w-full h-full object-cover" />
                    </div>
                    )}
                </div>
            )}
            <span className="group-hover:text-indigo-600 transition-colors">Configure</span>
        </button>

        {/* Mode Selector */}
        <div className="relative">
            <button
                onClick={() => setShowModeMenu(!showModeMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all bg-slate-50/50"
            >
                {chatMode === 'collaborative' && <Layers size={14} className="text-indigo-600" />}
                {chatMode === 'parallel' && <LinkIcon size={14} className="text-indigo-600" />}
                {chatMode === 'expert-council' && <Users size={14} className="text-purple-600" />}
                {chatMode === 'debate' && <Gavel size={14} className="text-rose-600" />}
                <span className="hidden sm:inline">{getModeLabel(chatMode)}</span>
                <ChevronDown size={12} className="text-slate-400" />
            </button>

            {showModeMenu && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowModeMenu(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-40 py-1 animate-fade-in-up">
                        <button 
                            onClick={() => { onSetChatMode('collaborative'); setShowModeMenu(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-50 ${chatMode === 'collaborative' ? 'text-indigo-600 font-medium bg-indigo-50/50' : 'text-slate-600'}`}
                        >
                            <Layers size={16} /> Dual Core
                        </button>
                        <button 
                            onClick={() => { onSetChatMode('parallel'); setShowModeMenu(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-50 ${chatMode === 'parallel' ? 'text-indigo-600 font-medium bg-indigo-50/50' : 'text-slate-600'}`}
                        >
                            <LinkIcon size={16} /> Parallel
                        </button>
                        <div className="h-px bg-slate-100 my-1"></div>
                        <button 
                            onClick={() => { onSetChatMode('expert-council'); setShowModeMenu(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-50 ${chatMode === 'expert-council' ? 'text-purple-600 font-medium bg-purple-50/50' : 'text-slate-600'}`}
                        >
                            <Users size={16} /> Expert Council
                        </button>
                        <button 
                            onClick={() => { onSetChatMode('debate'); setShowModeMenu(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-50 ${chatMode === 'debate' ? 'text-rose-600 font-medium bg-rose-50/50' : 'text-slate-600'}`}
                        >
                            <Gavel size={16} /> Debate Mode
                        </button>
                    </div>
                </>
            )}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></div>

        <button 
          onClick={onOpenDashboard}
          className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          title="Settings & Billing"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
