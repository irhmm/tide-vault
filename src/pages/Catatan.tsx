import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RichTextEditor from "@/components/RichTextEditor";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Plus, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

const catatanSchema = z.object({
  judul: z.string().min(1, 'Judul tidak boleh kosong'),
  isi: z.string().optional(),
});

type CatatanFormData = z.infer<typeof catatanSchema>;

interface Catatan {
  id: string;
  judul: string;
  isi: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const Catatan = () => {
  const [catatan, setCatatan] = useState<Catatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCatatan, setEditingCatatan] = useState<Catatan | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<CatatanFormData>({
    resolver: zodResolver(catatanSchema),
    defaultValues: {
      judul: '',
      isi: '',
    },
  });

  useEffect(() => {
    if (user) {
      fetchCatatan();
    }
  }, [user]);

  const fetchCatatan = async () => {
    try {
      const { data, error } = await supabase
        .from('catatan')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCatatan(data || []);
    } catch (error) {
      console.error('Error fetching catatan:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat catatan',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CatatanFormData) => {
    try {
      if (editingCatatan) {
        // Update existing catatan
        const { error } = await supabase
          .from('catatan')
          .update({
            judul: data.judul,
            isi: data.isi,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCatatan.id)
          .eq('user_id', user?.id);

        if (error) throw error;
        toast({
          title: 'Berhasil',
          description: 'Catatan berhasil diperbarui',
        });
      } else {
        // Create new catatan
        const { error } = await supabase
          .from('catatan')
          .insert({
            judul: data.judul,
            isi: data.isi,
            user_id: user?.id,
          });

        if (error) throw error;
        toast({
          title: 'Berhasil',
          description: 'Catatan berhasil ditambahkan',
        });
      }

      form.reset();
      setIsDialogOpen(false);
      setEditingCatatan(null);
      fetchCatatan();
    } catch (error) {
      console.error('Error saving catatan:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan catatan',
        variant: 'destructive',
      });
    }
  };

  const deleteCatatan = async (id: string) => {
    try {
      const { error } = await supabase
        .from('catatan')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Catatan berhasil dihapus',
      });
      fetchCatatan();
    } catch (error) {
      console.error('Error deleting catatan:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghapus catatan',
        variant: 'destructive',
      });
    }
  };

  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const exportToTxt = async () => {
    try {
      const { data, error } = await supabase
        .from('catatan')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: 'Info',
          description: 'Tidak ada catatan untuk diekspor',
        });
        return;
      }

      data.forEach((item, index) => {
        const plainTextIsi = item.isi ? stripHtml(item.isi) : '';
        
        let textContent = '';
        textContent += `${item.judul}\n`;
        textContent += `${format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}\n`;
        textContent += `\n${plainTextIsi}\n`;

        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Create safe filename from title
        const safeTitle = item.judul.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const dateString = format(new Date(item.created_at), 'yyyy-MM-dd');
        a.download = `${safeTitle}_${dateString}.txt`;
        
        document.body.appendChild(a);
        
        // Add delay between downloads to prevent browser blocking
        setTimeout(() => {
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, index * 100);
      });

      toast({
        title: 'Berhasil',
        description: `${data.length} file catatan berhasil diekspor`,
      });
    } catch (error) {
      console.error('Error exporting catatan:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengekspor catatan',
        variant: 'destructive',
      });
    }
  };

  const exportSingleToTxt = (item: Catatan) => {
    try {
      const plainTextIsi = item.isi ? stripHtml(item.isi) : '';
      
      let textContent = '';
      textContent += `${item.judul}\n`;
      textContent += `${format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}\n`;
      textContent += `\n${plainTextIsi}\n`;

      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Create safe filename from title
      const safeTitle = item.judul.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const dateString = format(new Date(item.created_at), 'yyyy-MM-dd');
      a.download = `${safeTitle}_${dateString}.txt`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Berhasil',
        description: `Catatan "${item.judul}" berhasil diekspor`,
      });
    } catch (error) {
      console.error('Error exporting single catatan:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengekspor catatan',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (catatanItem: Catatan) => {
    setEditingCatatan(catatanItem);
    form.reset({
      judul: catatanItem.judul,
      isi: catatanItem.isi || '',
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingCatatan(null);
    form.reset({
      judul: '',
      isi: '',
    });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Memuat catatan...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Catatan</h1>
        <div className="flex gap-2">
          <Button onClick={exportToTxt} variant="outline" disabled={catatan.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export TXT
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Catatan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCatatan ? 'Edit Catatan' : 'Tambah Catatan'}
                </DialogTitle>
                <DialogDescription>
                  {editingCatatan ? 'Perbarui catatan Anda' : 'Buat catatan baru'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="judul"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Judul</FormLabel>
                        <FormControl>
                          <Input placeholder="Masukkan judul catatan" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Isi</FormLabel>
                        <FormControl>
                          <RichTextEditor
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Tulis isi catatan di sini..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Batal
                    </Button>
                    <Button type="submit">
                      {editingCatatan ? 'Perbarui' : 'Simpan'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {catatan.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">Belum ada catatan</p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Catatan Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {catatan.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.judul}</CardTitle>
                    <CardDescription>
                      {format(new Date(item.created_at), 'dd MMMM yyyy, HH:mm')}
                      {item.updated_at !== item.created_at && (
                        <span className="ml-2 text-xs">
                          (diperbarui: {format(new Date(item.updated_at), 'dd/MM/yyyy HH:mm')})
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportSingleToTxt(item)}
                      title="Export catatan ini ke TXT"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(item)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Catatan</AlertDialogTitle>
                          <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus catatan "{item.judul}"?
                            Tindakan ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteCatatan(item.id)}>
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Catatan;