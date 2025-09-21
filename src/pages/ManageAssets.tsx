import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Plus, Pencil, Trash2, Search } from 'lucide-react';

interface SupportedAsset {
  id: string;
  symbol: string;
  name: string;
  asset_type: string;
  api_endpoint: string | null;
  created_at: string;
}

const ManageAssets = () => {
  const { toast } = useToast();
  const [assets, setAssets] = useState<SupportedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<SupportedAsset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    asset_type: '',
    api_endpoint: '',
  });

  const assetTypes = [
    { value: 'crypto', label: 'Cryptocurrency' },
    { value: 'precious_metal', label: 'Logam Mulia' },
    { value: 'stock', label: 'Saham' },
    { value: 'currency', label: 'Mata Uang Asing' },
  ];

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('supported_assets')
        .select('*')
        .order('name');

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching supported assets:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data aset yang didukung",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.symbol || !formData.name || !formData.asset_type) {
      toast({
        title: "Error",
        description: "Symbol, nama, dan tipe aset wajib diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      const assetData = {
        symbol: formData.symbol.toUpperCase(),
        name: formData.name,
        asset_type: formData.asset_type,
        api_endpoint: formData.api_endpoint || null,
      };

      if (editingAsset) {
        const { error } = await supabase
          .from('supported_assets')
          .update(assetData)
          .eq('id', editingAsset.id);

        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Data aset berhasil diperbarui",
        });
      } else {
        const { error } = await supabase
          .from('supported_assets')
          .insert([assetData]);

        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Aset baru berhasil ditambahkan",
        });
      }

      setDialogOpen(false);
      setEditingAsset(null);
      resetForm();
      fetchAssets();
    } catch (error: any) {
      console.error('Error saving asset:', error);
      toast({
        title: "Error",
        description: error.message.includes('duplicate') ? 
          "Symbol sudah ada untuk tipe aset ini" : 
          "Gagal menyimpan data aset",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (asset: SupportedAsset) => {
    setEditingAsset(asset);
    setFormData({
      symbol: asset.symbol,
      name: asset.name,
      asset_type: asset.asset_type,
      api_endpoint: asset.api_endpoint || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus aset ini?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('supported_assets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Berhasil",
        description: "Aset berhasil dihapus",
      });
      
      fetchAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus aset",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      symbol: '',
      name: '',
      asset_type: '',
      api_endpoint: '',
    });
  };

  const openAddDialog = () => {
    resetForm();
    setEditingAsset(null);
    setDialogOpen(true);
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || asset.asset_type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Kelola Aset yang Didukung</h1>
          <p className="text-muted-foreground">Tambah dan kelola aset untuk tracking otomatis</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Kelola Aset yang Didukung</h1>
        <p className="text-muted-foreground">
          Tambah dan kelola daftar aset (crypto, saham, mata uang) yang mendukung update nilai tukar otomatis
        </p>
      </div>

      {/* Summary Card */}
      <Card className="financial-card mb-6">
        <CardHeader className="financial-card-header">
          <CardTitle className="flex items-center">
            <Settings className="w-6 h-6 mr-2 text-primary" />
            Total Aset yang Didukung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="financial-amount text-primary">
            {filteredAssets.length}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {assetTypes.map(type => 
              `${assets.filter(a => a.asset_type === type.value).length} ${type.label}`
            ).join(' • ')}
          </p>
        </CardContent>
      </Card>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cari symbol atau nama aset..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Semua Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              {assetTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openAddDialog} className="btn-hover-scale">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Aset
        </Button>
      </div>

      {/* Table */}
      <Card className="financial-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>API Endpoint</TableHead>
                  <TableHead>Tanggal Ditambahkan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm || typeFilter !== 'all' 
                        ? 'Tidak ada data yang sesuai dengan filter' 
                        : 'Belum ada aset yang didukung. Tambah aset pertama!'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((asset) => (
                    <TableRow key={asset.id} className="table-row-hover">
                      <TableCell className="font-mono font-medium">{asset.symbol}</TableCell>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>
                        <span className="capitalize">
                          {assetTypes.find(t => t.value === asset.asset_type)?.label || asset.asset_type}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {asset.api_endpoint || 'Default'}
                      </TableCell>
                      <TableCell>
                        {new Date(asset.created_at).toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(asset)}
                            className="btn-hover-scale"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(asset.id)}
                            className="btn-hover-scale text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? 'Edit Aset' : 'Tambah Aset Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingAsset 
                ? 'Perbarui informasi aset yang didukung'
                : 'Tambah aset baru untuk mendukung tracking otomatis'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="symbol">Symbol *</Label>
                <Input
                  id="symbol"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  placeholder="BTC, AAPL, USD, dll"
                  required
                />
              </div>
              <div>
                <Label htmlFor="asset_type">Tipe Aset *</Label>
                <Select value={formData.asset_type} onValueChange={(value) => setFormData({ ...formData, asset_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="name">Nama Lengkap *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Bitcoin, Apple Inc., US Dollar, dll"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="api_endpoint">API Endpoint (opsional)</Label>
              <Input
                id="api_endpoint"
                value={formData.api_endpoint}
                onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                placeholder="Custom API endpoint (kosongkan untuk default)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Kosongkan untuk menggunakan API default sesuai tipe aset
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">
                {editingAsset ? 'Perbarui' : 'Tambah'} Aset
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageAssets;