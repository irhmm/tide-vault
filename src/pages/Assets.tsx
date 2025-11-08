import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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

      {/* Summary Card - Simplified */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Nilai Aset</p>
              <h2 className="text-3xl font-bold">{formatCurrency(totalValue)}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredAssets.length} aset
              </p>
            </div>
            <Wallet className="w-12 h-12 text-primary opacity-20" />
          </div>
        </CardContent>
      </Card>

      {/* Actions and Filters - Reorganized */}
      <div className="space-y-3 mb-6">
        {/* Primary Action */}
        <div>
          <Button onClick={openAddDialog} className="btn-hover-scale w-full sm:w-auto" size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Aset
          </Button>
        </div>
        
        {/* Secondary Actions and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cari nama aset..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
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
            <ExportButton 
              data={exportData} 
              filename="data_aset"
              disabled={filteredAssets.length === 0}
            />
            {assets.some(a => a.asset_type !== 'physical') && (
              <Button 
                onClick={updateExchangeRates}
                variant="outline"
                size="sm"
                disabled={updatingRates}
                className="btn-hover-scale"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${updatingRates ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Update Nilai Tukar</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table - Simplified to 5 columns, Desktop View */}
      <Card className="financial-card hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Aset</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Tanggal Beli</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchTerm || categoryFilter !== 'all' 
                        ? 'Tidak ada data yang sesuai dengan filter' 
                        : 'Belum ada data aset. Tambah data pertama Anda!'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((asset) => (
                    <TableRow key={asset.id} className="table-row-hover">
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{asset.name}</span>
                          <Badge variant="outline" className="w-fit text-xs">
                            {asset.asset_type === 'physical' ? 'Fisik' : 
                             asset.asset_type === 'crypto' ? 'Crypto' :
                             asset.asset_type === 'precious_metal' ? 'Logam Mulia' :
                             asset.asset_type === 'stock' ? 'Saham' :
                             asset.asset_type === 'currency' ? 'Mata Uang' : 'Fisik'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{asset.category}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(asset.value)}</TableCell>
                      <TableCell>{formatIndonesianDate(asset.purchase_date)}</TableCell>
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

      {/* Card Layout - Mobile View */}
      <div className="md:hidden space-y-3">
        {filteredAssets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {searchTerm || categoryFilter !== 'all' 
                ? 'Tidak ada data yang sesuai dengan filter' 
                : 'Belum ada data aset. Tambah data pertama Anda!'
              }
            </CardContent>
          </Card>
        ) : (
          filteredAssets.map((asset) => (
            <Card key={asset.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{asset.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {asset.asset_type === 'physical' ? 'Fisik' : 
                         asset.asset_type === 'crypto' ? 'Crypto' :
                         asset.asset_type === 'precious_metal' ? 'Logam Mulia' :
                         asset.asset_type === 'stock' ? 'Saham' :
                         asset.asset_type === 'currency' ? 'Mata Uang' : 'Fisik'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{asset.category}</p>
                    <p className="text-lg font-bold mt-2">{formatCurrency(asset.value)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatIndonesianDate(asset.purchase_date)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(asset)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => handleDelete(asset.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog - Simplified with Accordion */}
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
            <Accordion type="single" collapsible defaultValue="basic" className="w-full">
              <AccordionItem value="basic">
                <AccordionTrigger className="text-sm font-semibold">Informasi Dasar</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Aset*</Label>
                    <Input
                      id="name"
                      placeholder="Contoh: Rumah, Mobil, 1 BTC"
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
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="value">
                <AccordionTrigger className="text-sm font-semibold">Nilai Aset</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
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
                                <SelectItem value="gram">Gram</SelectItem>
                                <SelectItem value="oz">Ounce</SelectItem>
                                <SelectItem value="kg">Kilogram</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id="original_unit"
                              placeholder="Unit"
                              value={formData.original_unit}
                              onChange={(e) => setFormData({...formData, original_unit: e.target.value})}
                            />
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
                        💡 Nilai IDR dihitung otomatis dari nilai tukar terkini
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
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="details">
                <AccordionTrigger className="text-sm font-semibold">Detail Tambahan (Opsional)</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
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
                      placeholder="Contoh: Rumah, Bank, Wallet"
                      value={formData.storage_location}
                      onChange={(e) => setFormData({...formData, storage_location: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Keterangan</Label>
                    <Textarea
                      id="description"
                      placeholder="Catatan tambahan..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

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