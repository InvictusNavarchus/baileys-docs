---
id: sending-messages
title: Sending Messages
sidebar_position: 3
description: Learn how to send different types of messages using Baileys.
keywords: [baileys, send message, text, media, image, video, audio, document]
---

# Sending Messages

This guide covers how to send various types of messages using Baileys, from simple text messages to complex media and interactive content.

## Basic Message Sending

### Text Messages

```typescript
// Simple text message
await sock.sendMessage(jid, { text: 'Hello, World!' })

// Text with formatting
await sock.sendMessage(jid, {
    text: '*Bold* _italic_ ~strikethrough~ ```monospace```'
})

// Text with mentions
await sock.sendMessage(jid, {
    text: 'Hello @1234567890!',
    mentions: ['1234567890@s.whatsapp.net']
})
```

### Message Options

```typescript
// Message with options
await sock.sendMessage(jid, 
    { text: 'This message will disappear in 7 days' },
    { 
        ephemeralExpiration: 7 * 24 * 60 * 60, // 7 days in seconds
        quoted: originalMessage // Reply to a message
    }
)
```

## Media Messages

### Images

```typescript
// Send image from file
await sock.sendMessage(jid, {
    image: { url: './image.jpg' },
    caption: 'Check out this image!'
})

// Send image from buffer
import { readFileSync } from 'fs'
const imageBuffer = readFileSync('./image.jpg')
await sock.sendMessage(jid, {
    image: imageBuffer,
    caption: 'Image from buffer'
})

// Send image from URL
await sock.sendMessage(jid, {
    image: { url: 'https://example.com/image.jpg' },
    caption: 'Image from URL'
})
```

### Videos

```typescript
// Regular video
await sock.sendMessage(jid, {
    video: { url: './video.mp4' },
    caption: 'Video message',
    mimetype: 'video/mp4'
})

// GIF video (auto-play)
await sock.sendMessage(jid, {
    video: { url: './animation.mp4' },
    gifPlayback: true
})
```

### Audio Messages

```typescript
// Audio file
await sock.sendMessage(jid, {
    audio: { url: './audio.mp3' },
    mimetype: 'audio/mp3'
})

// Voice message (PTT)
await sock.sendMessage(jid, {
    audio: { url: './voice.ogg' },
    mimetype: 'audio/ogg; codecs=opus',
    ptt: true
})
```

### Documents

```typescript
await sock.sendMessage(jid, {
    document: { url: './document.pdf' },
    fileName: 'Important Document.pdf',
    mimetype: 'application/pdf',
    caption: 'Please review this document'
})
```

## Interactive Messages

### Location Messages

```typescript
await sock.sendMessage(jid, {
    location: {
        degreesLatitude: 37.7749,
        degreesLongitude: -122.4194,
        name: 'San Francisco',
        address: 'San Francisco, CA, USA'
    }
})
```

### Contact Messages

```typescript
await sock.sendMessage(jid, {
    contacts: {
        displayName: 'John Doe',
        contacts: [{
            displayName: 'John Doe',
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:John Doe
TEL;type=CELL;type=VOICE;waid=1234567890:+1 234 567 890
EMAIL:john@example.com
END:VCARD`
        }]
    }
})
```

### Poll Messages

```typescript
await sock.sendMessage(jid, {
    poll: {
        name: 'What is your favorite color?',
        values: ['Red', 'Blue', 'Green', 'Yellow'],
        selectableCount: 1
    }
})
```

## Message Operations

### Reply to Messages

```typescript
// Reply to a message
await sock.sendMessage(jid,
    { text: 'This is a reply' },
    { quoted: originalMessage }
)
```

### Forward Messages

```typescript
// Forward a message
await sock.sendMessage(jid, {
    forward: originalMessage
})
```

### Edit Messages

```typescript
// Edit a message
await sock.sendMessage(jid, {
    edit: originalMessage.key,
    text: 'This is the edited content'
})
```

### Delete Messages

```typescript
// Delete a message
await sock.sendMessage(jid, {
    delete: originalMessage.key
})
```

### React to Messages

```typescript
// Add reaction
await sock.sendMessage(jid, {
    react: {
        text: '👍',
        key: originalMessage.key
    }
})

// Remove reaction
await sock.sendMessage(jid, {
    react: {
        text: '',
        key: originalMessage.key
    }
})
```

## Advanced Sending Techniques

### Bulk Message Sending

```typescript
const sendBulkMessages = async (recipients: string[], content: AnyMessageContent) => {
    const results = []
    
    for (const jid of recipients) {
        try {
            const result = await sock.sendMessage(jid, content)
            results.push({ jid, success: true, result })
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
            results.push({ jid, success: false, error: error.message })
        }
    }
    
    return results
}

// Usage
const recipients = ['user1@s.whatsapp.net', 'user2@s.whatsapp.net']
const results = await sendBulkMessages(recipients, { text: 'Bulk message' })
```

### Message Queue System

```typescript
class MessageQueue {
    private queue: Array<{
        jid: string
        content: AnyMessageContent
        options?: MiscMessageGenerationOptions
        resolve: (value: any) => void
        reject: (error: any) => void
    }> = []
    
    private processing = false
    private delay = 1000 // 1 second delay between messages
    
    async add(jid: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions) {
        return new Promise((resolve, reject) => {
            this.queue.push({ jid, content, options, resolve, reject })
            
            if (!this.processing) {
                this.process()
            }
        })
    }
    
