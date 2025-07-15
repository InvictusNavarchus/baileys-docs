---
id: pairing-code-auth
title: Pairing Code Authentication
sidebar_position: 3
description: Learn how to implement pairing code authentication for WhatsApp bots using Baileys.
keywords: [baileys, pairing code, authentication, whatsapp, phone number]
---

# Pairing Code Authentication

Pairing code authentication allows users to connect to WhatsApp without scanning a QR code. Instead, they enter their phone number and receive an 8-digit pairing code to enter in their WhatsApp mobile app.

## How Pairing Code Authentication Works

Pairing code authentication follows these steps:

1. **Request Pairing Code**: User provides their phone number
2. **Generate Code**: Baileys generates an 8-digit pairing code
3. **Display Code**: The pairing code is shown to the user
4. **Enter in WhatsApp**: User enters the code in WhatsApp → Settings → Linked Devices → Link with Phone Number
5. **Establish Connection**: WhatsApp servers authenticate and establish the connection
6. **Save Session**: Authentication credentials are saved for future use

## Basic Implementation

### Simple Pairing Code Authentication

```typescript
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'

async function connectWithPairingCode(phoneNumber: string) {
    // Load or create authentication state
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Disable QR code
        browser: ['My Bot', 'Chrome', '1.0.0']
    })

    // Request pairing code if not registered
    if (!sock.authState.creds.registered) {
        const code = await sock.requestPairingCode(phoneNumber)
        console.log(`Pairing code for ${phoneNumber}: ${code}`)
        console.log('Enter this code in WhatsApp → Settings → Linked Devices → Link with Phone Number')
    }

    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
            
            if (shouldReconnect) {
                connectWithPairingCode(phoneNumber)
            }
        } else if (connection === 'open') {
            console.log('Connected successfully!')
        }
    })

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds)
    
    return sock
}

// Usage
connectWithPairingCode('+1234567890') // Include country code
```

## Advanced Pairing Code Implementation

### Interactive Phone Number Input

```typescript
import readline from 'readline'

async function interactivePairingAuth() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    const askQuestion = (question: string): Promise<string> => {
        return new Promise((resolve) => {
            rl.question(question, resolve)
        })
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['My Bot', 'Chrome', '1.0.0']
        })

        if (!sock.authState.creds.registered) {
            console.log('🔐 WhatsApp Authentication Required')
            console.log('Choose authentication method:')
            console.log('1. Pairing Code (recommended)')
            console.log('2. QR Code')
            
            const method = await askQuestion('Enter choice (1 or 2): ')
            
            if (method === '1') {
                const phoneNumber = await askQuestion('Enter your phone number (with country code, e.g., +1234567890): ')
                
                // Validate phone number format
                if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
                    console.log('❌ Invalid phone number format. Please include country code (e.g., +1234567890)')
                    rl.close()
                    return
                }
                
                try {
                    const code = await sock.requestPairingCode(phoneNumber)
                    console.log(`\n📱 Your pairing code: ${code}`)
                    console.log('📋 Steps to complete authentication:')
                    console.log('   1. Open WhatsApp on your phone')
                    console.log('   2. Go to Settings → Linked Devices')
                    console.log('   3. Tap "Link with Phone Number"')
                    console.log(`   4. Enter this code: ${code}`)
                    console.log('\n⏰ Code expires in 20 seconds\n')
                } catch (error) {
                    console.log('❌ Failed to request pairing code:', error.message)
                    rl.close()
                    return
                }
            } else {
                // Fall back to QR code
                sock.config.printQRInTerminal = true
                console.log('📱 Scan the QR code with WhatsApp')
            }
        }

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update
            
            if (connection === 'open') {
                console.log('✅ Connected to WhatsApp!')
                rl.close()
            }
            
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut
                
                if (shouldReconnect) {
                    console.log('🔄 Reconnecting...')
                    setTimeout(() => interactivePairingAuth(), 3000)
                } else {
                    console.log('👋 Logged out')
                    rl.close()
                }
            }
        })

        sock.ev.on('creds.update', saveCreds)
        
    } catch (error) {
        console.log('❌ Authentication error:', error.message)
        rl.close()
    }
}

interactivePairingAuth()
```

### Web Interface for Pairing Code

