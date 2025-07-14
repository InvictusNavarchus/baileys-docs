---
id: receiving-messages
title: Receiving Messages
sidebar_position: 4
description: Learn how to handle and process incoming messages with Baileys.
keywords: [baileys, receive message, handle message, message events, processing]
---

# Receiving Messages

This guide covers how to receive, process, and handle incoming messages using Baileys event system.

## Basic Message Receiving

### Setting Up Message Listeners

```typescript
import { getContentType } from '@whiskeysockets/baileys'

sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type === 'notify') {
        for (const message of messages) {
            if (!message.key.fromMe) {
                handleIncomingMessage(message)
            }
        }
    }
})

const handleIncomingMessage = (message: WAMessage) => {
    const messageType = getContentType(message.message)
    const sender = message.key.remoteJid
    
    console.log(`Received ${messageType} from ${sender}`)
    
    // Process based on message type
    switch (messageType) {
        case 'conversation':
        case 'extendedTextMessage':
            handleTextMessage(message)
            break
        case 'imageMessage':
            handleImageMessage(message)
            break
        case 'videoMessage':
            handleVideoMessage(message)
            break
        case 'audioMessage':
            handleAudioMessage(message)
            break
        case 'documentMessage':
            handleDocumentMessage(message)
            break
        case 'locationMessage':
            handleLocationMessage(message)
            break
        case 'contactMessage':
            handleContactMessage(message)
            break
        case 'pollCreationMessage':
            handlePollMessage(message)
            break
        case 'reactionMessage':
            handleReactionMessage(message)
            break
        default:
            console.log('Unsupported message type:', messageType)
    }
}
```

## Processing Different Message Types

### Text Messages

```typescript
const handleTextMessage = (message: WAMessage) => {
    const text = getMessageText(message)
    const sender = message.key.remoteJid
    const isGroup = sender?.endsWith('@g.us')
    
    console.log(`Text message: "${text}"`)
    
    // Handle mentions
    const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    if (mentions.length > 0) {
        console.log('Message mentions:', mentions)
    }
    
    // Handle quoted messages
    const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (quotedMessage) {
        console.log('This is a reply to another message')
    }
    
    // Process commands (if text starts with /)
    if (text.startsWith('/')) {
        handleCommand(message, text)
    }
}

const getMessageText = (message: WAMessage): string => {
    const messageType = getContentType(message.message)
    
    switch (messageType) {
        case 'conversation':
            return message.message.conversation
        case 'extendedTextMessage':
            return message.message.extendedTextMessage.text
        case 'imageMessage':
            return message.message.imageMessage.caption || ''
        case 'videoMessage':
            return message.message.videoMessage.caption || ''
        case 'documentMessage':
            return message.message.documentMessage.caption || ''
        default:
            return ''
    }
}
```

### Media Messages

