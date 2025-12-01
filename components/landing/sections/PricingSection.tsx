'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  credits: string;
  features: string[];
  badge?: string;
  highlighted?: boolean;
}

const TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Freemium',
    description: 'Get started in seconds',
    monthlyPrice: 0,
    annualPrice: 0,
    credits: '100 credits/mo',
    features: [
      'Access to Flash agent',
      'Limited Sage access',
      'Standard response times',
      'Community support',
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    description: 'For serious thinkers',
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    credits: '1,000 credits/mo',
    features: [
      'Full Flash & Sage access',
      'Priority processing',
      '2x Context Window',
      'Email support',
      'Conversation history',
    ],
    badge: 'Most Popular',
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Unlimited potential',
    monthlyPrice: 29.99,
    annualPrice: 299.99,
    credits: '5,000 credits/mo',
    features: [
      'Unlimited Flash usage',
      'High Sage limits',
      'Expert Council access',
      'Debate Mode access',
      'Max Context Window',
      '24/7 Priority support',
      'Early access features',
    ],
  },
];

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
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
    <section ref={ref} id="pricing" className="py-16 lg:py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center max-w-3xl mx-auto mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Start free, upgrade when you're ready. No hidden fees.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                !isAnnual
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                isAnnual
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isAnnual ? 'bg-blue-500' : 'bg-green-100 text-green-700'}`}>
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {TIERS.map((tier, index) => (
            <div
              key={tier.id}
              className={`transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div
                className={`relative bg-white rounded-2xl p-6 lg:p-8 h-full flex flex-col ${
                  tier.highlighted
                    ? 'border-2 border-blue-500 shadow-xl shadow-blue-500/10'
                    : 'border border-slate-200 shadow-sm'
                }`}
              >
                {/* Badge */}
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {tier.badge}
                    </span>
                  </div>
                )}

                {/* Tier info */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{tier.name}</h3>
                  <p className="text-sm text-slate-500 mb-4">{tier.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-slate-900">
                      ${isAnnual ? Math.round(tier.annualPrice / 12) : tier.monthlyPrice}
                    </span>
                    <span className="text-slate-500">/mo</span>
                  </div>
                  {isAnnual && tier.annualPrice > 0 && (
                    <p className="text-sm text-green-600 mt-1">
                      ${tier.annualPrice}/year billed annually
                    </p>
                  )}
                  <p className="text-sm text-blue-600 font-medium mt-2">{tier.credits}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-grow">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-slate-600 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={`/auth/register?plan=${tier.id}`}
                  className={`block text-center py-3 px-4 rounded-xl font-semibold transition-all ${
                    tier.highlighted
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 hover:shadow-lg hover:scale-105'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tier.monthlyPrice === 0 ? 'Get Started Free' : 'Choose Plan'}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Money-back guarantee */}
        <p
          className={`text-center text-sm text-slate-500 mt-8 transition-all duration-700 delay-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          30-day money-back guarantee. No questions asked.
        </p>
      </div>
    </section>
  );
}
