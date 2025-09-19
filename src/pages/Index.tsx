import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import StudentProfileForm from "@/components/StudentProfileForm";
import ProjectRecommendations from "@/components/ProjectRecommendations";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <HeroSection />
        <StudentProfileForm />
        <ProjectRecommendations />
      </main>
    </div>
  );
};

export default Index;