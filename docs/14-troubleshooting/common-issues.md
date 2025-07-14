---
id: common-issues
title: Common Issues & Solutions
sidebar_position: 2
description: Solutions to the most frequently encountered problems when using Baileys.
keywords: [baileys, common issues, problems, solutions, troubleshooting, fixes]
---

# Common Issues & Solutions

This page covers the most frequently encountered problems when using Baileys and their solutions.

## Connection Issues

### Issue: "Connection closed due to 428"

**Error Message:**
```
Connection closed due to Boom: Connection Closed [428]
```

**Cause:** WhatsApp servers closed the connection, usually due to:
- Network connectivity issues
- Server-side rate limiting
- Temporary server problems

**Solutions:**

1. **Implement automatic reconnection:**
```typescript
sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
        
        if (statusCode === 428) {
            console.log('Connection closed by server, reconnecting in 5 seconds...')
            setTimeout(connectToWhatsApp, 5000)
        }
    }
})
```

2. **Add connection timeout and retry logic:**
```typescript
const sock = makeWASocket({
    auth: state,
    connectTimeoutMs: 60000, // 60 seconds
    keepAliveIntervalMs: 10000, // 10 seconds
    retryRequestDelayMs: 1000
})
```

### Issue: "Connection timed out"

**Error Message:**
```
Connection closed due to Boom: Connection Timed Out [408]
```

**Cause:** Network timeout or slow internet connection.

**Solutions:**

1. **Increase timeout values:**
```typescript
const sock = makeWASocket({
    auth: state,
    connectTimeoutMs: 120000, // 2 minutes
    keepAliveIntervalMs: 30000 // 30 seconds
})
```

2. **Check network connectivity:**
```typescript
const checkConnection = async () => {
    try {
        const response = await fetch('https://web.whatsapp.com', { 
            method: 'HEAD',
            timeout: 10000 
        })
        return response.ok
    } catch {
        return false
    }
}

// Use before connecting
if (await checkConnection()) {
    connectToWhatsApp()
} else {
    console.log('No internet connection')
}
```

### Issue: "Bad Session [500]"

**Error Message:**
```
Connection closed due to Boom: Bad Session [500]
```

**Cause:** Corrupted or invalid session files.

**Solutions:**

1. **Clear auth state and re-authenticate:**
```typescript
import fs from 'fs'
import path from 'path'

const clearAuthState = (authFolder: string) => {
    if (fs.existsSync(authFolder)) {
        fs.rmSync(authFolder, { recursive: true, force: true })
        console.log('Auth state cleared, please re-authenticate')
    }
}

sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
        
        if (statusCode === DisconnectReason.badSession) {
            clearAuthState('auth_info_baileys')
            // Restart authentication process
            connectToWhatsApp()
        }
    }
})
```

2. **Validate session before use:**
```typescript
const validateSession = (creds: AuthenticationCreds): boolean => {
    return !!(
        creds.noiseKey &&
        creds.signedIdentityKey &&
        creds.signedPreKey &&
        creds.registrationId
    )
}

const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

if (!validateSession(state.creds)) {
    console.log('Invalid session detected, clearing...')
    clearAuthState('auth_info_baileys')
}
```

## Authentication Issues

### Issue: QR Code Not Appearing

**Symptoms:** No QR code displayed in terminal or application.

**Solutions:**

1. **Check configuration:**
```typescript
const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // Make sure this is true
    browser: ['My Bot', 'Chrome', '1.0.0']
})
```

2. **Handle QR events manually:**
```typescript
sock.ev.on('connection.update', ({ qr }) => {
    if (qr) {
        console.log('QR Code received:')
        console.log(qr)
        // Or use qrcode library to display properly
    }
})
```

### Issue: Pairing Code Not Working

**Symptoms:** Pairing code request fails or code doesn't work in WhatsApp.

**Solutions:**

1. **Verify phone number format:**
```typescript
const validatePhoneNumber = (phoneNumber: string): boolean => {
    // Must start with + and country code
    const regex = /^\+[1-9]\d{1,14}$/
    return regex.test(phoneNumber)
}

if (!validatePhoneNumber(phoneNumber)) {
    console.log('Invalid phone number format. Use +countrycode followed by number')
    return
}
```

2. **Handle pairing code errors:**
```typescript
try {
    const code = await sock.requestPairingCode(phoneNumber)
    console.log(`Pairing code: ${code}`)
} catch (error) {
    if (error.output?.statusCode === 429) {
        console.log('Too many requests, wait before trying again')
    } else if (error.output?.statusCode === 400) {
        console.log('Invalid phone number')
    } else {
        console.log('Pairing code request failed:', error.message)
    }
}
```

### Issue: "Logged Out [401]"

**Error Message:**
```
Connection closed due to Boom: Logged Out [401]
```

**Cause:** Session was invalidated (user logged out from phone, device limit exceeded, etc.).