```typescript
import express from 'express'
import { body, validationResult } from 'express-validator'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

let currentSocket: WASocket | null = null
let pairingCode: string | null = null
let connectionStatus = 'disconnected'

// Serve authentication page
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>WhatsApp Bot Authentication</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
                .form-group { margin-bottom: 15px; }
                label { display: block; margin-bottom: 5px; font-weight: bold; }
                input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
                button { background: #25D366; color: white; padding: 12px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%; }
                button:hover { background: #128C7E; }
                .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
                .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
                .code { font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 3px; }
            </style>
        </head>
        <body>
            <h1>WhatsApp Bot Authentication</h1>
            
            <div id="status">
                ${connectionStatus === 'connected' ? 
                    '<div class="status success">✅ Connected to WhatsApp!</div>' :
                    connectionStatus === 'connecting' ?
                    '<div class="status info">🔄 Connecting...</div>' :
                    '<div class="status error">❌ Not connected</div>'
                }
            </div>
            
            ${connectionStatus !== 'connected' ? `
                <form action="/auth" method="post">
                    <div class="form-group">
                        <label for="phoneNumber">Phone Number (with country code):</label>
                        <input type="tel" id="phoneNumber" name="phoneNumber" placeholder="+1234567890" required>
                    </div>
                    <button type="submit">Get Pairing Code</button>
                </form>
                
                ${pairingCode ? `
                    <div class="status success">
                        <h3>Your Pairing Code:</h3>
                        <div class="code">${pairingCode}</div>
                        <p><strong>Steps:</strong></p>
                        <ol>
                            <li>Open WhatsApp on your phone</li>
                            <li>Go to Settings → Linked Devices</li>
                            <li>Tap "Link with Phone Number"</li>
                            <li>Enter the code above</li>
                        </ol>
                        <p><em>Code expires in 20 seconds</em></p>
                    </div>
                ` : ''}
            ` : ''}
            
            <script>
                // Auto-refresh every 3 seconds to update status
                setTimeout(() => location.reload(), 3000);
            </script>
        </body>
        </html>
    `)
})

// Handle authentication request
app.post('/auth', 
    body('phoneNumber').isMobilePhone().withMessage('Invalid phone number'),
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        const { phoneNumber } = req.body
        
        try {
            const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
            
            currentSocket = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                browser: ['My Bot', 'Chrome', '1.0.0']
            })

            if (!currentSocket.authState.creds.registered) {
                pairingCode = await currentSocket.requestPairingCode(phoneNumber)
                connectionStatus = 'connecting'
                
                // Clear pairing code after 25 seconds
                setTimeout(() => {
                    pairingCode = null
                }, 25000)
            }

            currentSocket.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect } = update
                
                if (connection === 'open') {
                    connectionStatus = 'connected'
                    pairingCode = null
                } else if (connection === 'close') {
                    connectionStatus = 'disconnected'
                    pairingCode = null
                    
                    const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut
                    if (shouldReconnect) {
                        setTimeout(() => {
                            connectionStatus = 'connecting'
                        }, 3000)
                    }
                }
            })

            currentSocket.ev.on('creds.update', saveCreds)
            
            res.redirect('/')
            
        } catch (error) {
            console.error('Authentication error:', error)
            res.status(500).json({ error: 'Failed to request pairing code' })
        }
    }
)

app.listen(3000, () => {
    console.log('Authentication server running at http://localhost:3000')
})
```

## Phone Number Validation

### Comprehensive Validation

```typescript
class PhoneNumberValidator {
    private static readonly COUNTRY_CODES = {
        'US': '+1',
        'UK': '+44',
        'IN': '+91',
        'BR': '+55',
        'DE': '+49',
        'FR': '+33',
        'IT': '+39',
        'ES': '+34',
        'RU': '+7',
        'CN': '+86',
        'JP': '+81',
        'KR': '+82',
        'AU': '+61',
        'CA': '+1',
        'MX': '+52'
    }

    static validate(phoneNumber: string): { isValid: boolean, formatted?: string, error?: string } {
        // Remove all non-digit characters except +
        const cleaned = phoneNumber.replace(/[^\d+]/g, '')
        
        // Check if starts with +
        if (!cleaned.startsWith('+')) {
            return { isValid: false, error: 'Phone number must start with country code (e.g., +1)' }
        }
        
        // Check length (minimum 8, maximum 15 digits after +)
        const digits = cleaned.substring(1)
        if (digits.length < 8 || digits.length > 15) {
            return { isValid: false, error: 'Phone number must be 8-15 digits long' }
        }
        
        // Check if all characters after + are digits
        if (!/^\d+$/.test(digits)) {
            return { isValid: false, error: 'Phone number can only contain digits after country code' }
        }
        
        return { isValid: true, formatted: cleaned }
    }

