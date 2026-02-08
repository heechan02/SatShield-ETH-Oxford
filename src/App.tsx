import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/shared/Layout";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import ConfigurePolicy from "./pages/ConfigurePolicy";
import ActivePolicy from "./pages/ActivePolicy";
import MonitorPage from "./pages/MonitorPage";
import EventPage from "./pages/EventPage";
import ProtocolExplorer from "./pages/ProtocolExplorer";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <WalletProvider>
          <DemoModeProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/configure/:poolId" element={<ProtectedRoute><ConfigurePolicy /></ProtectedRoute>} />
                  <Route path="/monitor" element={<ProtectedRoute><MonitorPage /></ProtectedRoute>} />
                  <Route path="/policy/:policyId" element={<ProtectedRoute><ActivePolicy /></ProtectedRoute>} />
                  <Route path="/event/:eventId" element={<ProtectedRoute><EventPage /></ProtectedRoute>} />
                  <Route path="/protocols" element={<ProtectedRoute><ProtocolExplorer /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </DemoModeProvider>
        </WalletProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
