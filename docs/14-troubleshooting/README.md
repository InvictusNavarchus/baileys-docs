---
title: Troubleshooting Guide
sidebar_position: 1
description: Comprehensive troubleshooting guide to diagnose and fix common issues when working with Baileys.
keywords: [baileys, troubleshooting, debugging, common issues, problems, solutions]
---

# Troubleshooting Guide

This guide helps you diagnose and fix common issues when working with Baileys. Use this as your first resource when encountering problems.

## Quick Diagnosis

### Connection Issues

**Symptoms:** Bot won't connect, QR code not appearing, connection keeps dropping

**Quick Checks:**
1. ✅ Node.js version >= 20.0.0
2. ✅ Latest Baileys version installed
3. ✅ Stable internet connection
4. ✅ WhatsApp Web not open in browser
5. ✅ Valid authentication state

### Message Issues

**Symptoms:** Messages not sending/receiving, media not working

**Quick Checks:**
1. ✅ Bot is connected (`connection === 'open'`)
2. ✅ Valid JID format
3. ✅ Proper message content structure
4. ✅ Required permissions (for groups)
5. ✅ Media file exists and is accessible

### Authentication Issues

**Symptoms:** QR code expired, pairing code not working, session invalid

**Quick Checks:**
1. ✅ Auth folder has proper permissions
2. ✅ Session files not corrupted
3. ✅ Phone number format correct (for pairing)
4. ✅ WhatsApp app is updated
5. ✅ Device limit not exceeded

## Common Issues & Solutions

### 1. Connection Problems

#### Issue: "Connection closed due to 428"
```
Connection closed due to Boom: Connection Closed [428]
```

**Cause:** Normal connection closure, usually temporary

**Solution:**
```typescript
sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
        
        if (shouldReconnect) {
            console.log('Reconnecting...')
            setTimeout(connectToWhatsApp, 3000) // Reconnect after 3 seconds
        }
    }
})
```

#### Issue: "Connection timed out"
```
Connection closed due to Boom: Connection Timed Out [408]
```

**Cause:** Network issues or server overload

**Solutions:**
1. **Increase timeout:**
   ```typescript
   const sock = makeWASocket({
       connectTimeoutMs: 60000, // 60 seconds
       defaultQueryTimeoutMs: 60000
   })
   ```

2. **Implement retry logic:**
   ```typescript
   const connectWithRetry = async (maxRetries = 5) => {
       for (let attempt = 1; attempt <= maxRetries; attempt++) {
           try {
               await connectToWhatsApp()
               return
           } catch (error) {
               if (attempt === maxRetries) throw error
               
               const delay = Math.pow(2, attempt) * 1000
               console.log(`Retry ${attempt}/${maxRetries} in ${delay}ms`)
               await new Promise(resolve => setTimeout(resolve, delay))
           }
       }
   }
   ```

#### Issue: "Bad session"
```
Connection closed due to Boom: Bad Session [500]
```

**Cause:** Corrupted session files

**Solution:**
```typescript
const handleBadSession = async () => {
    console.log('Bad session detected, clearing auth state...')
    
    // Clear auth folder
    const fs = require('fs')
    const path = require('path')
    
    const authFolder = 'auth_info'
    if (fs.existsSync(authFolder)) {
        fs.rmSync(authFolder, { recursive: true, force: true })
    }
    
    // Restart with fresh authentication
    await connectToWhatsApp()
}

sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        
        if (statusCode === DisconnectReason.badSession) {
            handleBadSession()
        }
    }
})
```

### 2. Authentication Problems

#### Issue: QR Code not appearing
```
QR code should appear but terminal shows nothing
```

**Solutions:**
1. **Check terminal compatibility:**
   ```typescript
   const sock = makeWASocket({
       printQRInTerminal: true,
       qrTimeout: 40000 // 40 seconds timeout
   })
   
   sock.ev.on('connection.update', ({ qr }) => {
       if (qr) {
           console.log('QR Code received!')
           // Generate QR code image as fallback
           const QRCode = require('qrcode')
           QRCode.toFile('qr.png', qr)
           console.log('QR code saved as qr.png')
       }
   })
   ```

2. **Use pairing code instead:**
   ```typescript
   const sock = makeWASocket({
       printQRInTerminal: false
   })
   
   if (!sock.authState.creds.registered) {
       const phoneNumber = '+1234567890' // Your number
       const code = await sock.requestPairingCode(phoneNumber)
       console.log(`Pairing code: ${code}`)
   }
   ```

#### Issue: Pairing code not working
```
Pairing code generated but WhatsApp says it's invalid
```

