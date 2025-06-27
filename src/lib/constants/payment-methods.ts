import { Building, Smartphone, Banknote, CreditCard } from "lucide-react"

export interface PaymentMethodTypeOption {
  value: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

// Payment method type options (perfect for Bangladesh)
export const PAYMENT_METHOD_TYPE_OPTIONS: PaymentMethodTypeOption[] = [
  { value: 'bank', label: 'Bank Account', description: 'Traditional bank accounts', icon: Building },
  { value: 'mfs', label: 'Mobile Financial Service', description: 'Bkash, Nagad, Rocket, etc.', icon: Smartphone },
  { value: 'cash', label: 'Cash/Liquid', description: 'Physical cash or petty cash', icon: Banknote },
  { value: 'card', label: 'Card Account', description: 'Credit/Debit card accounts', icon: CreditCard }
] 