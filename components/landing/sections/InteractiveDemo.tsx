'use client';

import { useEffect, useRef, useState } from 'react';
import { Zap, Brain, Users, Scale, MessageSquare } from 'lucide-react';

type DemoMode = 'collaborative' | 'parallel' | 'council' | 'debate';

interface DemoMessage {
  agent: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  message: string;
}

const DEMO_CONTENT: Record<DemoMode, { userMessage: string; responses: DemoMessage[] }> = {
  collaborative: {
    userMessage: 'Should we adopt microservices architecture?',
    responses: [
      {
        agent: 'Flash',
        icon: Zap,
        color: 'text-blue-600',
        bgColor: 'bg-blue-500',
        message: 'Yes! Microservices offer better scalability, independent deployments, and team autonomy. Start by identifying bounded contexts.',
      },
      {
        agent: 'Sage',
        icon: Brain,
        color: 'text-amber-600',
        bgColor: 'bg-amber-500',
        message: 'While Flash is right about benefits, consider: Do you have DevOps maturity? Microservices add complexity. For small teams (<10 devs), a modular monolith might be wiser first.',
      },
    ],
  },
  parallel: {
    userMessage: 'What pricing model should we use?',
    responses: [
      {
        agent: 'Flash',
        icon: Zap,
        color: 'text-blue-600',
        bgColor: 'bg-blue-500',
        message: 'Freemium with usage-based tiers. Low friction acquisition, then expand revenue with power users.',
      },
      {
        agent: 'Sage',
        icon: Brain,
        color: 'text-amber-600',
        bgColor: 'bg-amber-500',
        message: 'Consider your CAC/LTV ratio first. If acquisition is expensive, enterprise flat-rate ensures predictable revenue. Freemium works when viral loops exist.',
      },
    ],
  },
  council: {
    userMessage: 'Should we expand to the European market?',
    responses: [
      {
        agent: 'Legal Expert',
        icon: Scale,
        color: 'text-purple-600',
        bgColor: 'bg-purple-500',
        message: 'GDPR compliance is mandatory. You\'ll need EU data residency, DPO appointment, and privacy policy updates. Budget 3-6 months.',
      },
      {
        agent: 'Economist',
        icon: Users,
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        message: 'EUR/USD volatility is a factor. Consider transfer pricing implications. The EU SaaS market is growing 15% YoY—worth the investment.',
      },
    ],
  },
  debate: {
    userMessage: 'Remote work should be permanent for our company.',
    responses: [
      {
        agent: 'Proponent',
        icon: Zap,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-500',
        message: 'Remote work increases productivity 13%, reduces overhead, and expands your talent pool globally. Top talent demands flexibility.',
      },
      {
        agent: 'Opponent',
        icon: Scale,
        color: 'text-rose-600',
        bgColor: 'bg-rose-500',
        message: 'Innovation suffers without serendipitous encounters. Junior employees lack mentorship. Culture erodes. Hybrid 3-2 is optimal.',
      },
    ],
  },
};

const MODES: { id: DemoMode; label: string; icon: React.ElementType }[] = [
  { id: 'collaborative', label: 'Collaborative', icon: MessageSquare },
  { id: 'parallel', label: 'Parallel', icon: Zap },
  { id: 'council', label: 'Council', icon: Users },
  { id: 'debate', label: 'Debate', icon: Scale },
];

export default function InteractiveDemo() {
  const [activeMode, setActiveMode] = useState<DemoMode>('collaborative');
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
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const currentDemo = DEMO_CONTENT[activeMode];

  return (
    <section ref={ref} id="demo" className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center max-w-3xl mx-auto mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            See It In Action
          </h2>
          <p className="text-lg text-slate-600">
            Explore how different modes provide unique perspectives on the same question.
          </p>
        </div>

        {/* Mode Tabs */}
        <div
          className={`flex justify-center mb-8 transition-all duration-700 delay-100 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex bg-slate-100 rounded-xl p-1.5">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  activeMode === mode.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <mode.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Demo Window */}
        <div
          className={`max-w-3xl mx-auto transition-all duration-700 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Window header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-sm font-medium text-slate-600 ml-2">
                Agoryx Chat — {MODES.find((m) => m.id === activeMode)?.label} Mode
              </span>
            </div>

            {/* Chat content */}
            <div className="p-6 space-y-4 bg-slate-50/50 min-h-[320px]">
              {/* User message */}
              <div className="flex justify-end animate-fade-in">
                <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-md shadow-sm">
                  <p className="text-sm">{currentDemo.userMessage}</p>
                </div>
              </div>

              {/* Agent responses */}
              {currentDemo.responses.map((response, index) => (
                <div
                  key={`${activeMode}-${index}`}
                  className="flex gap-3 animate-fade-in"
                  style={{ animationDelay: `${(index + 1) * 200}ms` }}
                >
                  <div
                    className={`w-8 h-8 rounded-full ${response.bgColor} flex items-center justify-center flex-shrink-0 shadow-sm`}
                  >
                    <response.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm max-w-md shadow-sm">
                    <p className={`text-xs font-semibold ${response.color} mb-1`}>
                      {response.agent}
                    </p>
                    <p className="text-sm text-slate-700">{response.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input field */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-100 rounded-xl">
                <span className="text-sm text-slate-400">Try it yourself — Start free today</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
