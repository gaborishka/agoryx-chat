'use client'

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, RefreshCw, Zap, Brain, Gavel, Users, Settings, Search, CheckCircle, ChevronDown } from 'lucide-react';
import { Agent, UiColor, ConversationAgentConfig, ChatMode } from '../types';
import Avatar from './Avatar';

interface AgentConfigModalProps {
  agents: Record<string, Agent>;
  currentConfig: ConversationAgentConfig;
  chatMode: ChatMode;
  onUpdateAgents: (agents: Record<string, Agent>) => void;
  onUpdateConfig: (config: Partial<ConversationAgentConfig>) => void;
  onClose: () => void;
}

const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', type: 'Fast & Efficient' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', type: 'Complex Reasoning' },
  { id: 'gemini-2.5-flash-thinking', name: 'Gemini 2.5 Thinking', type: 'Deep Thought' },
];

const AVAILABLE_COLORS: { id: UiColor, bg: string }[] = [
  { id: 'blue', bg: 'bg-blue-500' },
  { id: 'amber', bg: 'bg-amber-500' },
  { id: 'purple', bg: 'bg-purple-500' },
  { id: 'green', bg: 'bg-green-500' },
  { id: 'teal', bg: 'bg-teal-500' },
  { id: 'pink', bg: 'bg-pink-500' },
  { id: 'rose', bg: 'bg-rose-500' },
  { id: 'emerald', bg: 'bg-emerald-500' },
  { id: 'slate', bg: 'bg-slate-500' },
  { id: 'indigo', bg: 'bg-indigo-500' },
  { id: 'orange', bg: 'bg-orange-500' },
  { id: 'cyan', bg: 'bg-cyan-500' },
];

