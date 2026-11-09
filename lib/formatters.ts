/**
 * UU No. 27/2022 (Pelindungan Data Pribadi / PDP) Compliance Utility
 * Masks phone numbers to protect personal identifying information.
 * Example: '081298448821' -> '+62 812-****-8821' or '0812-****-8821'
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '-';

  // Normalize digits
  const cleanPhone = phone.replace(/[^0-9+]/g, '');

  if (cleanPhone.startsWith('+62')) {
    const national = cleanPhone.slice(3);
    if (national.length >= 7) {
      const prefix = national.slice(0, 3);
      const suffix = national.slice(-4);
      return `+62 ${prefix}-****-${suffix}`;
    }
    return `+62 ****${national.slice(-4)}`;
  } else if (cleanPhone.startsWith('62')) {
    const national = cleanPhone.slice(2);
    if (national.length >= 7) {
      const prefix = national.slice(0, 3);
      const suffix = national.slice(-4);
      return `+62 ${prefix}-****-${suffix}`;
    }
    return `+62 ****${national.slice(-4)}`;
  } else if (cleanPhone.startsWith('0')) {
    const rest = cleanPhone.slice(1);
    if (rest.length >= 7) {
      const prefix = '0' + rest.slice(0, 3);
      const suffix = rest.slice(-4);
      return `${prefix}-****-${suffix}`;
    }
    return `${cleanPhone.slice(0, 4)}****${cleanPhone.slice(-3)}`;
  }

  // Fallback generic masking
  if (cleanPhone.length > 6) {
    const prefix = cleanPhone.slice(0, 4);
    const suffix = cleanPhone.slice(-3);
    return `${prefix}****${suffix}`;
  }

  return cleanPhone;
}

/**
 * Format currency to Indonesian Rupiah standard (IDR)
 * Example: 75000 -> "Rp 75.000"
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('IDR', 'Rp');
}

/**
 * Relative time formatter for Indonesian UI
 * Example: "12 menit lalu", "2 jam lalu", "Kemarin", "14 hari lalu"
 */
export function formatRelativeTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '-';

  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Baru saja';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} menit lalu`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} jam lalu`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return 'Kemarin';
  }
  if (diffInDays < 30) {
    return `${diffInDays} hari lalu`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} bulan lalu`;
  }

  return `${Math.floor(diffInDays / 365)} tahun lalu`;
}

/**
 * Format Indonesian localized date
 * Example: "18 Mei 2024"
 */
export function formatDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
