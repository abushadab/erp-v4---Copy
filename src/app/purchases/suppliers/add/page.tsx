"use client"

import * as React from "react"
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Mail, Phone, MapPin, Building } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SupplierForm {
  name: string
  email: string
  phone: string
  address: string
}

export default function AddSupplierPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<string[]>([])
  const [form, setForm] = React.useState<SupplierForm>({
    name: '',
    email: '',
    phone: '',
    address: ''
  })

  const validateForm = () => {
    const newErrors: string[] = []

    if (!form.name.trim()) newErrors.push('Supplier name is required')
    if (!form.email.trim()) newErrors.push('Email address is required')
    else if (!isValidEmail(form.email)) newErrors.push('Please enter a valid email address')
    if (!form.phone.trim()) newErrors.push('Phone number is required')
    if (!form.address.trim()) newErrors.push('Address is required')

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // In a real app, you would send this data to your API
      console.log('Supplier Created:', form)
      
      // Redirect to purchases list or suppliers list
      router.push('/purchases')
      
    } catch (error) {
      setErrors(['Failed to create supplier. Please try again.'])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof SupplierForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([])
    }
  }

  return (
    <motion.div
      className="container mx-auto px-6 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Header */}
      <motion.div 
        className="flex items-center gap-4 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Link href="/purchases">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Purchases
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Supplier</h1>
          <p className="text-muted-foreground mt-2">
            Register a new supplier for purchase orders
          </p>
        </div>
      </motion.div>

      <motion.div 
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <form onSubmit={handleSubmit}>
          {/* Supplier Information */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Supplier Information
                </CardTitle>
                <CardDescription>
                  Enter the basic details for the new supplier
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Supplier Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Supplier Name *</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      value={form.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter supplier company name"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Contact Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="supplier@example.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Phone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+88017XXXXXXXX"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="address"
                      value={form.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Enter complete business address including city, postal code"
                      className="pl-10 min-h-[100px]"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Form Actions */}
          <motion.div 
            className="mt-8 flex flex-col sm:flex-row gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={isLoading}
            >
              {isLoading ? (
                <motion.div
                  className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Creating Supplier...' : 'Create Supplier'}
            </Button>
            
            <Link href="/purchases" className="flex-1">
              <Button variant="outline" className="w-full" disabled={isLoading}>
                Cancel
              </Button>
            </Link>
          </motion.div>

          {/* Error Messages */}
          {errors.length > 0 && (
            <motion.div 
              className="mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert variant="destructive">
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </form>

        {/* Info Card */}
        <motion.div 
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserPlus className="h-4 w-4 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-blue-900">Supplier Registration</h4>
                  <p className="text-sm text-blue-700">
                    Once created, this supplier will be available for purchase orders. 
                    You can always edit supplier details later or deactivate inactive suppliers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  )
} 