**Solution:**
```typescript
sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
        
        if (statusCode === DisconnectReason.loggedOut) {
            console.log('Logged out, please re-authenticate')
            // Clear session and restart auth
            clearAuthState('auth_info_baileys')
            // Don't auto-reconnect, require manual re-auth
        }
    }
})
```

## Message Issues

### Issue: Messages Not Sending

**Symptoms:** `sendMessage` doesn't throw error but messages don't appear in WhatsApp.

**Solutions:**

1. **Check connection state:**
```typescript
const sendMessageSafely = async (jid: string, content: AnyMessageContent) => {
    if (sock.ws.readyState !== sock.ws.OPEN) {
        throw new Error('WebSocket not connected')
    }
    
    if (!sock.user) {
        throw new Error('Not authenticated')
    }
    
    return await sock.sendMessage(jid, content)
}
```

2. **Validate JID format:**
```typescript
import { isJidUser, isJidGroup } from '@whiskeysockets/baileys'

const validateJid = (jid: string): boolean => {
    return isJidUser(jid) || isJidGroup(jid)
}

if (!validateJid(jid)) {
    throw new Error('Invalid JID format')
}
```

3. **Add retry logic:**
```typescript
const sendMessageWithRetry = async (jid: string, content: AnyMessageContent, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await sock.sendMessage(jid, content)
        } catch (error) {
            if (i === maxRetries - 1) throw error
            
            console.log(`Send attempt ${i + 1} failed, retrying...`)
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        }
    }
}
```

### Issue: Media Messages Failing

**Symptoms:** Text messages work but images/videos fail to send.

**Solutions:**

1. **Check file existence and permissions:**
```typescript
import fs from 'fs'

const sendImageSafely = async (jid: string, imagePath: string, caption?: string) => {
    if (!fs.existsSync(imagePath)) {
        throw new Error('Image file not found')
    }
    
    const stats = fs.statSync(imagePath)
    if (stats.size > 16 * 1024 * 1024) { // 16MB limit
        throw new Error('Image file too large (max 16MB)')
    }
    
    return await sock.sendMessage(jid, {
        image: { url: imagePath },
        caption
    })
}
```

2. **Handle different media types:**
```typescript
const sendMediaMessage = async (jid: string, mediaPath: string, type: 'image' | 'video' | 'audio' | 'document') => {
    const mediaUpload = { url: mediaPath }
    
    switch (type) {
        case 'image':
            return await sock.sendMessage(jid, { image: mediaUpload })
        case 'video':
            return await sock.sendMessage(jid, { video: mediaUpload })
        case 'audio':
            return await sock.sendMessage(jid, { 
                audio: mediaUpload,
                mimetype: 'audio/mp4'
            })
        case 'document':
            return await sock.sendMessage(jid, { 
                document: mediaUpload,
                fileName: path.basename(mediaPath)
            })
    }
}
```

### Issue: Messages Received Multiple Times

**Symptoms:** Same message processed multiple times by bot.

**Solution:**
```typescript
const processedMessages = new Set<string>()

sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return
    
    for (const message of messages) {
        const messageId = message.key.id
        
        if (processedMessages.has(messageId)) {
            continue // Skip already processed message
        }
        
        processedMessages.add(messageId)
        
        // Process message
        handleMessage(message)
        
        // Clean up old message IDs (keep last 1000)
        if (processedMessages.size > 1000) {
            const oldestIds = Array.from(processedMessages).slice(0, 100)
            oldestIds.forEach(id => processedMessages.delete(id))
        }
    }
})
```

## Group Issues

### Issue: "Forbidden [403]" in Groups

**Symptoms:** Cannot send messages or perform admin actions in groups.

**Solutions:**

1. **Check if bot is admin:**
```typescript
const isAdmin = async (groupJid: string, userJid: string): Promise<boolean> => {
    try {
        const metadata = await sock.groupMetadata(groupJid)
        const participant = metadata.participants.find(p => p.id === userJid)
        return participant?.admin === 'admin' || participant?.admin === 'superadmin'
    } catch {
        return false
    }
}

// Before admin actions
if (!(await isAdmin(groupJid, sock.user.id))) {
    console.log('Bot is not an admin in this group')
    return
}
```

2. **Check group settings:**
```typescript
const canSendMessage = async (groupJid: string): Promise<boolean> => {
    try {
        const metadata = await sock.groupMetadata(groupJid)
        
        // If group is in announcement mode, only admins can send
        if (metadata.announce) {
            return await isAdmin(groupJid, sock.user.id)
        }
        
        return true
    } catch {
        return false
    }
}
```

### Issue: Cannot Add Participants

**Symptoms:** `groupParticipantsUpdate` fails with various errors.

**Solutions:**

