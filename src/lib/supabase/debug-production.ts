// Production debugging utilities for Vercel deployment
import { createClient } from './client'
import { clearUserPermissionsCache } from './users'

interface DiagnosticResult {
  test: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  data?: any
}

export async function runProductionDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = []
  
  console.log('🔍 Running production diagnostics...')
  
  // Test 1: Environment variables
  results.push({
    test: 'Environment Variables',
    status: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PASS' : 'FAIL',
    message: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
      ? 'Supabase environment variables are set'
      : 'Missing Supabase environment variables',
    data: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...'
    }
  })
  
  // Test 2: Supabase client creation
  try {
    const supabase = createClient()
    results.push({
      test: 'Supabase Client Creation',
      status: 'PASS',
      message: 'Supabase client created successfully'
    })
    
    // Test 3: Basic connection test
    try {
      const startTime = Date.now()
      const { data, error } = await supabase.auth.getSession()
      const duration = Date.now() - startTime
      
      if (error) {
        results.push({
          test: 'Session Check',
          status: 'WARN',
          message: `Session check failed: ${error.message}`,
          data: { duration, error: error.message }
        })
      } else {
        results.push({
          test: 'Session Check',
          status: 'PASS',
          message: `Session check completed in ${duration}ms`,
          data: { 
            duration, 
            hasSession: !!data.session,
            userId: data.session?.user?.id?.substring(0, 8) + '...' || 'none'
          }
        })
      }
    } catch (sessionError: any) {
      results.push({
        test: 'Session Check',
        status: 'FAIL',
        message: `Session check error: ${sessionError.message}`,
        data: { error: sessionError.message }
      })
    }
    
    // Test 4: Database connection test
    try {
      const startTime = Date.now()
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1)
        .single()
      const duration = Date.now() - startTime
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is OK
        results.push({
          test: 'Database Connection',
          status: 'FAIL',
          message: `Database connection failed: ${error.message}`,
          data: { duration, error: error.message, code: error.code }
        })
      } else {
        results.push({
          test: 'Database Connection',
          status: 'PASS',
          message: `Database connection successful in ${duration}ms`,
          data: { duration, hasData: !!data }
        })
      }
    } catch (dbError: any) {
      results.push({
        test: 'Database Connection',
        status: 'FAIL',
        message: `Database connection error: ${dbError.message}`,
        data: { error: dbError.message }
      })
    }
    
    // Test 5: RPC function test (the one that's failing)
    try {
      const startTime = Date.now()
      const { data, error } = await supabase.rpc('get_user_with_permissions', {
        user_id: '00000000-0000-0000-0000-000000000000' // Dummy UUID
      })
      const duration = Date.now() - startTime
      
      // We expect this to return empty or error for dummy UUID, but it should complete
      results.push({
        test: 'RPC Function Test',
        status: duration < 5000 ? 'PASS' : 'WARN',
        message: `RPC function responded in ${duration}ms`,
        data: { 
          duration, 
          hasError: !!error,
          errorMessage: error?.message,
          dataLength: Array.isArray(data) ? data.length : 0
        }
      })
    } catch (rpcError: any) {
      results.push({
        test: 'RPC Function Test',
        status: 'FAIL',
        message: `RPC function error: ${rpcError.message}`,
        data: { error: rpcError.message }
      })
    }
    
  } catch (clientError: any) {
    results.push({
      test: 'Supabase Client Creation',
      status: 'FAIL',
      message: `Failed to create Supabase client: ${clientError.message}`,
      data: { error: clientError.message }
    })
  }
  
  // Test 6: Network connectivity
  try {
    const startTime = Date.now()
    const response = await fetch('https://httpbin.org/get', { 
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    })
    const duration = Date.now() - startTime
    
    results.push({
      test: 'Network Connectivity',
      status: response.ok ? 'PASS' : 'WARN',
      message: `Network test completed in ${duration}ms`,
      data: { duration, status: response.status }
    })
  } catch (networkError: any) {
    results.push({
      test: 'Network Connectivity',
      status: 'FAIL',
      message: `Network test failed: ${networkError.message}`,
      data: { error: networkError.message }
    })
  }
  
  // Summary
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const warnings = results.filter(r => r.status === 'WARN').length
  
  console.log('📊 Diagnostic Summary:', { passed, failed, warnings })
  console.table(results.map(r => ({ 
    Test: r.test, 
    Status: r.status, 
    Message: r.message 
  })))
  
  return results
}

// Quick health check for production
export async function quickHealthCheck(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.auth.getSession()
    return !error
  } catch {
    return false
  }
}

// Simulate production issues for testing
export function simulateProductionIssues() {
  console.log('🎭 Simulating production issues...')
  
  // Clear all caches
  clearUserPermissionsCache()
  
  // Override fetch to simulate network delays
  const originalFetch = window.fetch
  let simulationActive = true
  
  window.fetch = async (...args) => {
    if (simulationActive) {
      // Add random delays to simulate network issues
      const delay = Math.random() * 2000 + 500 // 500ms to 2.5s delay
      console.log(`🐌 Simulating network delay: ${Math.round(delay)}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    return originalFetch.apply(window, args)
  }
  
  // Return function to restore normal behavior
  return () => {
    console.log('✅ Restored normal network behavior')
    simulationActive = false
    window.fetch = originalFetch
  }
}

// Export for use in production debugging
if (typeof window !== 'undefined') {
  (window as any).debugSupabase = {
    runDiagnostics: runProductionDiagnostics,
    healthCheck: quickHealthCheck,
    clearUserCache: clearUserPermissionsCache,
    simulateIssues: simulateProductionIssues
  }
  
  console.log('🔧 Debug tools available at window.debugSupabase')
  console.log('   - runDiagnostics(): Run full system diagnostics')
  console.log('   - healthCheck(): Quick connection test')
  console.log('   - clearUserCache(): Clear user permissions cache')
  console.log('   - simulateIssues(): Simulate production network issues')
} 