---
id: message-types
title: Message Types
sidebar_position: 2
description: Complete guide to all WhatsApp message types supported by Baileys.
keywords: [baileys, message types, text, media, image, video, audio, document, location, contact, poll]
---

# Message Types

Baileys supports all WhatsApp message types. This guide covers how to send and handle each type of message.

## Text Messages

### Basic Text Message

```typescript
await sock.sendMessage(jid, {
    text: 'Hello, World!'
})
```

### Formatted Text

WhatsApp supports basic text formatting:

```typescript
await sock.sendMessage(jid, {
    text: '*Bold text*\n_Italic text_\n~Strikethrough~\n```Monospace```'
})
```

### Text with Mentions

```typescript
await sock.sendMessage(jid, {
    text: 'Hello @1234567890 and @0987654321!',
    mentions: ['1234567890@s.whatsapp.net', '0987654321@s.whatsapp.net']
})
```

### Extended Text Message

For longer texts with additional features:

```typescript
await sock.sendMessage(jid, {
    text: 'This is a longer message with a preview',
    contextInfo: {
        externalAdReply: {
            title: 'Custom Title',
            body: 'Custom Description',
            thumbnailUrl: 'https://example.com/image.jpg',
            sourceUrl: 'https://example.com'
        }
    }
})
```

## Media Messages

### Image Messages

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

// With thumbnail
await sock.sendMessage(jid, {
    image: { url: './image.jpg' },
    caption: 'Image with custom thumbnail',
    jpegThumbnail: thumbnailBuffer
})
```

### Video Messages

```typescript
// Regular video
await sock.sendMessage(jid, {
    video: { url: './video.mp4' },
    caption: 'Video caption',
    mimetype: 'video/mp4'
})

// GIF video (plays automatically)
await sock.sendMessage(jid, {
    video: { url: './animation.mp4' },
    caption: 'Animated GIF',
    gifPlayback: true
})

// Video with thumbnail
await sock.sendMessage(jid, {
    video: { url: './video.mp4' },
    caption: 'Video with thumbnail',
    jpegThumbnail: thumbnailBuffer
})
```

### Audio Messages

```typescript
// Regular audio file
await sock.sendMessage(jid, {
    audio: { url: './audio.mp3' },
    mimetype: 'audio/mp3'
})

// Voice message (PTT - Push to Talk)
await sock.sendMessage(jid, {
    audio: { url: './voice.ogg' },
    mimetype: 'audio/ogg; codecs=opus',
    ptt: true,
    seconds: 30 // Duration in seconds
})

// Audio with waveform
await sock.sendMessage(jid, {
    audio: { url: './audio.mp3' },
    mimetype: 'audio/mp3',
    waveform: waveformData // Uint8Array representing waveform
})
```

### Document Messages

```typescript
// Basic document
await sock.sendMessage(jid, {
    document: { url: './document.pdf' },
    fileName: 'document.pdf',
    mimetype: 'application/pdf'
})

// Document with thumbnail
await sock.sendMessage(jid, {
    document: { url: './presentation.pptx' },
    fileName: 'presentation.pptx',
    mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    jpegThumbnail: thumbnailBuffer
})

// Document with caption
await sock.sendMessage(jid, {
    document: { url: './report.docx' },
    fileName: 'Monthly Report.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    caption: 'Here is the monthly report'
})
```

## Interactive Messages

### Location Messages

```typescript
// Basic location
await sock.sendMessage(jid, {
    location: {
        degreesLatitude: 37.7749,
        degreesLongitude: -122.4194
    }
})

// Location with details
await sock.sendMessage(jid, {
    location: {
        degreesLatitude: 37.7749,
        degreesLongitude: -122.4194,
        name: 'San Francisco',
        address: 'San Francisco, CA, USA'
    }
})

