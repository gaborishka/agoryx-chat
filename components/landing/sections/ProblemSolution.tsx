'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Check, MessageSquare, Users } from 'lucide-react';

export default function ProblemSolution() {
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
    <section ref={ref} className="py-16 lg:py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
          {/* Problem */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            }`}
          >
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-red-500" />
                </div>
                <span className="text-sm font-semibold text-red-600 uppercase tracking-wide">The Problem</span>
              </div>

              <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4">
                Single AI. Limited Perspective.
              </h3>

              <p className="text-slate-600 mb-6 leading-relaxed">
                ChatGPT gives you one answer. Claude gives you one analysis. But real decisions need both
                quick intuition AND careful reasoning. You shouldn't have to choose.
              </p>

              <ul className="space-y-3">
                {[
                  'Tab-switching between multiple AI tools',
                  'Missing the deep analysis when you need speed',
                  'Missing quick answers when you need depth',
                  'No specialized perspectives for complex decisions',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-red-500" />
                    </div>
                    <span className="text-slate-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Solution */}
          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            }`}
          >
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white h-full shadow-xl shadow-blue-500/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-blue-200 uppercase tracking-wide">The Solution</span>
              </div>

              <h3 className="text-2xl lg:text-3xl font-bold mb-4">
                Multiple Agents. Complete Picture.
              </h3>

              <p className="text-blue-100 mb-6 leading-relaxed">
                Agoryx orchestrates specialized AI agents that work together. Flash thinks fast.
                Sage thinks deep. Every question deserves more than one perspective.
              </p>

              <ul className="space-y-3">
                {[
                  'Multiple AI agents in one conversation',
                  'System 1 (fast) + System 2 (deep) thinking',
                  'Expert Council for complex decisions',
                  'Debate mode to stress-test your ideas',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