```typescript
import { downloadMediaMessage } from '@whiskeysockets/baileys'

const handleImageMessage = async (message: WAMessage) => {
    const imageMessage = message.message.imageMessage
    const caption = imageMessage.caption || 'No caption'
    
    console.log(`Received image with caption: "${caption}"`)
    
    try {
        // Download the image
        const buffer = await downloadMediaMessage(
            message,
            'buffer',
            {},
            {
                logger,
                reuploadRequest: sock.updateMediaMessage
            }
        )
        
        // Save or process the image
        const fs = require('fs')
        const filename = `image_${Date.now()}.jpg`
        fs.writeFileSync(filename, buffer)
        
        console.log(`Image saved as ${filename}`)
        
        // Send confirmation
        await sock.sendMessage(message.key.remoteJid, {
            text: `✅ Image received and saved as ${filename}`
        })
        
    } catch (error) {
        console.error('Failed to download image:', error)
    }
}

const handleVideoMessage = async (message: WAMessage) => {
    const videoMessage = message.message.videoMessage
    const caption = videoMessage.caption || 'No caption'
    const isGif = videoMessage.gifPlayback
    
    console.log(`Received ${isGif ? 'GIF' : 'video'} with caption: "${caption}"`)
    
    try {
        const buffer = await downloadMediaMessage(message, 'buffer')
        const extension = isGif ? 'gif' : 'mp4'
        const filename = `video_${Date.now()}.${extension}`
        
        require('fs').writeFileSync(filename, buffer)
        console.log(`Video saved as ${filename}`)
        
    } catch (error) {
        console.error('Failed to download video:', error)
    }
}

const handleAudioMessage = async (message: WAMessage) => {
    const audioMessage = message.message.audioMessage
    const isPTT = audioMessage.ptt // Push-to-talk (voice message)
    const duration = audioMessage.seconds
    
    console.log(`Received ${isPTT ? 'voice message' : 'audio'} (${duration}s)`)
    
    try {
        const buffer = await downloadMediaMessage(message, 'buffer')
        const extension = isPTT ? 'ogg' : 'mp3'
        const filename = `audio_${Date.now()}.${extension}`
        
        require('fs').writeFileSync(filename, buffer)
        console.log(`Audio saved as ${filename}`)
        
    } catch (error) {
        console.error('Failed to download audio:', error)
    }
}

const handleDocumentMessage = async (message: WAMessage) => {
    const documentMessage = message.message.documentMessage
    const filename = documentMessage.fileName || 'document'
    const mimetype = documentMessage.mimetype
    const caption = documentMessage.caption || ''
    
    console.log(`Received document: ${filename} (${mimetype})`)
    
    try {
        const buffer = await downloadMediaMessage(message, 'buffer')
        require('fs').writeFileSync(filename, buffer)
        
        console.log(`Document saved as ${filename}`)
        
    } catch (error) {
        console.error('Failed to download document:', error)
    }
}
```

### Interactive Messages

```typescript
const handleLocationMessage = (message: WAMessage) => {
    const locationMessage = message.message.locationMessage
    const { degreesLatitude, degreesLongitude, name, address } = locationMessage
    
    console.log(`Received location: ${name || 'Unknown'}`)
    console.log(`Address: ${address || 'No address'}`)
    console.log(`Coordinates: ${degreesLatitude}, ${degreesLongitude}`)
    
    // You can use coordinates with mapping services
    const googleMapsUrl = `https://maps.google.com/?q=${degreesLatitude},${degreesLongitude}`
    console.log(`Google Maps: ${googleMapsUrl}`)
}

const handleContactMessage = (message: WAMessage) => {
    const contactMessage = message.message.contactMessage
    const displayName = contactMessage.displayName
    const vcard = contactMessage.vcard
    
    console.log(`Received contact: ${displayName}`)
    
    // Parse vCard for contact details
    const phoneMatch = vcard.match(/TEL[^:]*:([^\r\n]+)/)
    const emailMatch = vcard.match(/EMAIL[^:]*:([^\r\n]+)/)
    
    if (phoneMatch) console.log(`Phone: ${phoneMatch[1]}`)
    if (emailMatch) console.log(`Email: ${emailMatch[1]}`)
}

const handlePollMessage = (message: WAMessage) => {
    const pollMessage = message.message.pollCreationMessage
    const question = pollMessage.name
    const options = pollMessage.values
    const selectableCount = pollMessage.selectableCount
    
    console.log(`Received poll: "${question}"`)
    console.log(`Options: ${options.join(', ')}`)
    console.log(`Can select: ${selectableCount} option(s)`)
}

const handleReactionMessage = (message: WAMessage) => {
    const reactionMessage = message.message.reactionMessage
    const emoji = reactionMessage.text
    const targetMessageKey = reactionMessage.key
    
    if (emoji) {
        console.log(`Received reaction: ${emoji}`)
    } else {
        console.log('Reaction removed')
    }
    
    console.log(`Target message ID: ${targetMessageKey.id}`)
}
```

## Advanced Message Processing

### Command Handler

```typescript
const handleCommand = async (message: WAMessage, text: string) => {
    const args = text.slice(1).split(' ')
    const command = args[0].toLowerCase()
    const sender = message.key.remoteJid
    
    switch (command) {
        case 'help':
            await sock.sendMessage(sender, {
                text: `Available commands:
/help - Show this help
/ping - Test bot response
/time - Get current time
/weather <city> - Get weather info
/joke - Get a random joke`
            })
            break
            
        case 'ping':
            await sock.sendMessage(sender, { text: '🏓 Pong!' })
            break
            
        case 'time':
            const now = new Date().toLocaleString()
            await sock.sendMessage(sender, { text: `🕐 Current time: ${now}` })
            break
            
        case 'weather':
            const city = args.slice(1).join(' ')
            if (city) {
                await getWeather(sender, city)
            } else {
                await sock.sendMessage(sender, { text: '❌ Please specify a city: /weather <city>' })
            }
            break
            
        case 'joke':
            await getRandomJoke(sender)
            break
            
        default:
            await sock.sendMessage(sender, { text: `❌ Unknown command: ${command}` })
    }
}