    static getCountryCode(countryName: string): string | null {
        return this.COUNTRY_CODES[countryName.toUpperCase()] || null
    }

    static formatForDisplay(phoneNumber: string): string {
        const cleaned = phoneNumber.replace(/[^\d+]/g, '')
        
        // Format common patterns
        if (cleaned.startsWith('+1')) {
            // US/Canada format: +1 (123) 456-7890
            const digits = cleaned.substring(2)
            if (digits.length === 10) {
                return `+1 (${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`
            }
        }
        
        return cleaned
    }
}

// Usage in pairing code authentication
async function authenticateWithValidation(phoneNumber: string) {
    const validation = PhoneNumberValidator.validate(phoneNumber)
    
    if (!validation.isValid) {
        console.log('❌ Invalid phone number:', validation.error)
        return
    }
    
    console.log('📱 Formatted number:', PhoneNumberValidator.formatForDisplay(validation.formatted!))
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['My Bot', 'Chrome', '1.0.0']
    })

    if (!sock.authState.creds.registered) {
        try {
            const code = await sock.requestPairingCode(validation.formatted!)
            console.log(`🔐 Pairing code: ${code}`)
        } catch (error) {
            console.log('❌ Failed to request pairing code:', error.message)
            return
        }
    }

    // ... rest of connection handling
}
```

## Error Handling and Retry Logic

### Robust Pairing Code Implementation

```typescript
class PairingCodeAuth {
    private maxRetries = 3
    private retryDelay = 5000
    private codeTimeout = 25000

    async authenticate(phoneNumber: string): Promise<WASocket> {
        const validation = PhoneNumberValidator.validate(phoneNumber)
        if (!validation.isValid) {
            throw new Error(`Invalid phone number: ${validation.error}`)
        }

        return this.attemptConnection(validation.formatted!, 0)
    }

    private async attemptConnection(phoneNumber: string, attempt: number): Promise<WASocket> {
        if (attempt >= this.maxRetries) {
            throw new Error('Maximum authentication attempts exceeded')
        }

        console.log(`🔄 Authentication attempt ${attempt + 1}/${this.maxRetries}`)

        try {
            const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
            
            const sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                browser: ['My Bot', 'Chrome', '1.0.0'],
                connectTimeoutMs: 60000
            })

            return new Promise((resolve, reject) => {
                let codeRequested = false
                let codeTimeout: NodeJS.Timeout

                sock.ev.on('connection.update', async (update) => {
                    const { connection, lastDisconnect } = update

                    if (connection === 'connecting' && !sock.authState.creds.registered && !codeRequested) {
                        try {
                            const code = await sock.requestPairingCode(phoneNumber)
                            console.log(`📱 Pairing code for ${phoneNumber}: ${code}`)
                            console.log('⏰ Code expires in 20 seconds')
                            codeRequested = true

                            // Set timeout for code expiration
                            codeTimeout = setTimeout(() => {
                                console.log('⏰ Pairing code expired, retrying...')
                                sock.end()
                            }, this.codeTimeout)

                        } catch (error) {
                            console.log('❌ Failed to request pairing code:', error.message)
                            reject(error)
                        }
                    }

                    if (connection === 'open') {
                        console.log('✅ Connected successfully!')
                        if (codeTimeout) clearTimeout(codeTimeout)
                        resolve(sock)
                    }

                    if (connection === 'close') {
                        if (codeTimeout) clearTimeout(codeTimeout)
                        
                        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
                        
                        switch (statusCode) {
                            case DisconnectReason.loggedOut:
                                reject(new Error('Logged out - authentication required'))
                                break
                                
                            case DisconnectReason.badSession:
                                console.log('🗑️ Bad session, clearing and retrying...')
                                // Clear auth state and retry
                                setTimeout(() => {
                                    this.attemptConnection(phoneNumber, attempt + 1)
                                        .then(resolve)
                                        .catch(reject)
                                }, this.retryDelay)
                                break
                                
                            case DisconnectReason.timedOut:
                            case DisconnectReason.connectionLost:
                            case DisconnectReason.connectionClosed:
                                console.log('🔄 Connection issue, retrying...')
                                setTimeout(() => {
                                    this.attemptConnection(phoneNumber, attempt + 1)
                                        .then(resolve)
                                        .catch(reject)
                                }, this.retryDelay)
                                break
                                
                            default:
                                reject(new Error(`Connection failed: ${statusCode}`))
                        }
                    }
                })

                sock.ev.on('creds.update', saveCreds)
            })

        } catch (error) {
            console.log(`❌ Attempt ${attempt + 1} failed:`, error.message)
            
            if (attempt < this.maxRetries - 1) {
                console.log(`⏳ Retrying in ${this.retryDelay / 1000} seconds...`)
                await new Promise(resolve => setTimeout(resolve, this.retryDelay))
                return this.attemptConnection(phoneNumber, attempt + 1)
            } else {
                throw error
            }
        }
    }
}

