import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Teams from "./pages/Teams";
import Subject from "./pages/Subject";
import Profile from "./pages/Profile";
import RoleSelection from "./pages/RoleSelection";
import CreateTestUsers from "./pages/CreateTestUsers";
import NotFound from "./pages/NotFound";
import RaycastBackground from "./components/RaycastBackground";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="relative min-h-screen bg-black">
        <RaycastBackground />
        <div className="relative z-10">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/role-selection" element={<RoleSelection />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/subject/:subjectCode" element={<Subject />} />
              <Route path="/create-test-users" element={<CreateTestUsers />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