1. **Handle different error codes:**
```typescript
const addParticipants = async (groupJid: string, participants: string[]) => {
    try {
        const results = await sock.groupParticipantsUpdate(groupJid, participants, 'add')
        
        results.forEach(result => {
            switch (result.status) {
                case '200':
                    console.log(`✅ Successfully added ${result.jid}`)
                    break
                case '403':
                    console.log(`❌ ${result.jid} privacy settings prevent adding`)
                    break
                case '409':
                    console.log(`⚠️ ${result.jid} is already in the group`)
                    break
                default:
                    console.log(`❓ Failed to add ${result.jid}: ${result.status}`)
            }
        })
        
        return results
    } catch (error) {
        console.log('Failed to add participants:', error.message)
        throw error
    }
}
```

2. **Validate participants before adding:**
```typescript
const validateParticipants = async (participants: string[]): Promise<string[]> => {
    const validParticipants: string[] = []
    
    for (const participant of participants) {
        try {
            const [result] = await sock.onWhatsApp([participant])
            if (result?.exists) {
                validParticipants.push(participant)
            } else {
                console.log(`${participant} is not on WhatsApp`)
            }
        } catch (error) {
            console.log(`Failed to check ${participant}:`, error.message)
        }
    }
    
    return validParticipants
}
```

## Performance Issues

### Issue: High Memory Usage

**Symptoms:** Bot consumes excessive RAM over time.

**Solutions:**

1. **Implement message cleanup:**
```typescript
// Clean up old messages periodically
setInterval(() => {
    processedMessages.clear()
    console.log('Cleaned up processed messages cache')
}, 60 * 60 * 1000) // Every hour
```

2. **Limit history sync:**
```typescript
const sock = makeWASocket({
    auth: state,
    syncFullHistory: false, // Don't sync full history
    shouldSyncHistoryMessage: (msg) => {
        // Only sync recent messages
        const messageAge = Date.now() - (msg.messageTimestamp * 1000)
        return messageAge < 24 * 60 * 60 * 1000 // Last 24 hours
    }
})
```

3. **Use efficient caching:**
```typescript
import NodeCache from 'node-cache'

const cache = new NodeCache({ 
    stdTTL: 600, // 10 minutes
    checkperiod: 120, // Check for expired keys every 2 minutes
    maxKeys: 1000 // Limit cache size
})

const sock = makeWASocket({
    auth: state,
    userDevicesCache: cache,
    msgRetryCounterCache: cache
})
```

### Issue: Slow Message Processing

**Symptoms:** Bot responds slowly to messages.

**Solutions:**

1. **Use async processing:**
```typescript
sock.ev.on('messages.upsert', ({ messages }) => {
    // Process messages asynchronously
    messages.forEach(message => {
        setImmediate(() => handleMessage(message))
    })
})
```

2. **Implement message queue:**
```typescript
import { Queue } from 'bull'

const messageQueue = new Queue('message processing')

messageQueue.process(async (job) => {
    const { message } = job.data
    await handleMessage(message)
})

sock.ev.on('messages.upsert', ({ messages }) => {
    messages.forEach(message => {
        messageQueue.add('process', { message })
    })
})
```

## Installation Issues

### Issue: Sharp Installation Fails

**Error:** Sharp fails to install on some systems.

**Solution:**
```bash
# Uninstall sharp and use jimp instead
npm uninstall sharp
npm install jimp

# Or install sharp with specific configuration
npm install sharp --platform=linux --arch=x64
```

### Issue: libsignal Compilation Errors

**Error:** Native dependencies fail to compile.

**Solutions:**

1. **Install build tools:**
```bash
# Ubuntu/Debian
sudo apt-get install build-essential python3

# CentOS/RHEL
sudo yum groupinstall "Development Tools"
sudo yum install python3

# macOS
xcode-select --install

# Windows
npm install --global windows-build-tools
```

2. **Use pre-built binaries:**
```bash
npm install @whiskeysockets/baileys --prefer-offline
```

### Issue: Node.js Version Compatibility

**Error:** Engine requirements not met.

**Solution:**
```bash
# Check current version
node --version

# Install Node.js 20 or higher
# Using nvm (recommended)
nvm install 20
nvm use 20

# Or download from nodejs.org
```

## Quick Fixes Checklist

When encountering issues, try these quick fixes first:

1. **Restart the application**
2. **Check internet connection**
3. **Verify Node.js version (>= 20.0.0)**
4. **Update Baileys to latest version**
5. **Clear auth state if connection issues persist**
6. **Check WhatsApp Web isn't open in browser**
7. **Verify phone number format for pairing codes**
8. **Check file permissions for auth folder**
9. **Ensure sufficient disk space**
10. **Check firewall/proxy settings**

---

**Related Pages:**
- [Troubleshooting Guide](./README.md) - Main troubleshooting guide
- [Debugging](./debugging.md) - Advanced debugging techniques
- [FAQ](../15-faq/README.md) - Frequently asked questions
