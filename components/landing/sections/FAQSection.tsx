'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
}

const FAQS: FAQ[] = [
  {
    question: 'What are credits and how do they work?',
    answer: 'Credits are consumed with each message you send. Flash uses fewer credits (quick, efficient responses). Sage and Expert Council use more credits (deep analysis). Your credits reset at the beginning of each billing period. Unused credits don\'t roll over.',
  },
  {
    question: 'Can I switch between agents in the same conversation?',
    answer: 'Absolutely! You can switch between Collaborative, Parallel, Expert Council, and Debate modes at any time. Your conversation history is preserved, and agents can build on previous responses for context-aware answers.',
  },
  {
    question: 'What makes Agoryx different from ChatGPT or Claude?',
    answer: 'Single-model chats give you one perspective. Agoryx orchestrates multiple specialized AI agents that work together — you get both quick intuition AND deep analysis in every conversation. It\'s like having an advisory board instead of a single consultant.',
  },
  {
    question: 'Is my data private and secure?',
    answer: 'Yes. Your conversations are encrypted in transit and at rest. We never use your data to train our models. We follow enterprise-grade security practices including SOC 2 compliance standards. You can delete your data at any time.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, cancel anytime with one click from your dashboard. There are no cancellation fees. Your credits and features remain active until your current billing period ends. We also offer a 30-day money-back guarantee, no questions asked.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
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
    <section ref={ref} id="faq" className="py-16 lg:py-24 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-slate-600">
            Everything you need to know about Agoryx.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div
          className={`space-y-4 transition-all duration-700 delay-100 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {FAQS.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-semibold text-slate-900 pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-5 pb-5 text-slate-600 leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div
          className={`text-center mt-12 transition-all duration-700 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-slate-600 mb-4">Still have questions?</p>
          <a
            href="mailto:support@agoryx.ai"
            className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors"
          >
            Contact our support team →
          </a>
        </div>
      </div>
    </section>
  );
}
