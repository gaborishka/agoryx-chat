'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Play, Zap, Brain, Sparkles } from 'lucide-react';

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 pt-16 pb-24 lg:pt-24 lg:pb-32">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-sm text-blue-700 font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Multi-Agent AI Chat
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
              Think Fast.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-500">
                Think Deep.
              </span>{' '}
              <br className="hidden sm:block" />
              Think Agoryx.
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-8 max-w-xl">
              The first AI chat that combines intuitive quick thinking with analytical deep reasoning.
              Get instant answers <span className="font-semibold text-slate-700">AND</span> thorough analysis in every conversation.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg shadow-blue-500/25 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105 transition-all duration-200"
              >
                Start Free Today
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 bg-white text-slate-700 font-semibold px-6 py-3.5 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
              >
                <Play className="w-5 h-5" />
                Watch Demo
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                100 free credits
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Cancel anytime
              </div>
            </div>
          </div>

          {/* Right: Demo Preview */}
          <div className={`transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="relative">
              {/* Chat window mockup */}
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                {/* Window header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-600 ml-2">Agoryx Chat</span>
                </div>

                {/* Chat messages */}
                <div className="p-4 space-y-4 bg-slate-50/50">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-xs shadow-sm">
                      <p className="text-sm">How can I improve my SQL query performance?</p>
                    </div>
                  </div>

                  {/* Flash response */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-xs shadow-sm">
                      <p className="text-xs font-semibold text-blue-600 mb-1">Flash</p>
                      <p className="text-sm text-slate-700">Add indexes to your JOIN columns for immediate 10x improvement.</p>
                    </div>
                  </div>

                  {/* Sage response */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-xs shadow-sm">
                      <p className="text-xs font-semibold text-amber-600 mb-1">Sage</p>
                      <p className="text-sm text-slate-700">While indexing helps, consider why you're joining on text columns. Numeric IDs are 3x faster...</p>
                    </div>
                  </div>
                </div>

                {/* Input field */}
                <div className="p-4 border-t border-slate-200 bg-white">
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-100 rounded-xl">
                    <span className="text-sm text-slate-400">Ask anything...</span>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -left-4 top-1/4 bg-white px-3 py-2 rounded-xl shadow-lg border border-slate-100 hidden lg:flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-slate-600">System 1: Fast</span>
              </div>
              <div className="absolute -right-4 top-1/2 bg-white px-3 py-2 rounded-xl shadow-lg border border-slate-100 hidden lg:flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-slate-600">System 2: Deep</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
