---
id: qr-code-auth
title: QR Code Authentication
sidebar_position: 2
description: Learn how to implement QR code authentication for WhatsApp bots using Baileys.
keywords: [baileys, qr code, authentication, whatsapp web, login]
---

# QR Code Authentication

QR code authentication is the traditional method for connecting to WhatsApp Web. This guide covers how to implement QR code authentication in your Baileys application.

## How QR Code Authentication Works

QR code authentication follows these steps:

1. **Generate QR Code**: Baileys generates a QR code containing connection credentials
2. **Display QR Code**: The QR code is displayed in your terminal or application
3. **Scan with WhatsApp**: User scans the QR code with their WhatsApp mobile app
4. **Establish Connection**: WhatsApp servers authenticate and establish the connection
5. **Save Session**: Authentication credentials are saved for future use

## Basic Implementation

### Simple QR Code Authentication

```typescript
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'

async function connectWithQR() {
    // Load or create authentication state
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // This will print QR in terminal
        browser: ['My Bot', 'Chrome', '1.0.0']
    })

    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if (qr) {
            console.log('QR Code received, scan with WhatsApp mobile app')
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
            
            if (shouldReconnect) {
                connectWithQR()
            }
        } else if (connection === 'open') {
            console.log('Connected successfully!')
        }
    })

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds)
}

connectWithQR()
```

## Advanced QR Code Handling

### Custom QR Code Display

Instead of printing to terminal, you can handle QR codes programmatically:

```typescript
import QRCode from 'qrcode'
import fs from 'fs'

async function connectWithCustomQR() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Disable terminal printing
        browser: ['My Bot', 'Chrome', '1.0.0']
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if (qr) {
            // Generate QR code as image
            const qrImage = await QRCode.toDataURL(qr)
            
            // Save as file
            const base64Data = qrImage.replace(/^data:image\/png;base64,/, '')
            fs.writeFileSync('qr-code.png', base64Data, 'base64')
            console.log('QR code saved as qr-code.png')
            
            // Or display in web interface
            // sendQRToWebInterface(qrImage)
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut
            
            if (shouldReconnect) {
                connectWithCustomQR()
            }
        } else if (connection === 'open') {
            console.log('Connected successfully!')
            // Clean up QR code file
            if (fs.existsSync('qr-code.png')) {
                fs.unlinkSync('qr-code.png')
            }
        }
    })

    sock.ev.on('creds.update', saveCreds)
}
```

### Web Interface QR Code

For web applications, you can serve the QR code through an HTTP endpoint:

```typescript
import express from 'express'
import QRCode from 'qrcode'

const app = express()
let currentQR: string | null = null

async function setupWebQR() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['My Bot', 'Chrome', '1.0.0']
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if (qr) {
            // Store QR for web interface
            currentQR = await QRCode.toDataURL(qr)
            console.log('QR code updated, visit http://localhost:3000/qr')
        }
        
        if (connection === 'open') {
            currentQR = null // Clear QR when connected
            console.log('Connected successfully!')
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut
            
            if (shouldReconnect) {
                setTimeout(setupWebQR, 5000) // Reconnect after 5 seconds
            }
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

// Serve QR code endpoint
app.get('/qr', (req, res) => {
    if (currentQR) {
        res.send(`
            <html>
                <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                    <div style="text-align: center;">
                        <h2>Scan QR Code with WhatsApp</h2>
                        <img src="${currentQR}" alt="QR Code" style="max-width: 300px;" />
                        <p>Open WhatsApp → Settings → Linked Devices → Link a Device</p>
                        <script>
                            // Auto-refresh every 5 seconds
                            setTimeout(() => location.reload(), 5000);
                        </script>
                    </div>
                </body>
            </html>
        `)
    } else {
        res.send(`
            <html>
                <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                    <div style="text-align: center;">
                        <h2>WhatsApp Status</h2>
                        <p>Either connected or generating QR code...</p>
                        <script>
                            setTimeout(() => location.reload(), 2000);
                        </script>
                    </div>
                </body>
            </html>
        `)
    }
})

app.listen(3000, () => {
    console.log('Web interface available at http://localhost:3000/qr')
    setupWebQR()
})
```

## QR Code Expiration Handling

QR codes expire after a certain time. Handle this gracefully:

```typescript
async function connectWithQRExpiration() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    
    let qrTimeout: NodeJS.Timeout
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['My Bot', 'Chrome', '1.0.0']
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if (qr) {
            console.log('New QR Code received')
            
            // Clear previous timeout
            if (qrTimeout) {
                clearTimeout(qrTimeout)
            }
            
            // Set timeout for QR expiration (usually 20 seconds)
            qrTimeout = setTimeout(() => {
                console.log('QR Code expired, generating new one...')
                // The library will automatically generate a new QR
            }, 20000)
        }
        
        if (connection === 'open') {
            console.log('Connected successfully!')
            if (qrTimeout) {
                clearTimeout(qrTimeout)
            }
        }
        
        if (connection === 'close') {
            if (qrTimeout) {
                clearTimeout(qrTimeout)
            }
            
            const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut
            
            if (shouldReconnect) {
                console.log('Reconnecting...')
                setTimeout(connectWithQRExpiration, 3000)
            }
        }
    })

    sock.ev.on('creds.update', saveCreds)
}
```

## QR Code Best Practices

### 1. User Experience