const getWeather = async (sender: string, city: string) => {
    try {
        // This is a placeholder - integrate with a real weather API
        await sock.sendMessage(sender, {
            text: `🌤️ Weather in ${city}: 22°C, Partly cloudy`
        })
    } catch (error) {
        await sock.sendMessage(sender, {
            text: '❌ Failed to get weather information'
        })
    }
}

const getRandomJoke = async (sender: string) => {
    const jokes = [
        "Why don't scientists trust atoms? Because they make up everything!",
        "Why did the scarecrow win an award? He was outstanding in his field!",
        "Why don't eggs tell jokes? They'd crack each other up!"
    ]
    
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)]
    await sock.sendMessage(sender, { text: `😄 ${randomJoke}` })
}
```

### Message Filtering

```typescript
class MessageFilter {
    private blockedUsers = new Set<string>()
    private allowedGroups = new Set<string>()
    private spamDetector = new Map<string, number[]>()
    
    isBlocked(jid: string): boolean {
        return this.blockedUsers.has(jid)
    }
    
    blockUser(jid: string) {
        this.blockedUsers.add(jid)
    }
    
    unblockUser(jid: string) {
        this.blockedUsers.delete(jid)
    }
    
    isGroupAllowed(groupJid: string): boolean {
        return this.allowedGroups.has(groupJid) || this.allowedGroups.size === 0
    }
    
    addAllowedGroup(groupJid: string) {
        this.allowedGroups.add(groupJid)
    }
    
    isSpam(jid: string): boolean {
        const now = Date.now()
        const userMessages = this.spamDetector.get(jid) || []
        
        // Remove messages older than 1 minute
        const recentMessages = userMessages.filter(time => now - time < 60000)
        
        // Update the record
        this.spamDetector.set(jid, recentMessages)
        
        // Check if more than 10 messages in 1 minute
        return recentMessages.length > 10
    }
    
    recordMessage(jid: string) {
        const userMessages = this.spamDetector.get(jid) || []
        userMessages.push(Date.now())
        this.spamDetector.set(jid, userMessages)
    }
    
    shouldProcessMessage(message: WAMessage): boolean {
        const sender = message.key.remoteJid
        const isGroup = sender?.endsWith('@g.us')
        
        // Skip own messages
        if (message.key.fromMe) return false
        
        // Check if user is blocked
        if (this.isBlocked(sender)) return false
        
        // Check if group is allowed
        if (isGroup && !this.isGroupAllowed(sender)) return false
        
        // Check for spam
        if (this.isSpam(sender)) return false
        
        // Record this message
        this.recordMessage(sender)
        
        return true
    }
}

// Usage
const messageFilter = new MessageFilter()

sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type === 'notify') {
        for (const message of messages) {
            if (messageFilter.shouldProcessMessage(message)) {
                handleIncomingMessage(message)
            }
        }
    }
})
```

### Message Queue Processing

```typescript
class MessageProcessor {
    private queue: WAMessage[] = []
    private processing = false
    
    async addMessage(message: WAMessage) {
        this.queue.push(message)
        
        if (!this.processing) {
            this.processQueue()
        }
    }
    