const AgentConfigModal: React.FC<AgentConfigModalProps> = ({ 
  agents, currentConfig, chatMode, onUpdateAgents, onUpdateConfig, onClose 
}) => {
  // Navigation State: 'chat-settings' or agentId
  const [activeView, setActiveView] = useState<string>('chat-settings');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data State
  const [localAgents, setLocalAgents] = useState<Record<string, Agent>>({ ...agents });
  
  // --- Local Config State for Chat Settings View ---
  const [configState, setConfigState] = useState<ConversationAgentConfig>({ ...currentConfig });
  
  // --- Form State for Agent Editor View ---
  const [agentForm, setAgentForm] = useState<Partial<Agent>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);

  // When switching views, reset/load data
  useEffect(() => {
    if (activeView !== 'chat-settings') {
        const agent = localAgents[activeView];
        if (agent) {
            setAgentForm({ ...agent });
            setIsFormDirty(false);
        }
    }
  }, [activeView, localAgents]);

  // -- Agent CRUD Operations --

  const handleAgentChange = (field: keyof Agent, value: any) => {
    setAgentForm(prev => ({ ...prev, [field]: value }));
    setIsFormDirty(true);
  };

  const generateAvatar = () => {
    if (!agentForm.name) return;
    const seed = agentForm.name + Date.now();
    const url = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${seed}`;
    handleAgentChange('avatar_url', url);
  };

  const saveAgent = () => {
    if (!agentForm.id) return;
    setLocalAgents(prev => ({
        ...prev,
        [agentForm.id!]: agentForm as Agent
    }));
    onUpdateAgents({ ...localAgents, [agentForm.id!]: agentForm as Agent });
    setIsFormDirty(false);
  };

  const createNewAgent = () => {
    const newId = 'custom_' + Date.now();
    const newAgent: Agent = {
      id: newId,
      name: 'New Agent',
      description: 'A custom agent.',
      model: 'gemini-2.5-flash',
      ui_color: 'indigo',
      avatar_url: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${newId}`,
      systemInstruction: 'You are a helpful assistant.',
      isCustom: true
    };
    setLocalAgents(prev => ({ ...prev, [newId]: newAgent }));
    setActiveView(newId);
  };

  const deleteAgent = () => {
    if (!agentForm.isCustom || !agentForm.id) return;
    if (!confirm('Are you sure? This cannot be undone.')) return;

    const updated = { ...localAgents };
    delete updated[agentForm.id];
    setLocalAgents(updated);
    onUpdateAgents(updated);
    setActiveView('chat-settings');
  };

  // -- Chat Config Operations --

  const saveChatConfig = () => {
      onUpdateConfig(configState);
      onClose();
  };

  const toggleCouncilExpert = (agentId: string) => {
      const current = configState.councilIds || [];
      const updated = current.includes(agentId) 
        ? current.filter(id => id !== agentId)
        : [...current, agentId];
      setConfigState(prev => ({ ...prev, councilIds: updated }));
  };

  // -- Filtering --
  const filteredAgents = Object.values(localAgents).filter((a: Agent) => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden ring-1 ring-black/5 font-sans">
        
        {/* LEFT SIDEBAR: Navigation & Library */}
        <div className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col">
           
           {/* Header */}
           <div className="px-6 py-6 pb-4">
              <h2 className="font-bold text-slate-900 text-xl tracking-tight">Configuration</h2>
              <p className="text-sm text-slate-500 mt-1">Manage chat roles & agents</p>
           </div>

           {/* Navigation List */}
           <div className="flex-1 overflow-y-auto px-4 space-y-6 scrollbar-thin">
              
              {/* Section 1: Context */}
              <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-3">Current Chat</div>
                  <button 
                    onClick={() => setActiveView('chat-settings')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                        activeView === 'chat-settings' 
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100' 
                        : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                    }`}
                  >
                      <Settings size={18} className={`transition-colors ${activeView === 'chat-settings' ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      Role Configuration
                  </button>
              </div>

              {/* Section 2: Library */}
              <div>
                  <div className="flex items-center justify-between px-2 mb-3">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Agent Library</span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{Object.keys(localAgents).length}</span>
                  </div>
                  
                  {/* Search */}
                  <div className="relative mb-3">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                      <input 
                        type="text" 
                        placeholder="Find agent..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                      />
                  </div>

                  <div className="space-y-1">
                      {filteredAgents.map((agent: Agent) => (
                          <button
                            key={agent.id}
                            onClick={() => setActiveView(agent.id)}
                            className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left transition-all group ${
                                activeView === agent.id ? 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100' : 'hover:bg-slate-200/50 text-slate-700'
                            }`}
                          >
                             <Avatar src={agent.avatar_url} fallback={agent.name} senderType="agent" uiColor={agent.ui_color} size="sm" className="shrink-0" />
                             <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{agent.name}</div>
                                <div className="text-[11px] text-slate-500 truncate">{agent.model.replace('gemini-', '')}</div>
                             </div>
                             {agent.isCustom && (
                                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                             )}
                          </button>
                      ))}
                  </div>
              </div>
           </div>

           {/* Footer Action */}
           <div className="p-4 border-t border-slate-200 bg-slate-50">
               <button 
                 onClick={createNewAgent}
                 className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-700 font-medium py-3 rounded-xl transition-all shadow-sm text-sm hover:shadow-md"
               >
                   <Plus size={16} /> Create Agent
               </button>
           </div>
        </div>

        {/* RIGHT PANEL: Content Views */}
        <div className="flex-1 flex flex-col min-w-0 bg-white relative">
            
            <div className="absolute top-6 right-6 z-10">
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* VIEW 1: CHAT CONFIGURATION */}
            {activeView === 'chat-settings' && (
                <div className="flex-1 flex flex-col h-full animate-fade-in">
                    <div className="px-10 py-10 pb-6">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Role Assignment</h1>
                        <div className="flex items-center gap-2 text-slate-500">
                           <span>Configure how agents interact in the</span>
                           <span className={`font-semibold px-2 py-0.5 rounded text-sm uppercase tracking-wide
                               ${chatMode === 'debate' ? 'bg-rose-100 text-rose-700' : 
                                 chatMode === 'expert-council' ? 'bg-purple-100 text-purple-700' : 
                                 'bg-indigo-100 text-indigo-700'}`
                           }>
                               {chatMode.replace('-', ' ')}
                           </span>
                           <span>mode.</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-10 py-2">
                        {/* Dual & Parallel Mode Config */}
                        {(chatMode === 'collaborative' || chatMode === 'parallel') && (
                            <div className="grid grid-cols-1 gap-6">
                                {/* System 1 Card */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                                        <div className="flex items-center gap-4 min-w-[240px]">
                                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                                <Zap size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-lg">System 1</h3>
                                                <p className="text-sm text-slate-500">Fast, intuitive responses</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 w-full">
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Assigned Agent</label>
                                            <div className="relative">
                                                <select 
                                                    value={configState.system1Id}
                                                    onChange={(e) => setConfigState({...configState, system1Id: e.target.value})}
                                                    className="w-full appearance-none p-3 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer hover:bg-slate-100"
                                                >
                                                    {Object.values(localAgents).map((a: Agent) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* System 2 Card */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                                        <div className="flex items-center gap-4 min-w-[240px]">
                                            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                                                <Brain size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-lg">System 2</h3>
                                                <p className="text-sm text-slate-500">Deep analytical reasoning</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 w-full">
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Assigned Agent</label>
                                            <div className="relative">
                                                <select 
                                                    value={configState.system2Id}
                                                    onChange={(e) => setConfigState({...configState, system2Id: e.target.value})}
                                                    className="w-full appearance-none p-3 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all cursor-pointer hover:bg-slate-100"
                                                >
                                                    {Object.values(localAgents).map((a: Agent) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Debate Mode Config */}
                        {chatMode === 'debate' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-6">
                                        <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Proponent (In Favor)</label>
                                        <div className="relative">
                                            <select 
                                                value={configState.proponentId}
                                                onChange={(e) => setConfigState({...configState, proponentId: e.target.value})}
                                                className="w-full appearance-none p-3 bg-white border border-emerald-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                            >
                                                {Object.values(localAgents).map((a: Agent) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-3.5 text-emerald-400 pointer-events-none" size={16} />
                                        </div>
                                    </div>
                                    <div className="bg-rose-50/30 border border-rose-100 rounded-2xl p-6">
                                        <label className="block text-xs font-bold text-rose-700 uppercase tracking-wider mb-3">Opponent (Against)</label>
                                        <div className="relative">
                                            <select 
                                                value={configState.opponentId}
                                                onChange={(e) => setConfigState({...configState, opponentId: e.target.value})}
                                                className="w-full appearance-none p-3 bg-white border border-rose-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500/20 outline-none"
                                            >
                                                {Object.values(localAgents).map((a: Agent) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-3.5 text-rose-400 pointer-events-none" size={16} />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="border-t border-slate-100 pt-6">
                                    <div className="max-w-md">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Gavel size={16} className="text-slate-500" />
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Moderator</label>
                                        </div>
                                        <div className="relative">
                                            <select 
                                                value={configState.moderatorId || ''}
                                                onChange={(e) => setConfigState({...configState, moderatorId: e.target.value})}
                                                className="w-full appearance-none p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-slate-500/20 outline-none"
                                            >
                                                <option value="">None (No Moderator)</option>
                                                {Object.values(localAgents).map((a: Agent) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Expert Council Config */}
                        {chatMode === 'expert-council' && (
                            <div>
                                <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-5 mb-8 flex items-start gap-4">
                                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                        <Users size={20} />
                                    </div>
                                    <div className="text-sm text-purple-900/80 leading-relaxed">
                                        <p className="font-bold text-purple-900 mb-1">Panel Selection</p>
                                        Select the experts you want to include in the panel. Agents will respond in a round-robin fashion.
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.values(localAgents).map((agent: Agent) => {
                                        const isSelected = (configState.councilIds || []).includes(agent.id);
                                        return (
                                            <button
                                                key={agent.id}
                                                onClick={() => toggleCouncilExpert(agent.id)}
                                                className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all hover:shadow-sm ${
                                                    isSelected 
                                                    ? 'bg-purple-50/40 border-purple-200 ring-1 ring-purple-200' 
                                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="relative shrink-0">
                                                    <Avatar src={agent.avatar_url} fallback={agent.name} senderType="agent" uiColor={agent.ui_color} size="md" />
                                                    {isSelected && (
                                                        <div className="absolute -top-1 -right-1 bg-purple-600 text-white rounded-full p-0.5 shadow-sm ring-2 ring-white">
                                                            <CheckCircle size={12} fill="currentColor" className="text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className={`font-bold text-sm truncate ${isSelected ? 'text-purple-900' : 'text-slate-800'}`}>{agent.name}</div>
                                                    <div className="text-xs text-slate-500 truncate">{agent.model.replace('gemini-', '')}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-8 pt-4 border-t border-slate-100 flex justify-end">
                        <button 
                            onClick={saveChatConfig}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                        >
                            <CheckCircle size={18} />
                            Apply Configuration
                        </button>
                    </div>
                </div>
            )}

            {/* VIEW 2: AGENT EDITOR */}
            {activeView !== 'chat-settings' && (
                <div className="flex-1 flex flex-col h-full animate-fade-in">
                    {/* Toolbar */}
                    <div className="h-20 border-b border-slate-100 flex items-center justify-between px-10">
                        <h2 className="font-bold text-slate-900 text-xl flex items-center gap-3">
                            {agentForm.isCustom ? 'Edit Agent' : 'System Agent'}
                            {agentForm.isSystem && <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">Core</span>}
                        </h2>
                        {isFormDirty && (
                             <span className="text-xs text-amber-700 font-bold bg-amber-50 px-3 py-1.5 rounded-full animate-pulse border border-amber-100">Unsaved Changes</span>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-10">
                        <div className="max-w-3xl mx-auto space-y-10">
                            {/* Header Card */}
                            <div className="flex gap-8 items-start">
                                <div className="group relative shrink-0">
                                    <div className="w-28 h-28 rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                                        <img src={agentForm.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                                    </div>
                                    <button 
                                        onClick={generateAvatar}
                                        className="absolute -bottom-2 -right-2 p-2.5 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-indigo-600 shadow-md hover:shadow-lg transition-all z-10"
                                        title="Generate New Look"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                                <div className="flex-1 space-y-5 pt-1">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Display Name</label>
                                        <input 
                                            type="text" 
                                            value={agentForm.name || ''} 
                                            onChange={e => handleAgentChange('name', e.target.value)}
                                            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                            placeholder="e.g. Code Wizard"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tagline</label>
                                        <input 
                                            type="text" 
                                            value={agentForm.description || ''} 
                                            onChange={e => handleAgentChange('description', e.target.value)}
                                            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="Short description..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Config Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">AI Model</label>
                                    <div className="space-y-3">
                                        {AVAILABLE_MODELS.map(m => (
                                            <label key={m.id} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${agentForm.model === m.id ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'}`}>
                                                <input 
                                                    type="radio" 
                                                    name="model" 
                                                    className="hidden"
                                                    checked={agentForm.model === m.id} 
                                                    onChange={() => handleAgentChange('model', m.id)}
                                                />
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${agentForm.model === m.id ? 'border-indigo-600' : 'border-slate-300'}`}>
                                                    {agentForm.model === m.id && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900">{m.name}</div>
                                                    <div className="text-[11px] text-slate-500">{m.type}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Theme Color</label>
                                    <div className="grid grid-cols-4 gap-4">
                                        {AVAILABLE_COLORS.map(c => (
                                            <button 
                                                key={c.id}
                                                onClick={() => handleAgentChange('ui_color', c.id)}
                                                className={`w-full aspect-square rounded-xl ${c.bg} ring-2 ring-offset-2 transition-all ${agentForm.ui_color === c.id ? 'ring-slate-900 scale-95 shadow-inner' : 'ring-transparent hover:scale-105'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Instruction Editor */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Base Persona & Instructions</label>
                                <div className="relative">
                                    <textarea 
                                        value={agentForm.systemInstruction || ''}
                                        onChange={e => handleAgentChange('systemInstruction', e.target.value)}
                                        rows={8}
                                        className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono leading-relaxed text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all"
                                        placeholder="Define how this agent should behave..."
                                    />
                                    <div className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm">Markdown Supported</div>
                                </div>
                                <p className="text-xs text-slate-400 mt-3">
                                    This instruction defines the agent's core personality.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Actions Footer */}
                    <div className="p-8 border-t border-slate-100 flex items-center justify-between">
                        {agentForm.isCustom ? (
                            <button 
                                onClick={deleteAgent}
                                className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors"
                            >
                                <Trash2 size={18} /> Delete Agent
                            </button>
                        ) : (
                            <div></div> // Spacer
                        )}
                        
                        <div className="flex gap-3">
                            {isFormDirty && (
                                <button 
                                    onClick={saveAgent}
                                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-slate-300 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"
                                >
                                    <Save size={18} /> Save Changes
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AgentConfigModal;