    private async process() {
        this.processing = true
        
        while (this.queue.length > 0) {
            const { jid, content, options, resolve, reject } = this.queue.shift()!
            
            try {
                const result = await sock.sendMessage(jid, content, options)
                resolve(result)
            } catch (error) {
                reject(error)
            }
            
            // Wait before processing next message
            if (this.queue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, this.delay))
            }
        }
        
        this.processing = false
    }
}

// Usage
const messageQueue = new MessageQueue()

// Add messages to queue
messageQueue.add(jid1, { text: 'Message 1' })
messageQueue.add(jid2, { text: 'Message 2' })
messageQueue.add(jid3, { text: 'Message 3' })
```

### Retry Logic

```typescript
const sendMessageWithRetry = async (
    jid: string, 
    content: AnyMessageContent, 
    options?: MiscMessageGenerationOptions,
    maxRetries = 3
) => {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await sock.sendMessage(jid, content, options)
        } catch (error) {
            lastError = error
            
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
                console.log(`Send attempt ${attempt} failed, retrying in ${delay}ms...`)
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
    }
    
    throw lastError
}
```

## Message Validation

### JID Validation

```typescript
import { isJidUser, isJidGroup } from '@whiskeysockets/baileys'

const validateJid = (jid: string): boolean => {
    return isJidUser(jid) || isJidGroup(jid)
}

const sendMessageSafely = async (jid: string, content: AnyMessageContent) => {
    if (!validateJid(jid)) {
        throw new Error('Invalid JID format')
    }
    
    if (sock.ws.readyState !== sock.ws.OPEN) {
        throw new Error('WebSocket not connected')
    }
    
    return await sock.sendMessage(jid, content)
}
```

### Content Validation

```typescript
const validateMessageContent = (content: AnyMessageContent): boolean => {
    if ('text' in content) {
        return typeof content.text === 'string' && content.text.length > 0
    }
    
    if ('image' in content || 'video' in content || 'audio' in content || 'document' in content) {
        const media = content.image || content.video || content.audio || content.document
        return !!(media && (media.url || Buffer.isBuffer(media)))
    }
    
    return true
}
```

## Error Handling

### Common Send Errors

```typescript
const handleSendError = (error: any, jid: string, content: AnyMessageContent) => {
    const statusCode = error.output?.statusCode
    
    switch (statusCode) {
        case 400:
            console.log('Bad request - invalid message format')
            break
        case 403:
            console.log('Forbidden - insufficient permissions or blocked')
            break
        case 404:
            console.log('Chat not found - invalid JID')
            break
        case 429:
            console.log('Rate limited - too many messages')
            break
        case 500:
            console.log('Server error - try again later')
            break
        default:
            console.log('Unknown error:', error.message)
    }
}

// Usage
try {
    await sock.sendMessage(jid, content)
} catch (error) {
    handleSendError(error, jid, content)
}
```

### Connection State Checking

```typescript
const ensureConnected = async (): Promise<boolean> => {
    return new Promise((resolve) => {
        if (sock.ws.readyState === sock.ws.OPEN) {
            resolve(true)
            return
        }
        
        const timeout = setTimeout(() => {
            resolve(false)
        }, 10000) // 10 second timeout
        
        sock.ev.once('connection.update', ({ connection }) => {
            clearTimeout(timeout)
            resolve(connection === 'open')
        })
    })
}

const sendMessageWhenConnected = async (jid: string, content: AnyMessageContent) => {
    if (!(await ensureConnected())) {
        throw new Error('Failed to establish connection')
    }
    
    return await sock.sendMessage(jid, content)
}
```

## Best Practices

### 1. Rate Limiting

```typescript
// Implement rate limiting to avoid being blocked
const rateLimiter = {
    lastSent: 0,
    minInterval: 1000, // 1 second minimum between messages
    
    async waitIfNeeded() {
        const now = Date.now()
        const timeSinceLastSent = now - this.lastSent
        
        if (timeSinceLastSent < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastSent
            await new Promise(resolve => setTimeout(resolve, waitTime))
        }
        
        this.lastSent = Date.now()
    }
}

// Use before sending messages
await rateLimiter.waitIfNeeded()
await sock.sendMessage(jid, content)
```

### 2. Message Tracking

```typescript
const messageTracker = new Map<string, {
    jid: string
    content: AnyMessageContent
    timestamp: Date
    status: 'sent' | 'delivered' | 'read' | 'failed'
}>()

const trackMessage = async (jid: string, content: AnyMessageContent) => {
    try {
        const result = await sock.sendMessage(jid, content)
        
        messageTracker.set(result.key.id!, {
            jid,
            content,
            timestamp: new Date(),
            status: 'sent'
        })
        
        return result
    } catch (error) {
        const messageId = Date.now().toString()
        messageTracker.set(messageId, {
            jid,
            content,
            timestamp: new Date(),
            status: 'failed'
        })
        throw error
    }
}
```

### 3. Content Optimization

```typescript
// Optimize media before sending
const optimizeImage = async (imagePath: string): Promise<Buffer> => {
    const sharp = require('sharp')
    
    return await sharp(imagePath)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()
}

// Usage
const optimizedImage = await optimizeImage('./large-image.jpg')
await sock.sendMessage(jid, {
    image: optimizedImage,
    caption: 'Optimized image'
})
```

---

**Related Pages:**
- [Message Types](./message-types.md) - All supported message types
- [Receiving Messages](./receiving-messages.md) - How to handle incoming messages
- [Message API Reference](../api-reference/message-api.md) - Complete API documentation
