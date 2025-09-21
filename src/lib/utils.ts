import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIndonesianDate(dateString: string | Date | null): string {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}

export function formatIndonesianDateTime(dateString: string | Date | null): string {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  const formattedDate = formatIndonesianDate(date);
  const time = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  
  return `${formattedDate} ${time}`;
}

export function formatCurrency(amount: number): string {
  if (amount >= 1000000000) {
    return `Rp ${(amount / 1000000000).toFixed(1)}M`;
  } else if (amount >= 1000000) {
    return `Rp ${(amount / 1000000).toFixed(1)}Jt`;
  } else {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }
}