// Live location (shares location for specified duration)
await sock.sendMessage(jid, {
    liveLocation: {
        degreesLatitude: 37.7749,
        degreesLongitude: -122.4194,
        accuracyInMeters: 10,
        speedInMps: 0,
        degreesClockwiseFromMagneticNorth: 0,
        caption: 'Live location',
        sequenceNumber: 1,
        timeOffset: 0,
        jpegThumbnail: thumbnailBuffer
    }
})
```

### Contact Messages

```typescript
// Single contact
await sock.sendMessage(jid, {
    contacts: {
        displayName: 'John Doe',
        contacts: [{
            displayName: 'John Doe',
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:John Doe
ORG:Company Name
TEL;type=CELL;type=VOICE;waid=1234567890:+1 234 567 890
EMAIL:john@example.com
URL:https://johndoe.com
END:VCARD`
        }]
    }
})

// Multiple contacts
await sock.sendMessage(jid, {
    contacts: {
        displayName: 'My Contacts',
        contacts: [
            {
                displayName: 'John Doe',
                vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+1234567890\nEND:VCARD'
            },
            {
                displayName: 'Jane Smith',
                vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:Jane Smith\nTEL:+0987654321\nEND:VCARD'
            }
        ]
    }
})
```

### Poll Messages

```typescript
// Single choice poll
await sock.sendMessage(jid, {
    poll: {
        name: 'What is your favorite color?',
        values: ['Red', 'Blue', 'Green', 'Yellow'],
        selectableCount: 1
    }
})

// Multiple choice poll
await sock.sendMessage(jid, {
    poll: {
        name: 'Which programming languages do you know?',
        values: ['JavaScript', 'Python', 'Java', 'C++', 'Go', 'Rust'],
        selectableCount: 3 // Allow up to 3 selections
    }
})
```

## Reaction Messages

### Add Reaction

```typescript
await sock.sendMessage(jid, {
    react: {
        text: '👍', // Emoji
        key: originalMessage.key
    }
})
```

### Remove Reaction

```typescript
await sock.sendMessage(jid, {
    react: {
        text: '', // Empty string removes reaction
        key: originalMessage.key
    }
})
```

### Common Reaction Emojis

```typescript
const reactions = {
    like: '👍',
    love: '❤️',
    laugh: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😡',
    thumbsDown: '👎',
    fire: '🔥',
    party: '🎉',
    check: '✅'
}

// Use in reaction
await sock.sendMessage(jid, {
    react: {
        text: reactions.fire,
        key: originalMessage.key
    }
})
```

## Message Operations

### Reply to Message

```typescript
await sock.sendMessage(jid, 
    { text: 'This is a reply' },
    { quoted: originalMessage }
)
```

### Forward Message

```typescript
await sock.sendMessage(jid, {
    forward: originalMessage
})

// Forward with additional content
await sock.sendMessage(jid, {
    text: 'Check this out:',
    forward: originalMessage
})
```

### Edit Message

```typescript
await sock.sendMessage(jid, {
    edit: originalMessage.key,
    text: 'This is the edited message content'
})
```

### Delete Message

```typescript
// Delete for everyone
await sock.sendMessage(jid, {
    delete: originalMessage.key
})
```

## Sticker Messages

### Send Sticker

```typescript
// Static sticker
await sock.sendMessage(jid, {
    sticker: { url: './sticker.webp' }
})

// Animated sticker
await sock.sendMessage(jid, {
    sticker: { url: './animated-sticker.webp' },
    isAnimated: true
})
```

### Create Sticker from Image

```typescript
import sharp from 'sharp'

const createStickerFromImage = async (imagePath: string): Promise<Buffer> => {
    return await sharp(imagePath)
        .resize(512, 512, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp()
        .toBuffer()
}

// Usage
const stickerBuffer = await createStickerFromImage('./image.jpg')
await sock.sendMessage(jid, {
    sticker: stickerBuffer
})
```

## Business Messages

### Product Message

```typescript
await sock.sendMessage(jid, {
    product: {
        productImage: { url: './product.jpg' },
        productId: 'product-123',
        title: 'Product Name',
        description: 'Product description',
        currencyCode: 'USD',
        priceAmount1000: 99000, // $99.00 (in thousandths)
        retailerId: 'retailer-123',
        url: 'https://example.com/product'
    }
})
```

### Order Message

```typescript
await sock.sendMessage(jid, {
    order: {
        orderId: 'order-123',
        thumbnail: { url: './order-thumbnail.jpg' },
        itemCount: 3,
        status: 1, // Order status
        surface: 1,
        message: 'Your order has been confirmed',
        orderTitle: 'Order #123',
        sellerJid: 'seller@s.whatsapp.net',
        token: 'order-token',
        totalAmount1000: 29700, // $29.70
        totalCurrencyCode: 'USD'
    }
})
```

## Template Messages

### Button Template

```typescript
await sock.sendMessage(jid, {
    templateMessage: {
        hydratedTemplate: {
            hydratedContentText: 'Choose an option:',
            hydratedButtons: [
                {
                    quickReplyButton: {
                        displayText: 'Option 1',
                        id: 'option_1'
                    }
                },
                {
                    quickReplyButton: {
                        displayText: 'Option 2',
                        id: 'option_2'
                    }
                },
                {
                    urlButton: {
                        displayText: 'Visit Website',
                        url: 'https://example.com'
                    }
                },
                {
                    callButton: {
                        displayText: 'Call Us',
                        phoneNumber: '+1234567890'
                    }
                }
            ]
        }
    }
})
```

### List Template

```typescript
await sock.sendMessage(jid, {
    listMessage: {
        title: 'Choose from menu',
        description: 'Select an item from the list below',
        buttonText: 'View Menu',
        listType: 1,
        sections: [
            {
                title: 'Main Dishes',
                rows: [
                    {
                        title: 'Pizza',
                        description: 'Delicious pizza',
                        rowId: 'pizza'
                    },
                    {
                        title: 'Burger',
                        description: 'Juicy burger',
                        rowId: 'burger'
                    }
                ]
            },
            {
                title: 'Beverages',
                rows: [
                    {
                        title: 'Coke',
                        description: 'Cold drink',
                        rowId: 'coke'
                    }
                ]
            }
        ]
    }
})
```

## Message Utilities

### Get Message Type

```typescript
import { getContentType } from '@whiskeysockets/baileys'

const getMessageType = (message: WAMessage): string => {
    return getContentType(message.message)
}

// Usage
sock.ev.on('messages.upsert', ({ messages }) => {
    messages.forEach(message => {
        const messageType = getMessageType(message)
        console.log('Received message type:', messageType)
        
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
            // ... handle other types
        }
    })
})
```

### Extract Message Content

```typescript
const extractMessageContent = (message: WAMessage): any => {
    const messageType = getContentType(message.message)
    return message.message?.[messageType]
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

---

**Related Pages:**
- [Sending Messages](./sending-messages.md) - How to send messages
- [Receiving Messages](./receiving-messages.md) - How to handle incoming messages
- [Message API Reference](../api-reference/message-api.md) - Complete API documentation
