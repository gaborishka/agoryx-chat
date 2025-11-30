'use client'

import React, { useState } from 'react';
import { MessageSquarePlus, X, Search, LayoutGrid, User as UserIcon, Trash2, ShieldAlert } from 'lucide-react';
import { Conversation, User } from '@/types';

interface SidebarProps {
  conversations: Conversation[];
  currentId: string;
  user: User;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onOpenDashboard: () => void;
  onOpenAdmin: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  conversations, 
  currentId, 
  user,
  onSelectConversation,
  onDeleteConversation,
  isOpen,
  onClose,
  onNewChat,
  onOpenDashboard,
  onOpenAdmin
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = conversations.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.preview.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-72 bg-slate-50 border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
              A
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-800">Agoryx</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-500 p-1">
            <X size={20} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-4 mb-4">
          <button 
            onClick={onNewChat}
            className="w-full bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md text-slate-700 font-medium py-3 px-4 rounded-xl flex items-center gap-2 transition-all duration-200 group"
          >
            <MessageSquarePlus className="text-blue-500 group-hover:scale-110 transition-transform" size={20} />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 mb-2">
           <div className="relative">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
             <input 
               type="text" 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder="Search chats..." 
               className="w-full bg-slate-100 text-sm py-2 pl-9 pr-3 rounded-lg border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-slate-400 text-slate-700"
             />
           </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin">
          <div className="px-2 pt-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {searchTerm ? `Results (${filteredConversations.length})` : 'Recent'}
          </div>
          {filteredConversations.length === 0 ? (
             <div className="px-4 py-8 text-center text-slate-400 text-sm italic">
               {conversations.length === 0 ? "No conversations yet" : "No matches found"}
             </div>
          ) : filteredConversations.map((convo) => {
             const isActive = convo.id === currentId;
             return (
              <div
                key={convo.id}
                onClick={() => {
                  onSelectConversation(convo.id);
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 relative group cursor-pointer ${
                  isActive 
                    ? 'bg-white shadow-sm ring-1 ring-slate-200' 
                    : 'hover:bg-slate-100'
                }`}
              >
                {isActive && <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full" />}
                <div className="flex justify-between items-start gap-2">
                   <h3 className={`text-sm font-medium truncate mb-1 flex-1 ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                     {convo.title}
                   </h3>
                   <button 
                     onClick={(e) => onDeleteConversation(convo.id, e)}
                     className={`text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100' : ''}`}
                     title="Delete chat"
                   >
                     <Trash2 size={14} />
                   </button>
                </div>
                <p className="text-xs text-slate-500 truncate leading-relaxed">
                  {convo.preview}
                </p>
              </div>
            );
          })}
        </div>

        {/* User Profile / Bottom Menu */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
           
           {user.role === 'admin' && (
             <button
               onClick={onOpenAdmin}
               className="w-full flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-900 text-sm font-medium transition-colors shadow-sm"
             >
               <ShieldAlert size={16} className="text-indigo-400" />
               Admin Panel
             </button>
           )}

           <div 
             onClick={onOpenDashboard}
             className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
             title="Open Dashboard"
           >
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center overflow-hidden">
                 {user.avatar_url ? (
                   <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                 ) : (
                   <UserIcon size={18} />
                 )}
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-slate-800 truncate">{user.full_name}</p>
                 <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    <p className="text-xs text-slate-500">{user.credits_remaining.toLocaleString()} credits</p>
                 </div>
              </div>
              <LayoutGrid size={16} className="text-slate-400" />
           </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;