**Solutions:**
1. **Check phone number format:**
   ```typescript
   // Correct format: country code + number (no +, spaces, or dashes)
   const phoneNumber = '1234567890' // US number
   const phoneNumber = '919876543210' // Indian number
   
   const code = await sock.requestPairingCode(phoneNumber)
   ```

2. **Ensure WhatsApp is updated:**
   - Update WhatsApp to latest version
   - Pairing code feature requires recent WhatsApp versions

#### Issue: Session expires frequently
```
Bot keeps getting logged out and needs re-authentication
```

**Solution:**
```typescript
// Implement session validation
const validateSession = (creds) => {
    return !!(
        creds.registered &&
        creds.me &&
        creds.signedIdentityKey &&
        creds.signedPreKey
    )
}

// Check session health periodically
setInterval(async () => {
    if (!validateSession(sock.authState.creds)) {
        console.log('Session appears invalid, refreshing...')
        // Implement session refresh logic
    }
}, 5 * 60 * 1000) // Check every 5 minutes
```

### 3. Message Issues

#### Issue: Messages not sending
```
sendMessage throws error or messages don't appear in WhatsApp
```

**Solutions:**
1. **Check connection state:**
   ```typescript
   const sendMessageSafely = async (jid, content) => {
       if (sock.ws.readyState !== sock.ws.OPEN) {
           throw new Error('WebSocket not connected')
       }
       
       return await sock.sendMessage(jid, content)
   }
   ```

2. **Validate JID format:**
   ```typescript
   const validateJid = (jid) => {
       // Individual chat: 1234567890@s.whatsapp.net
       // Group chat: 1234567890-1234567890@g.us
       const individualRegex = /^\d+@s\.whatsapp\.net$/
       const groupRegex = /^\d+-\d+@g\.us$/
       
       return individualRegex.test(jid) || groupRegex.test(jid)
   }
   
   if (!validateJid(jid)) {
       throw new Error('Invalid JID format')
   }
   ```

3. **Handle rate limiting:**
   ```typescript
   const messageQueue = []
   let isProcessing = false
   
   const processMessageQueue = async () => {
       if (isProcessing || messageQueue.length === 0) return
       
       isProcessing = true
       
       while (messageQueue.length > 0) {
           const { jid, content, resolve, reject } = messageQueue.shift()
           
           try {
               const result = await sock.sendMessage(jid, content)
               resolve(result)
           } catch (error) {
               reject(error)
           }
           
           // Rate limiting: 1 message per second
           await new Promise(resolve => setTimeout(resolve, 1000))
       }
       
       isProcessing = false
   }
   
   const queueMessage = (jid, content) => {
       return new Promise((resolve, reject) => {
           messageQueue.push({ jid, content, resolve, reject })
           processMessageQueue()
       })
   }
   ```

#### Issue: Media messages failing
```
Image/video/audio messages not sending or downloading
```

**Solutions:**
1. **Check file existence:**
   ```typescript
   const fs = require('fs')
   
   const sendMediaMessage = async (jid, mediaPath, type) => {
       if (!fs.existsSync(mediaPath)) {
           throw new Error(`Media file not found: ${mediaPath}`)
       }
       
       const stats = fs.statSync(mediaPath)
       if (stats.size > 100 * 1024 * 1024) { // 100MB limit
           throw new Error('Media file too large')
       }
       
       const content = {
           [type]: { url: mediaPath },
           caption: 'Media message'
       }
       
       return await sock.sendMessage(jid, content)
   }
   ```

2. **Handle media download errors:**
   ```typescript
   import { downloadMediaMessage } from '@whiskeysockets/baileys'
   
   const downloadMediaSafely = async (message) => {
       try {
           const buffer = await downloadMediaMessage(
               message,
               'buffer',
               {},
               {
                   logger,
                   reuploadRequest: sock.updateMediaMessage
               }
           )
           return buffer
       } catch (error) {
           if (error.message.includes('404')) {
               console.log('Media expired, requesting re-upload...')
               await sock.updateMediaMessage(message)
               // Retry download
               return await downloadMediaMessage(message, 'buffer')
           }
           throw error
       }
   }
   ```

### 4. Group Issues

#### Issue: Can't send messages to group
```
Messages to group fail with permission error
```

**Solutions:**
1. **Check group membership:**
   ```typescript
   const checkGroupMembership = async (groupJid) => {
       try {
           const metadata = await sock.groupMetadata(groupJid)
           const myJid = sock.user.id
           
           const isMember = metadata.participants.some(p => 
               p.id === myJid
           )
           
           if (!isMember) {
               throw new Error('Bot is not a member of this group')
           }
           
           return metadata
       } catch (error) {
           throw new Error(`Failed to get group info: ${error.message}`)
       }
   }
   ```

