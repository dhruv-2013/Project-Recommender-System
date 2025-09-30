import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Users, Target, Brain } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";
import RaycastBackground from "./RaycastBackground";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Raycast Animated Background */}
      <RaycastBackground />
      
      {/* Subtle overlay to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/20 via-transparent to-background/30" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto animate-fade-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8 animate-scale-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Matching</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-6 leading-tight">
            Smart Project
            <br />
            Recommendations
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Match students with perfect projects using AI-driven skill analysis and 
            complementarity-based team formation for academic excellence.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button variant="hero" size="lg" className="px-8 py-4 text-lg">
              Get Started
              <ArrowRight className="ml-2" />
            </Button>
            <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
              View Demo
            </Button>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="flex flex-col items-center p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover-lift">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Skill Analysis</h3>
              <p className="text-muted-foreground text-center">
                Advanced NLP extracts and normalizes skills from resumes and project descriptions
              </p>
            </div>

            <div className="flex flex-col items-center p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover-lift">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Team Complementarity</h3>
              <p className="text-muted-foreground text-center">
                Forms balanced teams by matching complementary skills and strengths
              </p>
            </div>

            <div className="flex flex-col items-center p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover-lift">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Perfect Matches</h3>
              <p className="text-muted-foreground text-center">
                Recommends projects with highest compatibility for student success
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;