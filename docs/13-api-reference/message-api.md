---
id: message-api
title: Message API Reference
sidebar_position: 3
description: Complete reference for sending, receiving, and managing messages with Baileys.
keywords: [baileys, message api, send message, receive message, media, text]
---

# Message API Reference

This page provides comprehensive documentation for message-related operations in Baileys.

## Sending Messages

### sendMessage(jid, content, options?)

The primary method for sending messages of all types.

```typescript
const messageInfo = await sock.sendMessage(jid, content, options)
```

**Parameters:**
- `jid: string` - Chat JID (recipient)
- `content: AnyMessageContent` - Message content
- `options?: MiscMessageGenerationOptions` - Additional options

**Returns:** `Promise<proto.WebMessageInfo>` - Sent message information

## Message Content Types

### Text Messages

```typescript
// Simple text
await sock.sendMessage(jid, { text: 'Hello World!' })

// Text with mentions
await sock.sendMessage(jid, {
    text: 'Hello @1234567890!',
    mentions: ['1234567890@s.whatsapp.net']
})

// Formatted text
await sock.sendMessage(jid, {
    text: '*Bold* _italic_ ~strikethrough~ ```monospace```'
})
```

### Media Messages

#### Image Messages

```typescript
// From file path
await sock.sendMessage(jid, {
    image: { url: './image.jpg' },
    caption: 'Image caption'
})

// From buffer
import { readFileSync } from 'fs'
const imageBuffer = readFileSync('./image.jpg')
await sock.sendMessage(jid, {
    image: imageBuffer,
    caption: 'Image from buffer'
})

// From URL
await sock.sendMessage(jid, {
    image: { url: 'https://example.com/image.jpg' },
    caption: 'Image from URL'
})
```

#### Video Messages

```typescript
// Video file
await sock.sendMessage(jid, {
    video: { url: './video.mp4' },
    caption: 'Video caption',
    gifPlayback: false
})

// GIF playback
await sock.sendMessage(jid, {
    video: { url: './animation.mp4' },
    gifPlayback: true
})
```

#### Audio Messages

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

#### Document Messages

```typescript
await sock.sendMessage(jid, {
    document: { url: './document.pdf' },
    fileName: 'document.pdf',
    mimetype: 'application/pdf'
})
```

### Interactive Messages

#### Location Messages

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

#### Contact Messages

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
END:VCARD`
        }]
    }
})
```

#### Poll Messages

```typescript
await sock.sendMessage(jid, {
    poll: {
        name: 'What is your favorite color?',
        values: ['Red', 'Blue', 'Green', 'Yellow'],
        selectableCount: 1
    }
})
```

### Reaction Messages

```typescript
await sock.sendMessage(jid, {
    react: {
        text: '👍', // emoji
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

### Message Operations

#### Reply to Message

```typescript
await sock.sendMessage(jid, 
    { text: 'This is a reply' },
    { quoted: originalMessage }
)
```

#### Forward Message

```typescript
await sock.sendMessage(jid, {
    forward: originalMessage
})
```

#### Edit Message

```typescript
await sock.sendMessage(jid, {
    edit: originalMessage.key,
    text: 'Edited message content'
})
```

#### Delete Message

```typescript
await sock.sendMessage(jid, {
    delete: originalMessage.key
})
```

## Message Options

### MiscMessageGenerationOptions

```typescript
interface MiscMessageGenerationOptions {
    // Quote another message
    quoted?: WAMessage
    
    // Disappearing messages (seconds)
    ephemeralExpiration?: number
    
    // Custom message ID
    messageId?: string
    
    // Additional attributes
    additionalAttributes?: { [key: string]: string }
    
    // Status broadcast recipients
    statusJidList?: string[]
    
    // Status message styling
    backgroundColor?: string
    font?: number
}
```

### Examples with Options

```typescript
// Disappearing message
await sock.sendMessage(jid, 
    { text: 'This message will disappear' },
    { ephemeralExpiration: 7 * 24 * 60 * 60 } // 7 days
)

// Custom message ID
await sock.sendMessage(jid,
    { text: 'Message with custom ID' },
    { messageId: 'custom-id-123' }
)

// Status message with styling
await sock.sendMessage('status@broadcast',
    { text: 'Status update' },
    { 
        backgroundColor: '#FF0000',
        font: 1,
        statusJidList: [jid1, jid2]
    }
)
```

## Receiving Messages

### Message Events

```typescript
sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type === 'notify') {
        for (const message of messages) {
            if (!message.key.fromMe) {
                handleIncomingMessage(message)
            }
        }
    }
})
```

### Message Processing

```typescript
const handleIncomingMessage = (message: WAMessage) => {
    const messageType = getContentType(message.message)
    const messageContent = message.message?.[messageType]
    
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
    }
}
```

### Extract Message Text

```typescript
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
        default:
            return ''
    }
}
```

## Media Handling

### Download Media

```typescript
import { downloadMediaMessage } from '@whiskeysockets/baileys'

const downloadMedia = async (message: WAMessage) => {
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
        console.error('Failed to download media:', error)
        throw error
    }
}
```

### Media Upload Types

```typescript
type WAMediaUpload = 
    | { url: string }           // File path or URL
    | { stream: Readable }      // Stream
    | Buffer                    // Buffer
    | Uint8Array               // Uint8Array
```

## Message Utilities

### Message Key Operations

```typescript
// Create message key
const createMessageKey = (jid: string, fromMe: boolean, id: string): WAMessageKey => ({
    remoteJid: jid,
    fromMe,
    id
})

// Compare message keys
const areKeysEqual = (key1: WAMessageKey, key2: WAMessageKey): boolean => {
    return key1.remoteJid === key2.remoteJid &&
           key1.fromMe === key2.fromMe &&
           key1.id === key2.id
}
```

### Message Status

```typescript
// Check message status
const getMessageStatus = (message: WAMessage): WAMessageStatus => {
    return message.status || WAMessageStatus.PENDING
}

// Status meanings:
// 0 = ERROR
// 1 = PENDING  
// 2 = SERVER_ACK
// 3 = DELIVERY_ACK
// 4 = READ
// 5 = PLAYED
```

### Message Receipts

```typescript
// Send read receipt
await sock.readMessages([message.key])

// Send delivery receipt
await sock.sendReceipt(jid, undefined, [message.key.id], 'delivery')

// Send read receipt
await sock.sendReceipt(jid, undefined, [message.key.id], 'read')
```

## Advanced Features

### Bulk Message Sending

```typescript
const sendBulkMessages = async (jids: string[], content: AnyMessageContent) => {
    const promises = jids.map(jid => 
        sock.sendMessage(jid, content).catch(error => ({
            jid,
            error: error.message
        }))
    )
    
    const results = await Promise.allSettled(promises)
    return results
}
```

### Message Queue

```typescript
class MessageQueue {
    private queue: Array<{ jid: string, content: AnyMessageContent, options?: any }> = []
    private processing = false
    
    async add(jid: string, content: AnyMessageContent, options?: any) {
        this.queue.push({ jid, content, options })
        if (!this.processing) {
            this.process()
        }
    }
    
    private async process() {
        this.processing = true
        
        while (this.queue.length > 0) {
            const { jid, content, options } = this.queue.shift()!
            
            try {
                await sock.sendMessage(jid, content, options)
                await new Promise(resolve => setTimeout(resolve, 1000)) // Rate limiting
            } catch (error) {
                console.error('Failed to send queued message:', error)
            }
        }
        
        this.processing = false
    }
}
```

---

For related API documentation, see:
- [Socket API](./socket-api.md)
- [Group API](./group-api.md)
- [Types](./types.md)