    private async processQueue() {
        this.processing = true
        
        while (this.queue.length > 0) {
            const message = this.queue.shift()!
            
            try {
                await this.processMessage(message)
            } catch (error) {
                console.error('Error processing message:', error)
            }
            
            // Small delay to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        this.processing = false
    }
    
    private async processMessage(message: WAMessage) {
        const messageType = getContentType(message.message)
        const text = getMessageText(message)
        const sender = message.key.remoteJid
        
        // Log message
        console.log(`Processing ${messageType} from ${sender}: ${text}`)
        
        // Process based on content
        if (text.toLowerCase().includes('hello')) {
            await sock.sendMessage(sender, { text: 'Hello! How can I help you?' })
        } else if (text.toLowerCase().includes('help')) {
            await sock.sendMessage(sender, { text: 'Type /help for available commands' })
        }
        
        // Mark as read
        await sock.readMessages([message.key])
    }
}

// Usage
const processor = new MessageProcessor()

sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type === 'notify') {
        messages.forEach(message => {
            if (!message.key.fromMe) {
                processor.addMessage(message)
            }
        })
    }
})
```

## Message Events

### Message Updates

```typescript
// Handle message updates (edits, deletions, etc.)
sock.ev.on('messages.update', (updates) => {
    for (const update of updates) {
        console.log('Message updated:', update.key.id)
        
        if (update.update.message) {
            console.log('Message was edited')
        }
        
        if (update.update.messageStubType) {
            console.log('Message stub updated:', update.update.messageStubType)
        }
    }
})

// Handle message deletions
sock.ev.on('messages.delete', ({ keys }) => {
    for (const key of keys) {
        console.log('Message deleted:', key.id)
        // Remove from local storage if needed
    }
})
```

### Message Receipts

```typescript
// Handle message receipts (delivery, read status)
sock.ev.on('message-receipt.update', (receipts) => {
    for (const receipt of receipts) {
        const messageId = receipt.key.id
        const receiptType = receipt.receipt.receiptTimestamp ? 'read' : 'delivered'
        
        console.log(`Message ${messageId} was ${receiptType}`)
    }
})
```

## Error Handling

### Robust Message Processing

```typescript
const safeMessageHandler = async (message: WAMessage) => {
    try {
        await handleIncomingMessage(message)
    } catch (error) {
        console.error('Error handling message:', error)
        
        // Send error notification to admin
        const adminJid = 'admin@s.whatsapp.net'
        await sock.sendMessage(adminJid, {
            text: `❌ Error processing message from ${message.key.remoteJid}: ${error.message}`
        }).catch(() => {}) // Ignore if admin message fails
    }
}

sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type === 'notify') {
        messages.forEach(message => {
            if (!message.key.fromMe) {
                safeMessageHandler(message)
            }
        })
    }
})
```

## Best Practices

### 1. Message Deduplication

```typescript
const processedMessages = new Set<string>()

const isDuplicate = (messageId: string): boolean => {
    if (processedMessages.has(messageId)) {
        return true
    }
    
    processedMessages.add(messageId)
    
    // Clean up old message IDs (keep last 1000)
    if (processedMessages.size > 1000) {
        const oldestIds = Array.from(processedMessages).slice(0, 100)
        oldestIds.forEach(id => processedMessages.delete(id))
    }
    
    return false
}
```

### 2. Graceful Shutdown

```typescript
let isShuttingDown = false

process.on('SIGINT', () => {
    console.log('Shutting down gracefully...')
    isShuttingDown = true
    
    // Stop processing new messages
    setTimeout(() => {
        process.exit(0)
    }, 5000) // Give 5 seconds for cleanup
})

const handleIncomingMessage = async (message: WAMessage) => {
    if (isShuttingDown) {
        console.log('Ignoring message due to shutdown')
        return
    }
    
    // Process message normally
}
```

### 3. Performance Monitoring

```typescript
const messageStats = {
    received: 0,
    processed: 0,
    errors: 0,
    startTime: Date.now()
}

const logStats = () => {
    const uptime = Date.now() - messageStats.startTime
    const rate = messageStats.processed / (uptime / 1000)
    
    console.log(`Stats: ${messageStats.received} received, ${messageStats.processed} processed, ${messageStats.errors} errors`)
    console.log(`Processing rate: ${rate.toFixed(2)} messages/second`)
}

// Log stats every minute
setInterval(logStats, 60000)
```

---

**Related Pages:**
- [Message Types](./message-types.md) - All supported message types
- [Sending Messages](./sending-messages.md) - How to send messages
- [Message API Reference](/api-reference/message-api) - Complete API documentation
