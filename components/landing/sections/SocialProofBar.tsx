'use client';

import { useEffect, useRef, useState } from 'react';

interface Stat {
  value: string;
  label: string;
}

const STATS: Stat[] = [
  { value: '10,000+', label: 'Conversations powered' },
  { value: '500+', label: 'Active users' },
  { value: '4.8/5', label: 'User rating' },
  { value: '99.9%', label: 'Uptime' },
];

const COMPANY_LOGOS = [
  { name: 'TechFlow', initial: 'TF' },
  { name: 'DataSphere', initial: 'DS' },
  { name: 'InnovateCo', initial: 'IC' },
  { name: 'NextGen AI', initial: 'NG' },
  { name: 'Velocity', initial: 'VL' },
];

export default function SocialProofBar() {
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
    <section ref={ref} className="py-12 lg:py-16 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {STATS.map((stat, index) => (
            <div
              key={stat.label}
              className={`text-center transition-all duration-500 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="text-3xl sm:text-4xl font-bold text-slate-900 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Company logos */}
        <div className="text-center">
          <p className="text-sm text-slate-500 mb-6">Trusted by teams at</p>
          <div className="flex flex-wrap justify-center gap-8 lg:gap-12">
            {COMPANY_LOGOS.map((company, index) => (
              <div
                key={company.name}
                className={`group transition-all duration-500 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${(index + 4) * 100}ms` }}
              >
                <div className="flex items-center gap-2 text-slate-400 grayscale hover:grayscale-0 hover:text-slate-700 transition-all duration-300">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center font-bold text-sm transition-colors">
                    {company.initial}
                  </div>
                  <span className="font-semibold hidden sm:block">{company.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
