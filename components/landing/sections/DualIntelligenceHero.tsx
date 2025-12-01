'use client';

import { useEffect, useRef, useState } from 'react';
import { Zap, Brain, ArrowRight } from 'lucide-react';

export default function DualIntelligenceHero() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} id="features" className="py-16 lg:py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="inline-block px-4 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-semibold mb-4">
            Inspired by Nobel-winning Cognitive Science
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
            Dual Intelligence by Default
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            Agoryx brings System 1 and System 2 thinking to AI. Flash delivers rapid, intuitive responses.
            Sage provides methodical, analytical breakdowns. Together, they give you the complete picture.
          </p>
        </div>

        {/* Comparison */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* System 1 - Flash */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            }`}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition-opacity" />
              <div className="relative bg-white rounded-2xl border border-blue-100 p-8 h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Zap className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Flash</h3>
                    <p className="text-blue-600 font-medium">System 1 Thinking</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-slate-700">Lightning-fast responses</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-slate-700">Intuitive pattern recognition</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-slate-700">Quick brainstorming</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-slate-700">First impressions & heuristics</span>
                  </div>
                </div>

                {/* Example response */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 mb-2">Example Response</p>
                  <p className="text-sm text-slate-700">
                    "Add indexes to your JOIN columns for immediate 10x improvement. Here's the SQL..."
                  </p>
                  <p className="text-xs text-blue-500 mt-2 font-medium">⚡ Response time: ~1s</p>
                </div>
              </div>
            </div>
          </div>

          {/* System 2 - Sage */}
          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            }`}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition-opacity" />
              <div className="relative bg-white rounded-2xl border border-amber-100 p-8 h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Brain className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Sage</h3>
                    <p className="text-amber-600 font-medium">System 2 Thinking</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    <span className="text-slate-700">Deep analytical reasoning</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    <span className="text-slate-700">Step-by-step breakdowns</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    <span className="text-slate-700">Critical evaluation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    <span className="text-slate-700">Root cause analysis</span>
                  </div>
                </div>

                {/* Example response */}
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-600 mb-2">Example Response</p>
                  <p className="text-sm text-slate-700">
                    "While indexing helps, let's analyze deeper: Why are you joining on text columns? Numeric IDs are 3x faster..."
                  </p>
                  <p className="text-xs text-amber-500 mt-2 font-medium">🧠 Response time: ~5s</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Flow indicator */}
        <div
          className={`flex justify-center items-center gap-4 mt-12 transition-all duration-700 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-xl">
            <Zap className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Flash responds first</span>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400" />
          <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 rounded-xl">
            <Brain className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">Sage adds depth</span>
          </div>
        </div>
      </div>
    </section>
  );
}
