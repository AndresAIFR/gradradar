// Utility functions for phone number formatting

export function formatPhoneNumber(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Handle US phone numbers (10 digits)
  if (digits.length === 10) {
    return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
  }
  
  // Handle US phone numbers with country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith('1')) {
    const usDigits = digits.substring(1);
    return `(${usDigits.substring(0, 3)}) ${usDigits.substring(3, 6)}-${usDigits.substring(6, 10)}`;
  }
  
  // Return original format for international or invalid numbers
  return phoneNumber;
}

export function isPhoneNumberField(fieldLabel?: string): boolean {
  if (!fieldLabel) return false;
  const phoneKeywords = ['phone', 'mobile', 'cell', 'number', 'contact'];
  return phoneKeywords.some(keyword => 
    fieldLabel.toLowerCase().includes(keyword.toLowerCase())
  );
}