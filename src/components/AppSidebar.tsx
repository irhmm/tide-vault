import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Wallet, 
  CreditCard, 
  PiggyBank, 
  TrendingUp, 
  BarChart3, 
  Target,
  Banknote,
  Receipt,
  LogOut
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from '@/components/ui/button';

const navItems = [
  { 
    name: 'Dashboard', 
    path: '/dashboard', 
    icon: BarChart3 
  },
  { 
    name: 'Catatan Hutang', 
    path: '/debts', 
    icon: CreditCard 
  },
  { 
    name: 'Aset', 
    path: '/assets', 
    icon: Wallet 
  },
  { 
    name: 'Tabungan', 
    path: '/savings', 
    icon: PiggyBank 
  },
  { 
    name: 'Keuangan', 
    path: '/transactions', 
    icon: TrendingUp 
  },
  { 
    name: 'Goals & Target', 
    path: '/goals', 
    icon: Target 
  },
  { 
    name: 'Target Finansial', 
    path: '/financial-targets', 
    icon: Banknote 
  },
  { 
    name: 'Catatan Tagihan', 
    path: '/bills', 
    icon: Receipt 
  },
];

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout berhasil",
      description: "Anda telah keluar dari akun",
    });
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center p-4">
          <Wallet className="w-8 h-8 text-primary mr-3" />
          {!collapsed && (
            <h1 className="text-xl font-bold text-sidebar-foreground">
              Keuangan Pribadi
            </h1>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.path)}
                    className="btn-hover-scale"
                  >
                    <button onClick={() => navigate(item.path)}>
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.name}</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent btn-hover-scale"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Keluar</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}