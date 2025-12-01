'use client';

import { useEffect, useRef, useState } from 'react';
import { Layers, SplitSquareVertical, Users, Scale } from 'lucide-react';

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const FEATURES: Feature[] = [
  {
    icon: Layers,
    title: 'Collaborative Mode',
    description: 'Flash kicks off with rapid insights. Sage builds upon them with deeper analysis. Two minds, one conversation.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
  },
  {
    icon: SplitSquareVertical,
    title: 'Parallel Mode',
    description: 'See both agents respond simultaneously in a split-pane view. Compare approaches instantly side-by-side.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-100',
  },
  {
    icon: Users,
    title: 'Expert Council',
    description: 'Summon Legal, Economic, Strategic, and Technical experts to analyze any question from all angles.',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-100',
  },
  {
    icon: Scale,
    title: 'Debate Mode',
    description: 'Pro and Con agents debate while a Moderator synthesizes the best arguments. Stress-test your ideas.',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-100',
  },
];

export default function FeatureShowcase() {
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

  return (
    <section ref={ref} className="py-16 lg:py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Four Ways to Think Together
          </h2>
          <p className="text-lg text-slate-600">
            Choose the mode that matches your thinking style. Each mode brings a unique perspective to your conversations.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className={`group transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className={`bg-white rounded-2xl p-6 lg:p-8 border ${feature.borderColor} shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
