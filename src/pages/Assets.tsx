import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, Plus, Pencil, Trash2, Search, Filter, RefreshCw } from 'lucide-react';
import { formatIndonesianDate, formatIndonesianDateTime, formatCurrency } from '@/lib/utils';
import ExportButton from '@/components/ExportButton';

interface Asset {
  id: string;
  name: string;
  category: string;
  value: number;
  purchase_date: string | null;
  description: string | null;
  storage_location?: string | null;
  created_at: string;
  original_value?: number;
  original_unit?: string;
  asset_type?: string;
  symbol?: string;
  exchange_rate?: number;
  rate_last_updated?: string;
}

interface SupportedAsset {
  id: string;
  symbol: string;
  name: string;
  asset_type: string;
  api_endpoint: string;
}

const Assets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [supportedAssets, setSupportedAssets] = useState<SupportedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [updatingRates, setUpdatingRates] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    value: '',
    purchase_date: '',
    description: '',
    storage_location: '',
    asset_type: 'physical',
    original_value: '',
    original_unit: '',
    symbol: '',
  });

  const categories = [
    'Properti',
    'Kendaraan',
    'Elektronik',
    'Investasi',
    'Emas',
    'Peralatan',
    'Lainnya'
  ];

  const assetTypes = [
    { value: 'physical', label: 'Aset Fisik' },
    { value: 'crypto', label: 'Cryptocurrency' },
    { value: 'precious_metal', label: 'Logam Mulia' },
    { value: 'stock', label: 'Saham' },
    { value: 'currency', label: 'Mata Uang Asing' },
  ];

  useEffect(() => {
    if (user) {
      fetchAssets();
      fetchSupportedAssets();
    }
  }, [user]);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets((data as Asset[]) || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data aset",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportedAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('supported_assets')
        .select('*')
        .order('name');

      if (error) throw error;
      setSupportedAssets(data || []);
    } catch (error) {
      console.error('Error fetching supported assets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.category) {
      toast({
        title: "Error",
        description: "Nama dan kategori aset wajib diisi",
        variant: "destructive"
      });
      return;
    }

    // Validation for investment assets
    if (formData.asset_type !== 'physical') {
      if (!formData.original_value || !formData.symbol) {
        toast({
          title: "Error",
          description: "Nilai original dan simbol wajib diisi untuk aset investasi",
          variant: "destructive"
        });
        return;
      }
    } else if (!formData.value) {
      toast({
        title: "Error",
        description: "Nilai aset wajib diisi untuk aset fisik",
        variant: "destructive"
      });
      return;
    }

    try {
      const assetData = {
        name: formData.name,
        category: formData.category,
        value: formData.asset_type === 'physical' 
          ? parseFloat(formData.value) 
          : (formData.original_value ? parseFloat(formData.original_value) : 0),
        purchase_date: formData.purchase_date || null,
        description: formData.description || null,
        storage_location: formData.storage_location || null,
        user_id: user?.id,
        asset_type: formData.asset_type,
        original_value: formData.asset_type !== 'physical' ? parseFloat(formData.original_value) : null,
        original_unit: formData.asset_type !== 'physical' ? formData.original_unit : null,
        symbol: formData.asset_type !== 'physical' ? formData.symbol : null,
        exchange_rate: formData.asset_type !== 'physical' ? 1 : null,
      };

      if (editingAsset) {
        const { error } = await supabase
          .from('assets')
          .update(assetData)
          .eq('id', editingAsset.id);

        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Data aset berhasil diperbarui",
        });
      } else {
        const { error } = await supabase
          .from('assets')
          .insert([assetData]);

        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Data aset berhasil ditambahkan",
        });
      }

      setDialogOpen(false);
      setEditingAsset(null);
      resetForm();
      fetchAssets();
    } catch (error) {
      console.error('Error saving asset:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data aset",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      category: asset.category,
      value: asset.asset_type === 'physical' ? asset.value.toString() : '',
      purchase_date: asset.purchase_date || '',
      description: asset.description || '',
      storage_location: asset.storage_location || '',
      asset_type: asset.asset_type || 'physical',
      original_value: asset.original_value?.toString() || '',
      original_unit: asset.original_unit || '',
      symbol: asset.symbol || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data aset ini?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Berhasil",
        description: "Data aset berhasil dihapus",
      });
      
      fetchAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus data aset",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      value: '',
      purchase_date: '',
      description: '',
      storage_location: '',
      asset_type: 'physical',
      original_value: '',
      original_unit: '',
      symbol: '',
    });
  };

  const openAddDialog = () => {
    resetForm();
    setEditingAsset(null);
    setDialogOpen(true);
  };

  const updateExchangeRates = async () => {
    setUpdatingRates(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-exchange-rates');
      
      if (error) throw error;
      
      toast({
        title: "Berhasil",
        description: "Nilai tukar berhasil diperbarui",
      });
      
      // Refresh assets to show updated values
      fetchAssets();
    } catch (error) {
      console.error('Error updating exchange rates:', error);
      toast({
        title: "Error",
        description: "Gagal memperbarui nilai tukar",
        variant: "destructive"
      });
    } finally {
      setUpdatingRates(false);
    }
  };


  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalValue = filteredAssets.reduce((sum, asset) => sum + asset.value, 0);

  const exportData = filteredAssets.map(asset => ({
    'Nama Aset': asset.name,
    'Kategori': asset.category,
    'Tipe': asset.asset_type || 'physical',
    'Nilai Original': asset.original_value || '-',
    'Unit': asset.original_unit || '-',
    'Simbol': asset.symbol || '-',
    'Nilai IDR': asset.value,
    'Tanggal Beli': formatIndonesianDate(asset.purchase_date),
    'Tempat Simpan': asset.storage_location || '-',
    'Keterangan': asset.description || '-',
    'Tanggal Dibuat': formatIndonesianDate(asset.created_at),
  }));

  const getFilteredSupportedAssets = () => {
    return supportedAssets.filter(asset => asset.asset_type === formData.asset_type);
  };

  if (loading) {
    return (
      <div className="fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Aset</h1>
          <p className="text-muted-foreground">Kelola data aset Anda</p>
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
        <h1 className="text-3xl font-bold mb-2">Aset</h1>
        <p className="text-muted-foreground">Kelola dan pantau aset pribadi serta investasi Anda</p>
      </div>

      {/* Summary Card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-accent/5 border-2 border-primary/10 rounded-2xl shadow-glow hover:shadow-strong transition-all duration-300 mb-6 group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <CardHeader className="relative z-10 pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-primary/10 mr-4 group-hover:bg-primary/15 transition-colors duration-300">
                <Wallet className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Total Nilai Aset</h3>
                <p className="text-sm text-muted-foreground">Portfolio keseluruhan</p>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 pt-0">
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <p className="text-4xl font-black bg-gradient-to-r from-primary via-primary-hover to-primary bg-clip-text text-transparent">
                {formatCurrency(totalValue)}
              </p>
              <div className="flex items-center space-x-2 text-success">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Live</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary/20 rounded-full"></div>
                <span className="text-sm font-medium text-muted-foreground">
                  {filteredAssets.length} aset terdaftar
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Terakhir diperbarui</p>
                <p className="text-xs font-medium text-foreground">
                  {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cari nama aset atau keterangan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={exportData} 
            filename="data_aset"
            disabled={filteredAssets.length === 0}
          />
          <Button 
            onClick={updateExchangeRates}
            variant="outline"
            size="sm"
            disabled={updatingRates}
            className="btn-hover-scale"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${updatingRates ? 'animate-spin' : ''}`} />
            Update Nilai Tukar
          </Button>
          <Button onClick={openAddDialog} className="btn-hover-scale">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Aset
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="financial-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Aset</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Nilai Original</TableHead>
                  <TableHead>Nilai IDR</TableHead>
                  <TableHead>Tanggal Beli</TableHead>
                  <TableHead>Tempat Simpan</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {searchTerm || categoryFilter !== 'all' 
                        ? 'Tidak ada data yang sesuai dengan filter' 
                        : 'Belum ada data aset. Tambah data pertama Anda!'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((asset) => (
                    <TableRow key={asset.id} className="table-row-hover">
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>{asset.category}</TableCell>
                      <TableCell>
                        <span className="capitalize">
                          {asset.asset_type === 'physical' ? 'Fisik' : 
                           asset.asset_type === 'crypto' ? 'Crypto' :
                           asset.asset_type === 'precious_metal' ? 'Logam Mulia' :
                           asset.asset_type === 'stock' ? 'Saham' :
                           asset.asset_type === 'currency' ? 'Mata Uang' : 'Fisik'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {asset.original_value && asset.symbol ? (
                          <div className="space-y-1">
                            <div className="font-medium">
                              {asset.original_value} {asset.original_unit || asset.symbol}
                            </div>
                            {asset.exchange_rate && (
                              <div className="text-xs text-muted-foreground">
                                Rate: {formatCurrency(asset.exchange_rate)}
                              </div>
                            )}
                            {asset.rate_last_updated && (
                              <div className="text-xs text-muted-foreground">
                                Update: {formatIndonesianDateTime(asset.rate_last_updated)}
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{formatCurrency(asset.value)}</div>
                          {asset.asset_type !== 'physical' && asset.original_value && asset.exchange_rate && (
                            <div className="text-xs text-muted-foreground">Auto-calculated</div>
                          )}
                          {asset.symbol === 'XAU' && (asset.original_unit === 'gram' || asset.original_unit === 'kg') && (
                            <div className="text-[10px] inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary">
                              Harga Antam
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                          {formatIndonesianDate(asset.purchase_date)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {asset.storage_location || '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {asset.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(asset)}
                            className="btn-hover-scale"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? 'Edit Aset' : 'Tambah Aset Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingAsset 
                ? 'Perbarui informasi aset Anda'
                : 'Masukkan detail aset yang akan dicatat'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Aset*</Label>
              <Input
                id="name"
                placeholder="Contoh: Rumah, Mobil, 1 BTC, 10 gram emas"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategori*</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset_type">Tipe Aset*</Label>
              <Select value={formData.asset_type} onValueChange={(value) => setFormData({...formData, asset_type: value, symbol: '', original_value: '', original_unit: ''})}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe aset" />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.asset_type !== 'physical' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="symbol">Simbol/Aset*</Label>
                  <Select value={formData.symbol} onValueChange={(value) => {
                    const selected = supportedAssets.find(asset => asset.symbol === value);
                    setFormData({
                      ...formData, 
                      symbol: value,
                      original_unit: selected?.asset_type === 'crypto' ? value : 
                                   selected?.asset_type === 'precious_metal' ? 'gram' :
                                   selected?.asset_type === 'stock' ? 'lembar' :
                                   selected?.asset_type === 'currency' ? value : ''
                    });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih simbol aset" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFilteredSupportedAssets().map(asset => (
                        <SelectItem key={asset.symbol} value={asset.symbol}>
                          {asset.symbol} - {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="original_value">Jumlah*</Label>
                    <Input
                      id="original_value"
                      type="number"
                      min="0"
                      step="0.00000001"
                      placeholder="1.5"
                      value={formData.original_value}
                      onChange={(e) => setFormData({...formData, original_value: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="original_unit">Unit</Label>
                    {formData.asset_type === 'precious_metal' ? (
                      <Select value={formData.original_unit} onValueChange={(value) => setFormData({...formData, original_unit: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gram">Gram (Harga Antam)</SelectItem>
                          <SelectItem value="oz">Ounce (Global XAU)</SelectItem>
                          <SelectItem value="kg">Kilogram (Harga Antam)</SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.symbol === 'XAU' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Memilih Gram/Kilogram akan menggunakan harga Antam per gram secara otomatis.
                        </p>
                      )}
                    ) : (
                      <Input
                        id="original_unit"
                        placeholder="BTC, oz, lembar"
                        value={formData.original_unit}
                        onChange={(e) => setFormData({...formData, original_unit: e.target.value})}
                      />
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
                  💡 Nilai IDR akan dihitung otomatis berdasarkan nilai tukar terkini. 
                  Klik "Update Nilai Tukar" untuk mendapatkan harga terbaru.
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="value">Nilai Aset (IDR)*</Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="5000000"
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: e.target.value})}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="purchase_date">Tanggal Pembelian</Label>
              <Input
                id="purchase_date"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage_location">Tempat Menyimpan</Label>
              <Input
                id="storage_location"
                placeholder="Contoh: Rumah, Bank, Safe Deposit Box, Wallet"
                value={formData.storage_location}
                onChange={(e) => setFormData({...formData, storage_location: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Keterangan</Label>
              <Textarea
                id="description"
                placeholder="Tambahkan keterangan atau catatan..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" className="btn-hover-scale">
                {editingAsset ? 'Perbarui' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assets;