#!/usr/bin/env node

/**
 * Local Production Testing Script
 * Run this to test the production fixes locally
 */

const { spawn } = require('child_process')
const path = require('path')

console.log('🧪 Starting Local Production Testing Environment')
console.log('================================================')

// Function to run a command and pipe output
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    child.on('error', reject)
  })
}

async function main() {
  try {
    console.log('📦 Starting Next.js development server...')
    console.log('🌐 Navigate to: http://localhost:3000/test-production')
    console.log('📊 Or run diagnostics at: http://localhost:3000/test-production')
    console.log('')
    console.log('🔧 Testing Features Available:')
    console.log('  - Full system diagnostics')
    console.log('  - User permissions testing')
    console.log('  - Cache clearing and simulation')
    console.log('  - Production condition simulation')
    console.log('  - Real-time useCurrentUser monitoring')
    console.log('')
    console.log('💡 Browser Console Commands:')
    console.log('  await window.debugSupabase.runDiagnostics()')
    console.log('  await window.debugSupabase.healthCheck()')
    console.log('')
    console.log('🛑 Press Ctrl+C to stop the server')
    console.log('================================================')

    // Start the development server
    await runCommand('npm', ['run', 'dev'], {
      cwd: process.cwd()
    })

  } catch (error) {
    console.error('❌ Error starting test environment:', error.message)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down test environment...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down test environment...')
  process.exit(0)
})

main().catch(console.error) 