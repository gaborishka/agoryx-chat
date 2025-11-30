'use client'

import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, CreditCard, Settings, Check, Zap, Brain, Shield, Activity, Download, ExternalLink, AlertTriangle, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { User, SubscriptionTier } from '../types';
import { PRICING_TIERS } from '../constants';
import Avatar from './Avatar';
import {
  useBillingHistory,
  useCreateCheckout,
  useCreatePortal,
  useCancelSubscription,
  useUpdateSubscription,
  BillingHistoryItem,
} from '@/lib/hooks';
import { useToast } from '@/lib/hooks/useToast';

interface DashboardProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (updates: Partial<User>) => void;
}

type Tab = 'overview' | 'subscription' | 'settings';

const Dashboard: React.FC<DashboardProps> = ({ user, onClose, onUpdateUser }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [nameEdit, setNameEdit] = useState(user.full_name);
  const [emailEdit, setEmailEdit] = useState(user.email);

  // Billing hooks
  const { data: billingData, isLoading: loadingHistory } = useBillingHistory();
  const billingHistory = billingData?.history || [];

  const createCheckout = useCreateCheckout();
  const createPortal = useCreatePortal();
  const cancelSubscription = useCancelSubscription();
  const updateSubscription = useUpdateSubscription();

  // Subscription State
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState(false);

  // Checkout & Interaction State
  const [checkoutStep, setCheckoutStep] = useState<'none' | 'contacting' | 'redirecting' | 'processing' | 'success' | 'portal'>('none');
  const [processingItem, setProcessingItem] = useState<string>('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Simulates the full checkout flow
  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (tier === user.subscription_tier) return;
    const plan = PRICING_TIERS[tier];

    setProcessingItem(`Upgrade to ${plan.name}`);
    setCheckoutStep('contacting');

    try {
        // 1. Create Checkout Session via API
        await createCheckout.mutateAsync(tier);

        setCheckoutStep('redirecting');

        // 2. Simulate Redirect Wait
        await new Promise(resolve => setTimeout(resolve, 2000));
        setCheckoutStep('processing');

        // 3. Update subscription via API
        await updateSubscription.mutateAsync(tier);
        setCheckoutStep('success');

        // 4. Update local state
        await new Promise(resolve => setTimeout(resolve, 1000));
        onUpdateUser({
            subscription_tier: tier,
            credits_remaining: user.credits_remaining + plan.credits,
            subscription_status: 'active',
            cancel_at_period_end: false
        });

        setTimeout(() => {
            setCheckoutStep('none');
            setActiveTab('overview');
            toast.success(`Successfully upgraded to ${plan.name}!`);
        }, 1500);

    } catch (error) {
        setCheckoutStep('none');
        toast.error("Payment failed. Please try again.");
    }
  };

  const handleTopUp = async (amount: number) => {
      setProcessingItem(`${amount} Credits Pack`);
      setCheckoutStep('contacting');
      try {
          await createCheckout.mutateAsync('basic'); // Mock credit pack checkout
          setCheckoutStep('redirecting');
          await new Promise(resolve => setTimeout(resolve, 1500));
          setCheckoutStep('processing');
          await new Promise(resolve => setTimeout(resolve, 2000));
          setCheckoutStep('success');

          await new Promise(resolve => setTimeout(resolve, 800));
          onUpdateUser({ credits_remaining: user.credits_remaining + amount });

          setTimeout(() => {
             setCheckoutStep('none');
             toast.success(`${amount} Credits added!`);
          }, 1000);
      } catch {
          setCheckoutStep('none');
          toast.error("Top-up failed.");
      }
  };

  const handleCancelSubscription = async () => {
      setShowCancelConfirm(true);
  };

  const confirmCancellation = async () => {
      setIsLoading(true);
      try {
          await cancelSubscription.mutateAsync();
          onUpdateUser({ cancel_at_period_end: true });
          setShowCancelConfirm(false);
          toast.success("Subscription cancelled. Access remains until period end.");
      } catch {
          toast.error("Failed to cancel subscription.");
      } finally {
          setIsLoading(false);
      }
  };

  const handlePortal = async () => {
      setProcessingItem("Stripe Billing Portal");
      setCheckoutStep('portal');
      try {
          await createPortal.mutateAsync();
          await new Promise(resolve => setTimeout(resolve, 2000));
          setCheckoutStep('none');
          toast.success("Opened Billing Portal");
      } catch {
          setCheckoutStep('none');
          toast.error("Failed to load portal.");
      }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
      e.preventDefault();
      onUpdateUser({ full_name: nameEdit, email: emailEdit });
      toast.success("Profile updated successfully.");
  };

  // --- Full Screen Checkout/Portal Overlay ---
  if (checkoutStep !== 'none') {
      return (
          <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center animate-fade-in">
              <div className="w-full max-w-md p-8 text-center">
                  {checkoutStep === 'success' ? (
                      <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2 animate-bounce">
                              <Check size={32} strokeWidth={3} />
                          </div>
                          <h2 className="text-2xl font-bold text-slate-900">Payment Successful!</h2>
                          <p className="text-slate-500">Your account has been updated.</p>
                          <p className="text-sm text-slate-400 mt-4">Redirecting back to dashboard...</p>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center gap-6">
                          <div className="relative">
                              <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                  {checkoutStep === 'portal' ? (
                                     <ExternalLink size={20} className="text-slate-300" />
                                  ) : (
                                     <CreditCard size={20} className="text-slate-300" />
                                  )}
                              </div>
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">
                                {checkoutStep === 'contacting' && 'Contacting Stripe...'}
                                {checkoutStep === 'redirecting' && 'Redirecting to Secure Checkout...'}
                                {checkoutStep === 'processing' && 'Processing Payment...'}
                                {checkoutStep === 'portal' && 'Redirecting to Billing Portal...'}
                            </h2>
                            <p className="text-slate-500 text-sm">
                                {checkoutStep === 'portal' ? 'Securely connecting to Stripe' : <>Purchasing: <span className="font-semibold text-slate-700">{processingItem}</span></>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
                              <Shield size={12} />
                              Secured by Stripe
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      {/* Toast notifications are now handled by the global ToastContainer */}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/10 backdrop-blur-[1px] p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-fade-in">
                <div className="flex items-center gap-3 text-red-600 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertTriangle size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Cancel Subscription?</h3>
                </div>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    Are you sure you want to cancel? You will lose access to Pro features at the end of your current billing period ({user.current_period_end || 'soon'}).
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowCancelConfirm(false)}
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                    >
                        Keep Plan
                    </button>
                    <button 
                        onClick={confirmCancellation}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Cancel'}
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex overflow-hidden ring-1 ring-white/10">
        
        {/* Sidebar Navigation */}
        <div className="w-64 bg-slate-50/80 backdrop-blur border-r border-slate-200 flex flex-col hidden md:flex">
            <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-slate-900 text-white rounded-md flex items-center justify-center font-bold text-xs">A</div>
                    <h2 className="font-bold text-lg text-slate-800">Account</h2>
                </div>
                <p className="text-xs text-slate-500">Manage your subscription</p>
            </div>
            <nav className="flex-1 p-4 space-y-1">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <Activity size={18} />
                    Overview
                </button>
                <button 
                    onClick={() => setActiveTab('subscription')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'subscription' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <CreditCard size={18} />
                    Subscription
                </button>
                <button 
                    onClick={() => setActiveTab('settings')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <Settings size={18} />
                    Profile & Settings
                </button>
            </nav>
            <div className="p-4 border-t border-slate-200 bg-white/50">
                 <div className="flex items-center gap-3">
                    <Avatar fallback={user.full_name} senderType="user" size="md" />
                    <div className="overflow-hidden flex-1">
                        <div className="text-sm font-medium text-slate-900 truncate">{user.full_name}</div>
                        <div className="text-xs text-slate-500 truncate capitalize">{user.subscription_tier} Plan</div>
                    </div>
                 </div>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
            <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-slate-100 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                     {/* Mobile Nav Toggle Placeholder (if needed) */}
                     <h3 className="text-xl font-semibold text-slate-800 capitalize">
                        {activeTab === 'overview' && 'Dashboard Overview'}
                        {activeTab === 'subscription' && 'Plans & Billing'}
                        {activeTab === 'settings' && 'Account Settings'}
                    </h3>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin">
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-fade-in max-w-4xl">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-blue-600 text-sm font-bold uppercase tracking-wider">Credits</div>
                                    <Zap size={18} className="text-blue-400" />
                                </div>
                                <div className="text-4xl font-bold text-slate-900 tracking-tight">{user.credits_remaining.toLocaleString()}</div>
                                <div className="mt-6 flex gap-2">
                                    <button onClick={() => handleTopUp(500)} className="flex-1 text-xs font-semibold bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                                        +500 ($5)
                                    </button>
                                    <button onClick={() => handleTopUp(1000)} className="flex-1 text-xs font-semibold bg-white border border-blue-200 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                                        +1k ($9)
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-6 bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-amber-600 text-sm font-bold uppercase tracking-wider">Current Plan</div>
                                    <Brain size={18} className="text-amber-400" />
                                </div>
                                <div className="text-4xl font-bold text-slate-900 capitalize tracking-tight">{user.subscription_tier}</div>
                                <div className="mt-6">
                                    <button onClick={() => setActiveTab('subscription')} className="w-full text-xs font-semibold text-amber-800 bg-amber-100/50 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-lg transition-colors">
                                        Manage Subscription
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-slate-500 text-sm font-bold uppercase tracking-wider">Usage (Feb)</div>
                                    <Activity size={18} className="text-slate-400" />
                                </div>
                                <div className="text-4xl font-bold text-slate-900">124</div>
                                <div className="mt-6 text-xs text-slate-400 font-medium flex items-center gap-1">
                                    <Clock size={12} />
                                    <span>Resets in 14 days</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Mock */}
                        <div className="pt-4">
                            <h4 className="text-base font-semibold text-slate-800 mb-4">Recent Usage</h4>
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium">
                                        <tr>
                                            <th className="px-4 py-3">Agent</th>
                                            <th className="px-4 py-3">Request</th>
                                            <th className="px-4 py-3 text-right">Cost</th>
                                            <th className="px-4 py-3 text-right">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-amber-500"></div> Sage
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]">Analysis of Q3 metrics...</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-500">0.4</td>
                                            <td className="px-4 py-3 text-right text-slate-400">2m ago</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Flash
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]">Summarize email thread</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-500">0.1</td>
                                            <td className="px-4 py-3 text-right text-slate-400">15m ago</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'subscription' && (
                    <div className="animate-fade-in max-w-5xl mx-auto">
                        {/* Toggle */}
                        <div className="flex justify-center mb-10">
                            <div className="bg-slate-100 p-1 rounded-xl inline-flex relative">
                                <button 
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all z-10 ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Monthly
                                </button>
                                <button 
                                    onClick={() => setBillingCycle('annual')}
                                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all z-10 flex items-center gap-2 ${billingCycle === 'annual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Annual <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">-17%</span>
                                </button>
                            </div>
                        </div>

                        {/* Plans Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                             {(Object.keys(PRICING_TIERS) as SubscriptionTier[]).map((tierKey) => {
                                 const tier = PRICING_TIERS[tierKey];
                                 const isCurrent = user.subscription_tier === tierKey;
                                 const priceDisplay = billingCycle === 'monthly' ? tier.monthlyPriceVal : tier.annualPriceVal;
                                 const period = billingCycle === 'monthly' ? '/mo' : '/yr';
                                 
                                 return (
                                     <div key={tier.id} className={`relative flex flex-col p-6 rounded-2xl border-2 transition-all ${isCurrent ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500' : 'border-slate-100 hover:border-blue-200 hover:shadow-xl bg-white'}`}>
                                         {tier.badge && (
                                             <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                                                 {tier.badge}
                                             </div>
                                         )}
                                         <div className="text-center mb-6">
                                             <h5 className="font-bold text-slate-900 text-lg mb-2">{tier.name}</h5>
                                             <div className="flex items-baseline justify-center gap-0.5 text-slate-900">
                                                 <span className="text-lg font-medium align-top mt-1">$</span>
                                                 <span className="text-4xl font-bold tracking-tight">{priceDisplay > 0 ? priceDisplay : '0'}</span>
                                                 <span className="text-slate-500 text-sm font-medium">{priceDisplay > 0 ? period : ''}</span>
                                             </div>
                                             <p className="text-xs text-slate-500 mt-3 font-medium">{tier.credits.toLocaleString()} credits / month</p>
                                         </div>
                                         
                                         <div className="flex-1">
                                             <ul className="space-y-3 mb-6">
                                                 {tier.features.map((feature, idx) => (
                                                     <li key={idx} className="flex items-start gap-3 text-sm text-slate-600">
                                                         <CheckCircle size={16} className={`shrink-0 mt-0.5 ${isCurrent ? 'text-blue-600' : 'text-slate-400'}`} />
                                                         <span className="leading-tight">{feature}</span>
                                                     </li>
                                                 ))}
                                             </ul>
                                         </div>

                                         <button 
                                            onClick={() => handleUpgrade(tierKey)}
                                            disabled={isCurrent}
                                            className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                                                isCurrent 
                                                ? 'bg-slate-200 text-slate-500 cursor-default ring-1 ring-slate-300' 
                                                : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg hover:scale-[1.02] active:scale-95'
                                            }`}
                                         >
                                             {isCurrent ? 'Current Plan' : 'Upgrade Now'}
                                         </button>
                                     </div>
                                 );
                             })}
                        </div>

                        {/* Management Section for Paid Users */}
                        {user.subscription_tier !== 'free' && (
                            <div className="border-t border-slate-200 pt-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-lg font-semibold text-slate-900">Subscription Management</h4>
                                    <button 
                                        onClick={handlePortal}
                                        disabled={isLoading}
                                        className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        Stripe Billing Portal <ExternalLink size={14} />
                                    </button>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mb-8">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-900">Status:</span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${user.cancel_at_period_end ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                    {user.cancel_at_period_end ? 'Cancelling' : 'Active'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {user.cancel_at_period_end 
                                                    ? `Access ends on ${user.current_period_end || 'period end'}.`
                                                    : `Next billing date: ${user.current_period_end || 'April 1, 2024'}`}
                                            </p>
                                        </div>
                                        {!user.cancel_at_period_end && (
                                            <button 
                                                onClick={handleCancelSubscription}
                                                disabled={isLoading}
                                                className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
                                            >
                                                Cancel Subscription
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <h4 className="text-base font-semibold text-slate-900 mb-4">Billing History</h4>
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                    {loadingHistory ? (
                                        <div className="p-8 text-center">
                                            <Loader2 className="animate-spin mx-auto text-slate-400" />
                                        </div>
                                    ) : (
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                                <tr>
                                                    <th className="px-6 py-3">Date</th>
                                                    <th className="px-6 py-3">Amount</th>
                                                    <th className="px-6 py-3">Status</th>
                                                    <th className="px-6 py-3 text-right">Invoice</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {billingHistory.map((item) => (
                                                    <tr key={item.id} className="hover:bg-slate-50/50">
                                                        <td className="px-6 py-4 text-slate-700">{item.date}</td>
                                                        <td className="px-6 py-4 font-medium text-slate-900">{item.amount}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 capitalize">
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <a href="#" className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
                                                                <Download size={14} /> PDF
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* FAQ */}
                        <div className="mt-12 pt-8 border-t border-slate-200">
                             <h4 className="text-lg font-bold text-slate-900 mb-6">Frequently Asked Questions</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div>
                                     <h5 className="font-semibold text-slate-800 mb-2">What are credits?</h5>
                                     <p className="text-sm text-slate-600 leading-relaxed">Credits are used for every message sent. System 1 (Flash) messages are cheap, while System 2 (Sage) messages cost more due to deep reasoning.</p>
                                 </div>
                                 <div>
                                     <h5 className="font-semibold text-slate-800 mb-2">Can I cancel anytime?</h5>
                                     <p className="text-sm text-slate-600 leading-relaxed">Yes, you can cancel your subscription at any time. Your credits and features will remain active until the end of your billing period.</p>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="max-w-xl animate-fade-in">
                        <form onSubmit={handleSaveProfile} className="space-y-6">
                            <div>
                                <h4 className="text-base font-medium text-slate-900 mb-4 flex items-center gap-2">
                                    <UserIcon size={18} />
                                    Profile Details
                                </h4>
                                <div className="grid gap-4">
                                    <div className="grid gap-1">
                                        <label className="text-sm font-medium text-slate-700">Full Name</label>
                                        <input 
                                            type="text" 
                                            value={nameEdit}
                                            onChange={(e) => setNameEdit(e.target.value)}
                                            className="px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <label className="text-sm font-medium text-slate-700">Email Address</label>
                                        <input 
                                            type="email" 
                                            value={emailEdit}
                                            onChange={(e) => setEmailEdit(e.target.value)}
                                            className="px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-200">
                                <h4 className="text-base font-medium text-slate-900 mb-4 flex items-center gap-2">
                                    <Shield size={18} />
                                    Privacy & Security
                                </h4>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                                    <div className="text-sm text-amber-800">
                                        <p className="font-semibold mb-1">Beta Environment</p>
                                        API Keys are currently managed via environment variables for security. To change your password or enable 2FA, please contact support.
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm shadow-sm">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