// Usage
const auth = new PairingCodeAuth()
auth.authenticate('+1234567890')
    .then(sock => {
        console.log('🎉 Authentication successful!')
        // Use the socket for your bot operations
    })
    .catch(error => {
        console.log('💥 Authentication failed:', error.message)
    })
```

## Best Practices

### 1. Security Considerations

```typescript
// Don't log phone numbers in production
const logPhoneNumber = (phoneNumber: string) => {
    if (process.env.NODE_ENV === 'production') {
        // Mask phone number for logging
        const masked = phoneNumber.substring(0, 3) + '****' + phoneNumber.substring(phoneNumber.length - 2)
        return masked
    }
    return phoneNumber
}

console.log(`Requesting code for: ${logPhoneNumber(phoneNumber)}`)
```

### 2. Rate Limiting

```typescript
class RateLimiter {
    private requests: Map<string, number[]> = new Map()
    private maxRequests = 3
    private windowMs = 60000 // 1 minute

    canMakeRequest(phoneNumber: string): boolean {
        const now = Date.now()
        const requests = this.requests.get(phoneNumber) || []
        
        // Remove old requests outside the window
        const validRequests = requests.filter(time => now - time < this.windowMs)
        
        if (validRequests.length >= this.maxRequests) {
            return false
        }
        
        validRequests.push(now)
        this.requests.set(phoneNumber, validRequests)
        return true
    }

    getTimeUntilReset(phoneNumber: string): number {
        const requests = this.requests.get(phoneNumber) || []
        if (requests.length === 0) return 0
        
        const oldestRequest = Math.min(...requests)
        const timeUntilReset = this.windowMs - (Date.now() - oldestRequest)
        return Math.max(0, timeUntilReset)
    }
}

const rateLimiter = new RateLimiter()

async function requestPairingCodeWithLimit(phoneNumber: string) {
    if (!rateLimiter.canMakeRequest(phoneNumber)) {
        const waitTime = rateLimiter.getTimeUntilReset(phoneNumber)
        throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`)
    }
    
    // Proceed with pairing code request
    const code = await sock.requestPairingCode(phoneNumber)
    return code
}
```

### 3. User Experience

```typescript
// Provide clear instructions
const showPairingInstructions = (code: string, phoneNumber: string) => {
    console.log('\n' + '='.repeat(50))
    console.log('📱 WHATSAPP PAIRING CODE AUTHENTICATION')
    console.log('='.repeat(50))
    console.log(`📞 Phone Number: ${PhoneNumberValidator.formatForDisplay(phoneNumber)}`)
    console.log(`🔐 Pairing Code: ${code}`)
    console.log('\n📋 Follow these steps:')
    console.log('   1. Open WhatsApp on your phone')
    console.log('   2. Go to Settings (⚙️)')
    console.log('   3. Tap "Linked Devices"')
    console.log('   4. Tap "Link with Phone Number"')
    console.log(`   5. Enter this code: ${code}`)
    console.log('\n⏰ This code expires in 20 seconds')
    console.log('🔄 A new code will be generated if this one expires')
    console.log('='.repeat(50) + '\n')
}
```

---

**Next Steps:**
- [QR Code Authentication](./qr-code-auth.md) - Alternative authentication method
- [Session Management](./session-management.md) - Managing authentication sessions
