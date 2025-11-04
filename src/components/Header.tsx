import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Brain, Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User as SupabaseUser } from "@supabase/supabase-js";
import StudentProfileForm from "@/components/StudentProfileForm";

interface HeaderProps {
  user?: SupabaseUser;
  profile?: any;
  onSignOut?: () => void;
}

const Header = ({ user, profile, onSignOut }: HeaderProps = {}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 w-full bg-black/20 backdrop-blur-xl border-b border-white/10 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-white">
              ProjectMatch
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {user && profile?.role === 'admin' && (
              <Button 
                onClick={() => navigate('/admin')} 
                variant="ghost"
                className="text-foreground hover:text-foreground/80"
              >
                Admin Dashboard
              </Button>
            )}
            {user && profile?.role === 'student' && (
              <Button 
                onClick={() => navigate('/profile')} 
                variant="ghost"
                className="text-white hover:text-white/80"
              >
                Profile & Marks
              </Button>
            )}
            {user && (
              <>
                <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-white hover:text-white/80"
                    aria-label="Profile"
                    onClick={() => setIsProfileOpen((prev) => !prev)}
                  >
                    <User className="w-5 h-5" />
                  </Button>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                    </DialogHeader>
                    <div className="pt-2">
                      <StudentProfileForm onProfileCreated={() => setIsProfileOpen(false)} />
                    </div>
                  </DialogContent>
                </Dialog>
                <Button onClick={onSignOut} variant="outline" size="sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
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

      </div>
    </header>
  );
};

export default Header;