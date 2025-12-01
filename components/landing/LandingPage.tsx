'use client';

import LandingNav from './LandingNav';
import LandingFooter from './LandingFooter';
import HeroSection from './sections/HeroSection';
import SocialProofBar from './sections/SocialProofBar';
import ProblemSolution from './sections/ProblemSolution';
import DualIntelligenceHero from './sections/DualIntelligenceHero';
import FeatureShowcase from './sections/FeatureShowcase';
import InteractiveDemo from './sections/InteractiveDemo';
import PricingSection from './sections/PricingSection';
import TestimonialSection from './sections/TestimonialSection';
import FAQSection from './sections/FAQSection';
import FinalCTA from './sections/FinalCTA';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <LandingNav />

      <main>
        <HeroSection />
        <SocialProofBar />
        <ProblemSolution />
        <DualIntelligenceHero />
        <FeatureShowcase />
        <InteractiveDemo />
        <PricingSection />
        <TestimonialSection />
        <FAQSection />
        <FinalCTA />
      </main>

      <LandingFooter />
    </div>
  );
}
