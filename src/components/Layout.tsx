import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Wallet, 
  CreditCard, 
  PiggyBank, 
  TrendingUp, 
  BarChart3, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const Layout = () => {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout berhasil",
      description: "Anda telah keluar dari akun",
    });
    navigate('/auth');
  };

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
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent">
      {/* Top Navigation */}
      <nav className="navbar-gradient shadow-strong">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Wallet className="w-8 h-8 text-primary-foreground mr-3" />
                <h1 className="text-xl font-bold text-primary-foreground">
                  Keuangan Pribadi
                </h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 btn-hover-scale ${
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground'
                      }`}
                    >
                      <item.icon className="w-4 h-4 inline mr-2" />
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Menu */}
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6">
                <span className="text-primary-foreground/80 mr-4 text-sm">
                  {user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-primary-foreground hover:bg-primary-foreground/20 btn-hover-scale"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Keluar
                </Button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-primary-foreground hover:bg-primary-foreground/20 p-2 rounded-md"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-primary-hover/10">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left transition-colors ${
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground'
                    }`}
                  >
                    <item.icon className="w-4 h-4 inline mr-2" />
                    {item.name}
                  </button>
                );
              })}
              <div className="border-t border-primary-foreground/20 pt-4">
                <div className="px-3 pb-2">
                  <p className="text-primary-foreground/60 text-sm">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="block px-3 py-2 rounded-md text-base font-medium w-full text-left text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <LogOut className="w-4 h-4 inline mr-2" />
                  Keluar
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;