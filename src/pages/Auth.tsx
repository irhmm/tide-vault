import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Eye, EyeOff } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Silakan isi email dan password",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      let result;
      if (isLogin) {
        result = await signIn(email, password);
      } else {
        if (!fullName) {
          toast({
            title: "Error", 
            description: "Silakan isi nama lengkap",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        result = await signUp(email, password, fullName);
      }

      if (result.error) {
        let errorMessage = "Terjadi kesalahan";
        
        if (result.error.message.includes('already registered')) {
          errorMessage = "Email sudah terdaftar. Silakan login atau gunakan email lain.";
        } else if (result.error.message.includes('Invalid login credentials')) {
          errorMessage = "Email atau password salah";
        } else if (result.error.message.includes('Password should be at least')) {
          errorMessage = "Password minimal 6 karakter";
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      } else {
        if (!isLogin) {
          toast({
            title: "Pendaftaran berhasil!",
            description: "Silakan cek email untuk konfirmasi akun",
          });
        } else {
          toast({
            title: "Login berhasil!",
            description: "Selamat datang di Manajemen Keuangan Pribadi",
          });
          navigate('/dashboard');
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan sistem",
        variant: "destructive"
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-primary-hover rounded-full mb-4 shadow-glow">
            <Wallet className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
            Keuangan Pribadi
          </h1>
          <p className="text-muted-foreground mt-2">
            Kelola keuangan Anda dengan mudah dan aman
          </p>
        </div>

        <Card className="financial-card slide-up">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {isLogin ? 'Masuk' : 'Daftar'}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin 
                ? 'Masuk ke akun Anda untuk melanjutkan' 
                : 'Buat akun baru untuk mulai mengelola keuangan'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={isLogin ? 'login' : 'register'} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger 
                  value="login" 
                  onClick={() => setIsLogin(true)}
                  className="btn-hover-scale"
                >
                  Masuk
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  onClick={() => setIsLogin(false)}
                  className="btn-hover-scale"
                >
                  Daftar
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <TabsContent value="register" className="space-y-4 mt-0">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nama Lengkap</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Masukkan nama lengkap"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="form-input"
                        required={!isLogin}
                      />
                    </div>
                  </TabsContent>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-input pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full btn-hover-scale bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary shadow-medium"
                  disabled={loading}
                >
                  {loading ? 'Memproses...' : (isLogin ? 'Masuk' : 'Daftar')}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Dengan menggunakan aplikasi ini, Anda setuju dengan kebijakan privasi kami
        </p>
      </div>
    </div>
  );
};

export default Auth;