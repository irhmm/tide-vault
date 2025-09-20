import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportButtonProps {
  data: any[];
  filename: string;
  disabled?: boolean;
}

const ExportButton = ({ data, filename, disabled = false }: ExportButtonProps) => {
  const exportToExcel = () => {
    if (!data || data.length === 0) {
      return;
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const finalFilename = `${filename}_${currentDate}.xlsx`;

    // Save file
    XLSX.writeFile(wb, finalFilename);
  };

  return (
    <Button
      onClick={exportToExcel}
      variant="outline"
      size="sm"
      disabled={disabled || !data || data.length === 0}
      className="btn-hover-scale"
    >
      <Download className="w-4 h-4 mr-2" />
      Export Excel
    </Button>
  );
};

export default ExportButton;