import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Debts from "./pages/Debts";
import Assets from "./pages/Assets";
import Savings from "./pages/Savings";
import Transactions from "./pages/Transactions";
import Goals from "./pages/Goals";
import FinancialTargets from "./pages/FinancialTargets";
import Bills from "./pages/Bills";
import Reminders from "./pages/Reminders";
import Catatan from "./pages/Catatan";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="debts" element={<Debts />} />
              <Route path="assets" element={<Assets />} />
              <Route path="savings" element={<Savings />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="goals" element={<Goals />} />
              <Route path="financial-targets" element={<FinancialTargets />} />
              <Route path="bills" element={<Bills />} />
              <Route path="reminders" element={<Reminders />} />
              <Route path="catatan" element={<Catatan />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