```typescript
class QRManager {
    private qrDisplayed = false
    private connectionAttempts = 0
    private maxAttempts = 3

    async connect() {
        if (this.connectionAttempts >= this.maxAttempts) {
            console.log('Max connection attempts reached. Please try again later.')
            return
        }

        this.connectionAttempts++
        console.log(`Connection attempt ${this.connectionAttempts}/${this.maxAttempts}`)

        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['My Bot', 'Chrome', '1.0.0']
        })

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update
            
            if (qr) {
                this.displayQR(qr)
            }
            
            if (connection === 'open') {
                console.log('✅ Connected successfully!')
                this.qrDisplayed = false
                this.connectionAttempts = 0
            }
            
            if (connection === 'close') {
                if (this.qrDisplayed) {
                    console.log('❌ QR scan failed or connection lost')
                    this.qrDisplayed = false
                }
                
                const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut
                
                if (shouldReconnect && this.connectionAttempts < this.maxAttempts) {
                    console.log('🔄 Retrying connection...')
                    setTimeout(() => this.connect(), 5000)
                }
            }
        })

        sock.ev.on('creds.update', saveCreds)
    }

    private displayQR(qr: string) {
        if (!this.qrDisplayed) {
            console.log('\n📱 Please scan the QR code with WhatsApp:')
            console.log('   1. Open WhatsApp on your phone')
            console.log('   2. Go to Settings → Linked Devices')
            console.log('   3. Tap "Link a Device"')
            console.log('   4. Scan the QR code below\n')
            this.qrDisplayed = true
        }
        
        // Display QR in terminal or save to file
        console.log(qr) // or use qrcode library to display properly
    }
}

const qrManager = new QRManager()
qrManager.connect()
```

### 2. Error Handling

```typescript
async function robustQRConnection() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['My Bot', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60_000, // 60 second timeout
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if (qr) {
            console.log('📱 Scan QR code with WhatsApp (expires in 20 seconds)')
        }
        
        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
            
            switch (statusCode) {
                case DisconnectReason.badSession:
                    console.log('❌ Bad session file, deleting and retrying...')
                    // Delete auth folder and retry
                    break
                    
                case DisconnectReason.connectionClosed:
                    console.log('🔄 Connection closed, reconnecting...')
                    setTimeout(robustQRConnection, 3000)
                    break
                    
                case DisconnectReason.connectionLost:
                    console.log('📡 Connection lost, reconnecting...')
                    setTimeout(robustQRConnection, 3000)
                    break
                    
                case DisconnectReason.connectionReplaced:
                    console.log('🔄 Connection replaced by another session')
                    break
                    
                case DisconnectReason.loggedOut:
                    console.log('👋 Logged out, please scan QR again')
                    break
                    
                case DisconnectReason.restartRequired:
                    console.log('🔄 Restart required, restarting...')
                    setTimeout(robustQRConnection, 1000)
                    break
                    
                case DisconnectReason.timedOut:
                    console.log('⏰ Connection timed out, retrying...')
                    setTimeout(robustQRConnection, 5000)
                    break
                    
                default:
                    console.log('❓ Unknown disconnect reason:', statusCode)
                    setTimeout(robustQRConnection, 5000)
            }
        } else if (connection === 'open') {
            console.log('✅ Connected to WhatsApp!')
        }
    })

    sock.ev.on('creds.update', saveCreds)
}
```

## Security Considerations

### 1. Protect QR Codes

```typescript
// Don't log QR codes in production
const sock = makeWASocket({
    auth: state,
    printQRInTerminal: process.env.NODE_ENV !== 'production',
    browser: ['My Bot', 'Chrome', '1.0.0']
})
```

### 2. Secure QR Display

```typescript
// For web interfaces, add authentication
app.get('/qr', authenticateUser, (req, res) => {
    // Only show QR to authenticated users
    if (currentQR) {
        res.send(qrHTML)
    } else {
        res.status(404).send('No QR code available')
    }
})
```

### 3. Rate Limiting

```typescript
// Implement rate limiting for QR requests
const qrRequestTimes: number[] = []

sock.ev.on('connection.update', (update) => {
    if (update.qr) {
        const now = Date.now()
        qrRequestTimes.push(now)
        
        // Remove old entries (older than 5 minutes)
        const fiveMinutesAgo = now - 5 * 60 * 1000
        while (qrRequestTimes.length > 0 && qrRequestTimes[0] < fiveMinutesAgo) {
            qrRequestTimes.shift()
        }
        
        // Check if too many requests
        if (qrRequestTimes.length > 10) {
            console.log('Too many QR requests, please wait...')
            return
        }
        
        // Display QR code
        displayQRCode(update.qr)
    }
})
```

## Troubleshooting QR Authentication

### Common Issues

1. **QR Code Not Appearing**: Check `printQRInTerminal` setting
2. **QR Code Expires Quickly**: Normal behavior, scan within 20 seconds
3. **Connection Fails After Scan**: Check internet connection and firewall
4. **Multiple QR Codes**: Each new QR invalidates the previous one

### Debug Mode

```typescript
import { Boom } from '@hapi/boom'

sock.ev.on('connection.update', (update) => {
    console.log('Connection update:', {
        connection: update.connection,
        qr: !!update.qr,
        isNewLogin: update.isNewLogin,
        receivedPendingNotifications: update.receivedPendingNotifications
    })
    
    if (update.lastDisconnect) {
        const error = update.lastDisconnect.error as Boom
        console.log('Disconnect details:', {
            statusCode: error?.output?.statusCode,
            message: error?.message,
            stack: error?.stack
        })
    }
})
```

---

**Next Steps:**
- [Pairing Code Authentication](./pairing-code-auth.md) - Alternative authentication method
- [Session Management](./session-management.md) - Managing authentication sessions
