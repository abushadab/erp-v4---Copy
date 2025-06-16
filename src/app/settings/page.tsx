"use client"

import * as React from "react"
import { toast } from "sonner"
import { 
  resetWarehouseStock, 
  resetTransactionData, 
  resetProductsCatalog, 
  resetPackagingData,
  resetAccountsData,
  factoryReset,
  exportDataBackup 
} from "@/lib/supabase/reset"
import { initializeChartOfAccounts, checkChartOfAccountsExists } from "@/lib/supabase/setup-accounts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Settings,
  User,
  Shield,
  Bell,
  Globe,
  Building,
  Palette,
  Database,
  Key,
  Mail,
  Smartphone,
  Save,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Trash2,
  RotateCcw,
  HardDrive,
  Archive,
  Download,
  Loader2
} from "lucide-react"
import { fixAllPurchaseStatuses } from '@/lib/supabase/purchases'
import { UserProfileSettings } from '@/components/settings/user-profile-settings'

export default function SettingsPage() {
  const [notifications, setNotifications] = React.useState({
    email: true,
    push: false,
    desktop: true,
    sms: false
  })

  const [security, setSecurity] = React.useState({
    twoFactor: false,
    sessionTimeout: "30",
    passwordExpiry: "90",
    loginAttempts: "5"
  })

  const [general, setGeneral] = React.useState({
    companyName: "ERP Company Ltd",
    timezone: "Asia/Dhaka",
    dateFormat: "DD/MM/YYYY",
    currency: "BDT",
    language: "en"
  })

  const [appearance, setAppearance] = React.useState({
    theme: "light",
    density: "comfortable",
    sidebar: "expanded"
  })

  const [resetDialogs, setResetDialogs] = React.useState({
    settings: false,
    database: false,
    warehouse: false,
    products: false,
    packaging: false,
    accounts: false,
    fullReset: false
  })

  const [isResetting, setIsResetting] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [accountsExist, setAccountsExist] = React.useState(false)
  const [isInitializingAccounts, setIsInitializingAccounts] = React.useState(false)
  const [fixingStatuses, setFixingStatuses] = React.useState(false)

  // Check if chart of accounts exists on component mount
  React.useEffect(() => {
    const checkAccounts = async () => {
      try {
        const exists = await checkChartOfAccountsExists()
        setAccountsExist(exists)
      } catch (error) {
        console.error('Error checking accounts:', error)
      }
    }
    checkAccounts()
  }, [])

  const handleSave = () => {
    // Placeholder for save functionality
    console.log("Settings saved")
  }

  const handleInitializeAccounts = async () => {
    setIsInitializingAccounts(true)
    try {
      await initializeChartOfAccounts()
      setAccountsExist(true)
      toast.success("Chart of accounts initialized successfully!")
    } catch (error) {
      console.error("Failed to initialize accounts:", error)
      toast.error(`Failed to initialize accounts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsInitializingAccounts(false)
    }
  }

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const backupData = await exportDataBackup()
      
      // Create and download the backup file
      const blob = new Blob([backupData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `erp-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success("Data exported successfully")
    } catch (error) {
      console.error("Export failed:", error)
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
    }
  }

  const openResetDialog = (type: keyof typeof resetDialogs) => {
    setResetDialogs({ ...resetDialogs, [type]: true })
  }

  const closeResetDialog = (type: keyof typeof resetDialogs) => {
    setResetDialogs({ ...resetDialogs, [type]: false })
  }

  const performReset = async (type: string) => {
    setIsResetting(true)
    try {
      switch (type) {
        case 'settings':
          // Reset all settings to defaults
          setGeneral({
            companyName: "ERP Company Ltd",
            timezone: "Asia/Dhaka",
            dateFormat: "DD/MM/YYYY",
            currency: "BDT",
            language: "en"
          })
          setNotifications({
            email: true,
            push: false,
            desktop: true,
            sms: false
          })
          setSecurity({
            twoFactor: false,
            sessionTimeout: "30",
            passwordExpiry: "90",
            loginAttempts: "5"
          })
          setAppearance({
            theme: "light",
            density: "comfortable",
            sidebar: "expanded"
          })
          toast.success("Settings reset to defaults successfully")
          break
        
        case 'database':
          // Clear all transactional data (sales, purchases, movements)
          await resetTransactionData()
          toast.success("Transaction data cleared successfully")
          break
          
        case 'warehouse':
          // Reset warehouse stock to zero
          await resetWarehouseStock()
          toast.success("Warehouse stock reset to zero successfully")
          break
          
        case 'products':
          // Remove all products and related data
          await resetProductsCatalog()
          toast.success("Products and catalog data removed successfully")
          break
          
        case 'packaging':
          // Remove all packaging and related data
          await resetPackagingData()
          toast.success("Packaging data removed successfully")
          break
          
        case 'accounts':
          // Remove journal entries (preserves accounts and categories)
          await resetAccountsData()
          toast.success("Journal entries cleared successfully (accounts preserved)")
          // Refresh accounts existence check since we didn't delete accounts
          const exists = await checkChartOfAccountsExists()
          setAccountsExist(exists)
          break
          
        case 'fullReset':
          // Complete system reset
          await factoryReset()
          toast.success("System reset to factory defaults successfully")
          // Reload page after factory reset
          setTimeout(() => {
            window.location.reload()
          }, 2000)
          break
      }
      
      // Close dialog after reset
      closeResetDialog(type as keyof typeof resetDialogs)
    } catch (error) {
      console.error("Reset failed:", error)
      toast.error(`Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsResetting(false)
    }
  }

  const handleFixPurchaseStatuses = async () => {
    try {
      setFixingStatuses(true)
      await fixAllPurchaseStatuses()
      toast.success('Purchase statuses fixed successfully!')
    } catch (error) {
      console.error('Error fixing purchase statuses:', error)
      toast.error('Failed to fix purchase statuses')
    } finally {
      setFixingStatuses(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your system preferences and configuration
          </p>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Company Information
                </CardTitle>
                <CardDescription>
                  Configure your company details and regional settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName" 
                    value={general.companyName}
                    onChange={(e) => setGeneral({...general, companyName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={general.timezone} onValueChange={(value: string) => setGeneral({...general, timezone: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC-8">Pacific Time (UTC-8)</SelectItem>
                      <SelectItem value="UTC-7">Mountain Time (UTC-7)</SelectItem>
                      <SelectItem value="UTC-6">Central Time (UTC-6)</SelectItem>
                      <SelectItem value="UTC-5">Eastern Time (UTC-5)</SelectItem>
                      <SelectItem value="UTC+0">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select value={general.dateFormat} onValueChange={(value) => setGeneral({...general, dateFormat: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="mr-2 h-5 w-5" />
                  Localization
                </CardTitle>
                <CardDescription>
                  Set your currency and language preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select value={general.currency} onValueChange={(value) => setGeneral({...general, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BDT">BDT - Bangladeshi Taka</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={general.language} onValueChange={(value) => setGeneral({...general, language: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <UserProfileSettings />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="mr-2 h-5 w-5" />
                  Password & Security
                </CardTitle>
                <CardDescription>
                  Change your password and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
                <Button className="w-full">Update Password</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch 
                  id="email-notifications"
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications({...notifications, email: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center">
                    <Smartphone className="mr-2 h-4 w-4" />
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications on your device
                  </p>
                </div>
                <Switch 
                  id="push-notifications"
                  checked={notifications.push}
                  onCheckedChange={(checked) => setNotifications({...notifications, push: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center">
                    <Bell className="mr-2 h-4 w-4" />
                    <Label htmlFor="desktop-notifications">Desktop Notifications</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Show notifications on your desktop
                  </p>
                </div>
                <Switch 
                  id="desktop-notifications"
                  checked={notifications.desktop}
                  onCheckedChange={(checked) => setNotifications({...notifications, desktop: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center">
                    <Smartphone className="mr-2 h-4 w-4" />
                    <Label htmlFor="sms-notifications">SMS Notifications</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive critical alerts via SMS
                  </p>
                </div>
                <Switch 
                  id="sms-notifications"
                  checked={notifications.sms}
                  onCheckedChange={(checked) => setNotifications({...notifications, sms: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Authentication Settings
                </CardTitle>
                <CardDescription>
                  Configure security and authentication options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch 
                    id="two-factor"
                    checked={security.twoFactor}
                    onCheckedChange={(checked) => setSecurity({...security, twoFactor: checked})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input 
                    id="sessionTimeout" 
                    type="number"
                    value={security.sessionTimeout}
                    onChange={(e) => setSecurity({...security, sessionTimeout: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                  <Input 
                    id="passwordExpiry" 
                    type="number"
                    value={security.passwordExpiry}
                    onChange={(e) => setSecurity({...security, passwordExpiry: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loginAttempts">Max Login Attempts</Label>
                  <Input 
                    id="loginAttempts" 
                    type="number"
                    value={security.loginAttempts}
                    onChange={(e) => setSecurity({...security, loginAttempts: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="mr-2 h-5 w-5" />
                  Active Sessions
                </CardTitle>
                <CardDescription>
                  Manage your active login sessions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Current Session</p>
                      <p className="text-xs text-muted-foreground">Chrome on Windows • Current</p>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Mobile Session</p>
                      <p className="text-xs text-muted-foreground">Safari on iPhone • 2 hours ago</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <Button variant="destructive" className="w-full">
                  Sign Out All Devices
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="mr-2 h-5 w-5" />
                Interface Preferences
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={appearance.theme} onValueChange={(value) => setAppearance({...appearance, theme: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="density">Interface Density</Label>
                <Select value={appearance.density} onValueChange={(value) => setAppearance({...appearance, density: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sidebar">Sidebar Default</Label>
                <Select value={appearance.sidebar} onValueChange={(value) => setAppearance({...appearance, sidebar: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expanded">Expanded</SelectItem>
                    <SelectItem value="collapsed">Collapsed</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  System Information
                </CardTitle>
                <CardDescription>
                  View system status and information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Version:</span>
                  <span className="font-medium">v2.1.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Database:</span>
                  <div className="flex items-center">
                    <Check className="mr-1 h-3 w-3 text-green-600" />
                    <span className="font-medium">Connected</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Last Backup:</span>
                  <span className="font-medium">2 hours ago</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Storage Used:</span>
                  <span className="font-medium">2.3 GB / 10 GB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Multi-Warehouse:</span>
                  <div className="flex items-center">
                    <Check className="mr-1 h-3 w-3 text-green-600" />
                    <span className="font-medium">Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <RefreshCw className="mr-2 h-5 w-5" />
                  System Actions
                </CardTitle>
                <CardDescription>
                  Perform system maintenance and updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check for Updates
                </Button>
                <Button variant="outline" className="w-full">
                  <Database className="mr-2 h-4 w-4" />
                  Backup Database
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleExportData}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export Data
                    </>
                  )}
                </Button>
                <Button variant="outline" className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Clear Cache
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Reset Options
                </CardTitle>
                <CardDescription>
                  Reset specific parts of the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => openResetDialog('settings')}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Reset Settings Only
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => openResetDialog('warehouse')}
                >
                  <HardDrive className="mr-2 h-4 w-4" />
                  Reset Warehouse Stock
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => openResetDialog('database')}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Reset Transaction Data
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => openResetDialog('products')}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Reset Products & Catalog
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => openResetDialog('packaging')}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Reset Packaging Data
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => openResetDialog('accounts')}
                >
                  <Database className="mr-2 h-4 w-4" />
                  Reset Journal Entries
                </Button>
                
                {/* Account Setup Section */}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Chart of Accounts</span>
                    {accountsExist ? (
                      <Badge variant="secondary" className="text-green-600">
                        <Check className="mr-1 h-3 w-3" />
                        Ready
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <X className="mr-1 h-3 w-3" />
                        Missing
                      </Badge>
                    )}
                  </div>
                  <Button 
                    variant={accountsExist ? "outline" : "default"}
                    className="w-full justify-start"
                    onClick={handleInitializeAccounts}
                    disabled={isInitializingAccounts}
                  >
                    {isInitializingAccounts ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      <>
                        <Settings className="mr-2 h-4 w-4" />
                        {accountsExist ? "Reinitialize" : "Setup"} Chart of Accounts
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible actions that affect all data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <p className="text-sm text-red-800 mb-3">
                    <strong>Warning:</strong> This will completely reset your system to factory defaults. 
                    All data including products, sales, purchases, and settings will be permanently lost.
                  </p>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => openResetDialog('fullReset')}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Factory Reset System
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Purchase Status Maintenance
              </CardTitle>
              <CardDescription>
                Fix purchase statuses that may be incorrect due to system updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium">Fix Purchase Statuses</h4>
                  <p className="text-sm text-muted-foreground">
                    Recalculate and correct all purchase statuses based on current inventory and return data
                  </p>
                </div>
                <Button
                  onClick={handleFixPurchaseStatuses}
                  disabled={fixingStatuses}
                  variant="outline"
                >
                  {fixingStatuses ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fixing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Fix Statuses
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reset Confirmation Dialogs */}
      {Object.entries(resetDialogs).map(([type, isOpen]) => (
        <div
          key={type}
          className={`fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}
        >
          <div className="fixed inset-0 bg-black/50" onClick={() => closeResetDialog(type as keyof typeof resetDialogs)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
            <Card className="mx-4">
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Confirm Reset
                </CardTitle>
                <CardDescription>
                  {type === 'settings' && "Reset all settings to their default values?"}
                  {type === 'warehouse' && "Reset all warehouse stock quantities to zero?"}
                  {type === 'database' && "Remove all transaction data (sales, purchases, returns)?"}
                  {type === 'products' && "Remove all products, variations, and catalog data?"}
                  {type === 'packaging' && "Remove all packaging, variations, and related data?"}
                  {type === 'accounts' && "Remove all journal entries (preserves accounts and categories)?"}
                  {type === 'fullReset' && "PERMANENTLY DELETE ALL DATA and reset system to factory defaults?"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {type === 'fullReset' && (
                    <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800 font-medium">
                        ⚠️ This action cannot be undone!
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        All your data will be permanently lost.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => closeResetDialog(type as keyof typeof resetDialogs)}
                      disabled={isResetting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => performReset(type)}
                      disabled={isResetting}
                    >
                      {isResetting ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {type === 'fullReset' ? 'DELETE ALL' : 'Reset'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ))}
    </div>
  )
} 