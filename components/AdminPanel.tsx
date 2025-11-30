'use client'

import React, { useState, useEffect } from 'react';
import {
    X, LayoutDashboard, Users, Server, ShieldAlert, Search,
    MoreHorizontal, TrendingUp, DollarSign, Activity, AlertTriangle,
    CheckCircle, Edit2, Ban, Loader2
} from 'lucide-react';
import { User } from '../types';
import { AdminService, AdminStats, SystemLog } from '../lib/admin';
import Avatar from './Avatar';
import { useToast } from '@/lib/hooks/useToast';

interface AdminPanelProps {
    onClose: () => void;
    currentUser: User;
}

type AdminTab = 'overview' | 'users' | 'system';

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, currentUser }) => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // User Management State
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [creditEditValue, setCreditEditValue] = useState<string>('');
    const [processingAction, setProcessingAction] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'overview') {
                const s = await AdminService.getStats();
                setStats(s);
            } else if (activeTab === 'users') {
                const u = await AdminService.getAllUsers();
                setUsers(u);
            } else if (activeTab === 'system') {
                const l = await AdminService.getSystemLogs();
                setLogs(l);
                const s = await AdminService.getStats(); // Also get stats for health check
                setStats(s);
            }
        } catch {
            toast.error('Failed to load admin data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditCredits = (user: User) => {
        setEditingUser(user);
        setCreditEditValue(user.credits_remaining.toString());
    };

    const saveCredits = async () => {
        if (!editingUser) return;
        setProcessingAction(editingUser.id);
        try {
            const amount = parseInt(creditEditValue);
            if (isNaN(amount)) {
                toast.error('Invalid credit amount');
                return;
            }

            const updated = await AdminService.updateUserCredits(editingUser.id, amount);
            setUsers(users.map(u => u.id === updated.id ? updated : u));
            setEditingUser(null);
            toast.success('Credits updated successfully');
        } catch {
            toast.error('Failed to update credits');
        } finally {
            setProcessingAction(null);
        }
    };

    const toggleBan = async (userId: string) => {
        if (!confirm("Are you sure you want to change the ban status of this user?")) return;
        setProcessingAction(userId);
        try {
            const updated = await AdminService.toggleUserBan(userId);
            setUsers(users.map(u => u.id === updated.id ? updated : u));
            toast.success('User ban status updated');
        } catch {
            toast.error('Failed to toggle ban status');
        } finally {
            setProcessingAction(null);
        }
    };

    const filteredUsers = users.filter(u => 
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.includes(searchTerm)
    );

    // -- Render Helpers --

    const renderStatCard = (title: string, value: string, icon: React.ReactNode, color: 'blue' | 'green' | 'purple' | 'amber') => {
        const colorClasses = {
            blue: 'bg-blue-50 text-blue-600 border-blue-100',
            green: 'bg-green-50 text-green-600 border-green-100',
            purple: 'bg-purple-50 text-purple-600 border-purple-100',
            amber: 'bg-amber-50 text-amber-600 border-amber-100',
        };
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${colorClasses[color]}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            {/* Edit Credits Modal */}
            {editingUser && (
                <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/20">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
                        <h3 className="text-lg font-bold mb-4">Adjust Credits</h3>
                        <p className="text-sm text-slate-500 mb-4">Set new credit balance for <span className="font-semibold text-slate-900">{editingUser.full_name}</span>.</p>
                        <input 
                            type="number" 
                            value={creditEditValue}
                            onChange={(e) => setCreditEditValue(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                            <button 
                                onClick={saveCredits}
                                disabled={!!processingAction}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                            >
                                {processingAction === editingUser.id && <Loader2 size={14} className="animate-spin" />}
                                Save Balance
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-50 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex overflow-hidden ring-1 ring-white/10">
                {/* Sidebar */}
                <div className="w-64 bg-slate-900 text-slate-300 flex flex-col">
                    <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                        <ShieldAlert className="text-indigo-400" />
                        <div>
                            <h2 className="font-bold text-white leading-none">Admin Panel</h2>
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Internal Tools</span>
                        </div>
                    </div>
                    
                    <nav className="flex-1 p-4 space-y-1">
                        <button 
                            onClick={() => setActiveTab('overview')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
                        >
                            <LayoutDashboard size={18} />
                            Dashboard
                        </button>
                        <button 
                            onClick={() => setActiveTab('users')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
                        >
                            <Users size={18} />
                            User Management
                        </button>
                        <button 
                            onClick={() => setActiveTab('system')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'system' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
                        >
                            <Server size={18} />
                            System Monitoring
                        </button>
                    </nav>
                    
                    <div className="p-4 border-t border-slate-800">
                        <div className="flex items-center gap-3">
                            <Avatar fallback="AD" senderType="user" size="sm" className="ring-0" />
                            <div className="overflow-hidden">
                                <div className="text-sm font-medium text-white truncate">{currentUser.full_name}</div>
                                <div className="text-xs text-slate-500 truncate">Super Admin</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
                    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
                        <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab}</h2>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {isLoading && !editingUser ? (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                <Loader2 size={32} className="animate-spin" />
                            </div>
                        ) : (
                            <>
                                {activeTab === 'overview' && stats && (
                                    <div className="space-y-6 animate-fade-in">
                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {renderStatCard('Total Revenue', `$${stats.totalRevenue.toFixed(2)}`, <DollarSign size={20} />, 'green')}
                                            {renderStatCard('Total Users', stats.totalUsers.toString(), <Users size={20} />, 'blue')}
                                            {renderStatCard('Active Subs', stats.activeSubs.toString(), <CheckCircle size={20} />, 'purple')}
                                            {renderStatCard('API Health', stats.apiHealth.toUpperCase(), <Activity size={20} />, stats.apiHealth === 'healthy' ? 'green' : 'amber')}
                                        </div>

                                        {/* Mock Chart Area */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                    <TrendingUp size={18} className="text-slate-400" />
                                                    Revenue Trend (30 Days)
                                                </h3>
                                                <div className="h-48 flex items-end justify-between gap-2">
                                                    {[35, 42, 38, 55, 48, 62, 59, 75, 68, 82, 95, 88].map((h, i) => (
                                                        <div key={i} className="w-full bg-indigo-100 hover:bg-indigo-200 rounded-t-md relative group transition-all" style={{height: `${h}%`}}>
                                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                                ${h * 10}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between mt-2 text-xs text-slate-400">
                                                    <span>Feb 1</span>
                                                    <span>Feb 15</span>
                                                    <span>Mar 1</span>
                                                </div>
                                            </div>

                                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                    <Activity size={18} className="text-slate-400" />
                                                    Token Usage (System 1 vs 2)
                                                </h3>
                                                <div className="h-48 flex items-center justify-center">
                                                    <div className="w-48 h-48 rounded-full border-[16px] border-slate-100 relative">
                                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                                            {/* Flash Ring segment */}
                                                            <path className="text-blue-500" strokeDasharray="70, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                                            {/* Sage Ring segment (overlap simulated visually) */}
                                                            <path className="text-amber-500" strokeDasharray="30, 100" strokeDashoffset="-70" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                                        </svg>
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                            <span className="text-2xl font-bold text-slate-800">1.2M</span>
                                                            <span className="text-xs text-slate-500">Tokens</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-center gap-4 mt-2">
                                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> Flash (70%)
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                                        <div className="w-2 h-2 rounded-full bg-amber-500"></div> Sage (30%)
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'users' && (
                                    <div className="animate-fade-in">
                                        {/* Toolbar */}
                                        <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
                                            <div className="relative w-full md:w-96">
                                                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                                <input 
                                                    type="text" 
                                                    placeholder="Search users by name, email or ID..." 
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">Filter</button>
                                                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Export CSV</button>
                                            </div>
                                        </div>

                                        {/* Table */}
                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-6 py-4">User</th>
                                                        <th className="px-6 py-4">Plan</th>
                                                        <th className="px-6 py-4">Credits</th>
                                                        <th className="px-6 py-4">Joined</th>
                                                        <th className="px-6 py-4">Status</th>
                                                        <th className="px-6 py-4 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {filteredUsers.map(u => (
                                                        <tr key={u.id} className={`hover:bg-slate-50/80 transition-colors ${u.is_banned ? 'bg-red-50/50' : ''}`}>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar fallback={u.full_name} senderType="user" size="sm" />
                                                                    <div>
                                                                        <div className="font-medium text-slate-900 flex items-center gap-2">
                                                                            {u.full_name}
                                                                            {u.role === 'admin' && <span className="text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded">ADMIN</span>}
                                                                        </div>
                                                                        <div className="text-xs text-slate-500">{u.email}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 capitalize">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium
                                                                    ${u.subscription_tier === 'pro' ? 'bg-amber-100 text-amber-700' : 
                                                                      u.subscription_tier === 'basic' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}
                                                                `}>
                                                                    {u.subscription_tier}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-slate-600">{u.credits_remaining.toLocaleString()}</td>
                                                            <td className="px-6 py-4 text-slate-500">{u.joined_at}</td>
                                                            <td className="px-6 py-4">
                                                                {u.is_banned ? (
                                                                    <span className="text-red-600 font-medium flex items-center gap-1"><Ban size={12} /> Banned</span>
                                                                ) : u.subscription_status === 'active' ? (
                                                                    <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle size={12} /> Active</span>
                                                                ) : (
                                                                    <span className="text-slate-400 font-medium capitalize">{u.subscription_status}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button 
                                                                        onClick={() => handleEditCredits(u)}
                                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" 
                                                                        title="Edit Credits"
                                                                    >
                                                                        <Edit2 size={16} />
                                                                    </button>
                                                                    {u.role !== 'admin' && (
                                                                        <button 
                                                                            onClick={() => toggleBan(u.id)}
                                                                            disabled={processingAction === u.id}
                                                                            className={`p-1.5 rounded transition-colors ${u.is_banned ? 'text-red-600 bg-red-100 hover:bg-red-200' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                                                                            title={u.is_banned ? "Unban User" : "Ban User"}
                                                                        >
                                                                            {processingAction === u.id ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {filteredUsers.length === 0 && (
                                                <div className="p-12 text-center text-slate-400">
                                                    No users found matching "{searchTerm}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'system' && (
                                    <div className="animate-fade-in space-y-6">
                                        {/* Health Check Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
                                                    <Server size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">API Gateway</h4>
                                                    <p className="text-sm text-green-600 font-medium">Operational (99.9% Uptime)</p>
                                                </div>
                                            </div>
                                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
                                                    <Activity size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">Gemini Relay</h4>
                                                    <p className="text-sm text-green-600 font-medium">Connected (45ms latency)</p>
                                                </div>
                                            </div>
                                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
                                                    <DollarSign size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">Stripe Webhooks</h4>
                                                    <p className="text-sm text-green-600 font-medium">Listening</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Logs Table */}
                                        <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800">
                                            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                                                <h3 className="font-mono text-slate-300 font-bold">System Logs</h3>
                                                <div className="flex gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                                </div>
                                            </div>
                                            <div className="p-0">
                                                <table className="w-full text-xs font-mono">
                                                    <thead className="bg-slate-950 text-slate-500">
                                                        <tr>
                                                            <th className="px-6 py-2 text-left">Timestamp</th>
                                                            <th className="px-6 py-2 text-left">Level</th>
                                                            <th className="px-6 py-2 text-left">Source</th>
                                                            <th className="px-6 py-2 text-left">Message</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/50 text-slate-400">
                                                        {logs.map(log => (
                                                            <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                                                <td className="px-6 py-3 opacity-60">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                                                <td className="px-6 py-3">
                                                                    <span className={`
                                                                        px-1.5 py-0.5 rounded uppercase font-bold text-[10px]
                                                                        ${log.level === 'error' ? 'bg-red-900/30 text-red-400' : 
                                                                          log.level === 'warning' ? 'bg-amber-900/30 text-amber-400' : 
                                                                          'bg-blue-900/30 text-blue-400'}
                                                                    `}>
                                                                        {log.level}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-3 text-slate-300">{log.source}</td>
                                                                <td className="px-6 py-3 text-slate-300">{log.message}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
