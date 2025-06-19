'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { runProductionDiagnostics, quickHealthCheck } from '@/lib/supabase/debug-production'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getUserWithPermissions, clearUserPermissionsCache } from '@/lib/supabase/users'

interface DiagnosticResult {
  test: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  data?: any
}

export default function TestProductionPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [healthStatus, setHealthStatus] = useState<boolean | null>(null)
  const [simulateSlowNetwork, setSimulateSlowNetwork] = useState(false)
  const [testUserId, setTestUserId] = useState('')
  
  const { user, loading, error } = useCurrentUser()

  // Simulate production conditions
  const simulateProductionConditions = () => {
    console.log('🎭 Simulating production conditions...')
    
    // Clear all caches to simulate fresh deployment
    clearUserPermissionsCache()
    
    // Simulate network delays if enabled
    if (simulateSlowNetwork) {
      console.log('🐌 Simulating slow network conditions...')
      // You can add network throttling here if needed
    }
    
    // Force refresh user data
    window.location.reload()
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    try {
      console.log('🔍 Starting production diagnostics...')
      const results = await runProductionDiagnostics()
      setDiagnostics(results)
      
      // Also run health check
      const health = await quickHealthCheck()
      setHealthStatus(health)
      
      console.log('✅ Diagnostics completed')
    } catch (error) {
      console.error('❌ Diagnostics failed:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const testUserPermissions = async () => {
    if (!testUserId) {
      alert('Please enter a user ID to test')
      return
    }
    
    setIsRunning(true)
    try {
      console.log('🧪 Testing getUserWithPermissions for:', testUserId)
      const startTime = Date.now()
      const userData = await getUserWithPermissions(testUserId)
      const duration = Date.now() - startTime
      
      console.log('✅ User permissions test completed in', duration + 'ms')
      console.log('👤 User data:', userData)
      
      alert(`Test completed in ${duration}ms. Check console for details.`)
    } catch (error: any) {
      console.error('❌ User permissions test failed:', error)
      alert(`Test failed: ${error.message}`)
    } finally {
      setIsRunning(false)
    }
  }

  const clearAllCaches = () => {
    clearUserPermissionsCache()
    console.log('🗑️ All caches cleared')
    alert('All caches cleared. User data will be refetched on next request.')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'bg-green-500'
      case 'FAIL': return 'bg-red-500'
      case 'WARN': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  useEffect(() => {
    // Run initial health check
    quickHealthCheck().then(setHealthStatus)
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Production Testing & Diagnostics</h1>
          <p className="text-muted-foreground">
            Test production conditions and debug Supabase connectivity locally
          </p>
        </div>
        <Badge variant={healthStatus === null ? "secondary" : healthStatus ? "default" : "destructive"}>
          {healthStatus === null ? "Checking..." : healthStatus ? "Healthy" : "Unhealthy"}
        </Badge>
      </div>

      {/* Current User Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current User Status</CardTitle>
          <CardDescription>Monitor the useCurrentUser hook behavior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <strong>Loading:</strong> <Badge variant={loading ? "destructive" : "default"}>
                {loading ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <strong>User:</strong> {user ? `${user.name} (${user.email})` : "None"}
            </div>
            <div>
              <strong>Error:</strong> {error || "None"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Simulation Controls</CardTitle>
            <CardDescription>Simulate production deployment conditions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="slowNetwork"
                checked={simulateSlowNetwork}
                onChange={(e) => setSimulateSlowNetwork(e.target.checked)}
              />
              <label htmlFor="slowNetwork">Simulate slow network</label>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={simulateProductionConditions} variant="outline">
                🎭 Simulate Production
              </Button>
              <Button onClick={clearAllCaches} variant="outline">
                🗑️ Clear Caches
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Permissions Test</CardTitle>
            <CardDescription>Test getUserWithPermissions function directly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="text"
              placeholder="Enter User ID to test"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <Button 
              onClick={testUserPermissions} 
              disabled={isRunning || !testUserId}
              className="w-full"
            >
              🧪 Test User Permissions
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle>System Diagnostics</CardTitle>
          <CardDescription>Run comprehensive production diagnostics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={runDiagnostics} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? "🔍 Running Diagnostics..." : "🔍 Run Full Diagnostics"}
            </Button>

            {diagnostics.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Results:</h3>
                {diagnostics.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(result.status)}>
                        {result.status}
                      </Badge>
                      <div>
                        <div className="font-medium">{result.test}</div>
                        <div className="text-sm text-muted-foreground">{result.message}</div>
                      </div>
                    </div>
                    {result.data && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          console.log(`📊 ${result.test} Details:`, result.data)
                          alert(`Details logged to console for: ${result.test}`)
                        }}
                      >
                        📊 Details
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Browser Console Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Browser Console Commands</CardTitle>
          <CardDescription>Useful commands for manual testing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-4 rounded font-mono text-sm space-y-2">
            <div>// Run full diagnostics</div>
            <div>await window.debugSupabase.runDiagnostics()</div>
            <div></div>
            <div>// Quick health check</div>
            <div>await window.debugSupabase.healthCheck()</div>
            <div></div>
            <div>// Clear user cache</div>
            <div>window.clearUserPermissionsCache?.()</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 