2. **Handle group restrictions:**
   ```typescript
   const sendGroupMessage = async (groupJid, content) => {
       const metadata = await sock.groupMetadata(groupJid)
       
       if (metadata.announce) {
           const myJid = sock.user.id
           const participant = metadata.participants.find(p => p.id === myJid)
           
           if (!participant?.admin) {
               throw new Error('Only admins can send messages to this group')
           }
       }
       
       return await sock.sendMessage(groupJid, content)
   }
   ```

### 5. Performance Issues

#### Issue: High memory usage
```
Bot consumes too much RAM over time
```

**Solutions:**
1. **Implement message cleanup:**
   ```typescript
   const messageCache = new Map()
   const MAX_CACHE_SIZE = 1000
   
   const cleanupCache = () => {
       if (messageCache.size > MAX_CACHE_SIZE) {
           const entries = Array.from(messageCache.entries())
           const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE)
           
           toDelete.forEach(([key]) => {
               messageCache.delete(key)
           })
       }
   }
   
   setInterval(cleanupCache, 60000) // Cleanup every minute
   ```

2. **Use streams for media:**
   ```typescript
   const processMediaStream = async (message) => {
       const stream = await downloadMediaMessage(message, 'stream')
       
       // Process stream without loading into memory
       stream.pipe(fs.createWriteStream('output.jpg'))
       
       return new Promise((resolve, reject) => {
           stream.on('end', resolve)
           stream.on('error', reject)
       })
   }
   ```

## Debugging Techniques

### 1. Enable Debug Logging

```typescript
import P from 'pino'

const logger = P({
    level: 'debug', // or 'trace' for more verbose
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    }
})

const sock = makeWASocket({
    logger: logger.child({ class: 'baileys' })
})
```

### 2. Monitor WebSocket Events

```typescript
sock.ws.on('open', () => console.log('WebSocket opened'))
sock.ws.on('close', (code, reason) => console.log('WebSocket closed:', code, reason))
sock.ws.on('error', (error) => console.log('WebSocket error:', error))

// Monitor all binary node communications
sock.ws.on('CB:*', (node) => {
    console.log('Received node:', node.tag, node.attrs)
})
```

### 3. Track Message Flow

```typescript
const originalSendMessage = sock.sendMessage
sock.sendMessage = async (...args) => {
    console.log('Sending message:', args[0], Object.keys(args[1]))
    
    try {
        const result = await originalSendMessage.apply(sock, args)
        console.log('Message sent successfully:', result.key.id)
        return result
    } catch (error) {
        console.log('Message send failed:', error.message)
        throw error
    }
}
```

### 4. Health Monitoring

```typescript
class HealthMonitor {
    private lastActivity = Date.now()
    private metrics = {
        messagesSent: 0,
        messagesReceived: 0,
        errors: 0,
        reconnections: 0
    }
    
    monitor(sock) {
        sock.ev.on('messages.upsert', ({ messages }) => {
            this.metrics.messagesReceived += messages.length
            this.lastActivity = Date.now()
        })
        
        sock.ev.on('connection.update', ({ connection }) => {
            if (connection === 'open') {
                this.metrics.reconnections++
            }
        })
        
        // Health check every 30 seconds
        setInterval(() => {
            const timeSinceActivity = Date.now() - this.lastActivity
            
            if (timeSinceActivity > 5 * 60 * 1000) { // 5 minutes
                console.warn('No activity for 5 minutes, connection might be stale')
            }
            
            console.log('Health metrics:', this.metrics)
        }, 30000)
    }
}
```

## Getting Help

### 1. Check Logs First
Always check your logs for error messages and stack traces.

### 2. Search Existing Issues
Search [GitHub Issues](https://github.com/WhiskeySockets/Baileys/issues) for similar problems.

### 3. Provide Complete Information
When asking for help, include:
- Baileys version
- Node.js version
- Operating system
- Complete error message
- Minimal code to reproduce the issue

### 4. Join the Community
- [Discord Server](https://discord.gg/WeJM5FP9GG)
- [GitHub Discussions](https://github.com/WhiskeySockets/Baileys/discussions)

## Next Steps

- **[Common Issues](./common-issues.md)**: More specific problem solutions
- **[Debugging](./debugging.md)**: Advanced debugging techniques
- **[Performance](../12-best-practices/performance.md)**: Performance optimization
- **[FAQ](../15-faq/README.md)**: Frequently asked questions

---

> **Remember**: Most issues are related to connection problems, authentication, or incorrect usage. Always check the basics first before diving into complex debugging.
