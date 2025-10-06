import { Button } from "@/components/ui/button";
import { Brain, Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface HeaderProps {
  user?: SupabaseUser;
  profile?: any;
  onSignOut?: () => void;
}

const Header = ({ user, profile, onSignOut }: HeaderProps = {}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 w-full bg-black/20 backdrop-blur-xl border-b border-white/10 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-white">
              ProjectMatch
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#projects" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              Projects
            </a>
            <a href="#about" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              About
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="text-white hover:bg-white/10">
                  Projects
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/teams')} className="text-white hover:bg-white/10">
                  Teams
                </Button>
                {profile?.role === 'admin' && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                    Admin
                  </Button>
                )}
                <div className="flex items-center gap-2 text-sm text-white">
                  <User className="w-4 h-4" />
                  <span>
                    {profile?.full_name || user.email}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={onSignOut} className="text-white hover:bg-white/10">
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-white/70 hover:text-white hover:bg-white/10">
                  Sign In
                </Button>
                <Button size="sm" onClick={() => navigate('/auth')} className="bg-white/10 text-white border border-white/20 hover:bg-white/20">
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border animate-fade-in">
            <nav className="py-4 space-y-2">
              <a 
                href="#features" 
                className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </a>
              <a 
                href="#how-it-works" 
                className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                How It Works
              </a>
              <a 
                href="#projects" 
                className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Projects
              </a>
              <a 
                href="#about" 
                className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </a>
              <div className="flex flex-col gap-2 px-4 pt-4 border-t border-border">
                {user ? (
                  <>
                    <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{user.user_metadata?.full_name || user.email}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="justify-start" onClick={onSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="justify-start">
                      Sign In
                    </Button>
                    <Button variant="gradient" size="sm">
                      Get Started
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;