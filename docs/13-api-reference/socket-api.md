---
id: socket-api
title: Socket API Reference
sidebar_position: 2
description: Detailed reference for Baileys socket methods and configuration options.
keywords: [baileys, socket api, websocket, connection, configuration]
---

# Socket API Reference

This page provides detailed documentation for the Baileys socket API, including all methods, configuration options, and event handling.

## Socket Creation

### makeWASocket(config)

Creates a new WhatsApp socket connection with the specified configuration.

```typescript
import makeWASocket, { UserFacingSocketConfig } from '@whiskeysockets/baileys'

const sock = makeWASocket(config)
```

**Parameters:**
- `config: UserFacingSocketConfig` - Socket configuration object

**Returns:** `WASocket` - The socket instance

## Configuration Options

### Basic Configuration

```typescript
interface UserFacingSocketConfig {
    // Required
    auth: AuthenticationState
    
    // Connection
    waWebSocketUrl?: string
    connectTimeoutMs?: number
    keepAliveIntervalMs?: number
    
    // Browser identification
    browser?: WABrowserDescription
    printQRInTerminal?: boolean
    
    // Features
    emitOwnEvents?: boolean
    syncFullHistory?: boolean
    markOnlineOnConnect?: boolean
    
    // Logging
    logger?: Logger
}
```

### Advanced Configuration

```typescript
interface SocketConfig extends UserFacingSocketConfig {
    // Caching
    userDevicesCache?: CacheStore
    msgRetryCounterCache?: CacheStore
    mediaCache?: CacheStore
    
    // Message handling
    getMessage?: GetMessageFunction
    cachedGroupMetadata?: GetGroupMetadataFunction
    patchMessageBeforeSending?: MessagePatcher
    shouldSyncHistoryMessage?: HistoryMessageFilter
    shouldIgnoreJid?: JidFilter
    
    // Network
    retryRequestDelayMs?: number
    maxMsgRetryCount?: number
    fireInitQueries?: boolean
    
    // Media
    generateHighQualityLinkPreview?: boolean
    options?: AxiosRequestConfig
}
```

## Socket Methods

### Connection Management

#### connect()
Establishes connection to WhatsApp servers.

```typescript
await sock.connect()
```

#### end(error?)
Closes the socket connection.

```typescript
sock.end()
sock.end(new Error('Manual disconnect'))
```

#### logout()
Logs out and invalidates the session.

```typescript
await sock.logout()
```

### Authentication

#### requestPairingCode(phoneNumber)
Requests a pairing code for phone number authentication.

```typescript
const code = await sock.requestPairingCode('+1234567890')
console.log('Pairing code:', code)
```

#### requestRegistrationCode(phoneNumber)
Requests registration code for new accounts.

```typescript
const result = await sock.requestRegistrationCode({
    phoneNumber: '+1234567890',
    phoneNumberCountryCode: '1',
    phoneNumberNationalNumber: '234567890',
    method: 'sms'
})
```

### Message Operations

#### sendMessage(jid, content, options?)
Sends a message to the specified chat.

```typescript
const messageInfo = await sock.sendMessage(jid, content, options)
```

#### sendPresenceUpdate(type, jid?)
Updates presence status.

```typescript
await sock.sendPresenceUpdate('available')
await sock.sendPresenceUpdate('composing', jid)
await sock.sendPresenceUpdate('paused', jid)
```

#### readMessages(keys)
Marks messages as read.

```typescript
await sock.readMessages([messageKey])
```

#### sendReceipt(jid, participant?, messageIds, receiptType)
Sends read/delivery receipts.

```typescript
await sock.sendReceipt(jid, undefined, [messageId], 'read')
```

### Chat Management

#### chatModify(modification, jid, chatInfo?)
Modifies chat properties.

```typescript
// Archive chat
await sock.chatModify({ archive: true }, jid)

// Unarchive chat
await sock.chatModify({ archive: false }, jid)

// Pin chat
await sock.chatModify({ pin: true }, jid)

// Mute chat
await sock.chatModify({ 
    mute: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
}, jid)
```

#### updateProfilePicture(jid, content)
Updates profile picture.

```typescript
import { readFileSync } from 'fs'

const image = readFileSync('./profile.jpg')
await sock.updateProfilePicture(jid, image)
```

#### updateProfileStatus(status)
Updates profile status message.

```typescript
await sock.updateProfileStatus('Hello, I am using Baileys!')
```

#### updateProfileName(name)
Updates profile display name.

```typescript
await sock.updateProfileName('My Bot Name')
```

### Contact Operations

#### onWhatsApp(jids)
Checks if phone numbers are on WhatsApp.

```typescript
const results = await sock.onWhatsApp(['+1234567890', '+0987654321'])
results.forEach(result => {
    console.log(`${result.jid}: ${result.exists ? 'exists' : 'not found'}`)
})
```

#### fetchStatus(jid)
Fetches contact status message.

```typescript
const status = await sock.fetchStatus(jid)
console.log('Status:', status.status)
```

#### fetchBlocklist()
Fetches the current blocklist.

```typescript
const blocklist = await sock.fetchBlocklist()
```

#### updateBlockStatus(jid, action)
Blocks or unblocks a contact.

```typescript
await sock.updateBlockStatus(jid, 'block')
await sock.updateBlockStatus(jid, 'unblock')
```

### Business Features

#### getBusinessProfile(jid)
Gets business profile information.

```typescript
const profile = await sock.getBusinessProfile(jid)
```

#### getCatalog(jid, limit?)
Gets business catalog.

```typescript
const catalog = await sock.getCatalog(jid, 50)
```

#### getCollections(jid, limit?)
Gets business collections.

```typescript
const collections = await sock.getCollections(jid, 10)
```

#### productUpdate(jid, product)
Updates a business product.

```typescript
await sock.productUpdate(jid, {
    product: updatedProduct
})
```

### Newsletter Features

#### subscribeToNewsLetter(jid)
Subscribes to a newsletter.

```typescript
await sock.subscribeToNewsLetter(newsletterJid)
```

#### unsubscribeToNewsLetter(jid)
Unsubscribes from a newsletter.

```typescript
await sock.unsubscribeToNewsLetter(newsletterJid)
```

#### newsletterMetadata(type, jid, count?)
Gets newsletter metadata.

```typescript
const metadata = await sock.newsletterMetadata('invite', newsletterJid)
```

## Socket Properties

### Connection State

```typescript
interface WASocket {
    // Connection info
    ws: WebSocket
    ev: EventEmitter
    authState: AuthenticationState
    user?: Contact
    
    // State
    isOnline: boolean
    msgCount: number
    
    // Configuration
    config: SocketConfig
    
    // Methods (see above)
    // ...
}
```

### Event Emitter

The socket includes an event emitter (`sock.ev`) for handling real-time events:

```typescript
// Connection events
sock.ev.on('connection.update', handler)
sock.ev.on('creds.update', handler)

// Message events  
sock.ev.on('messages.upsert', handler)
sock.ev.on('messages.update', handler)
sock.ev.on('messages.delete', handler)

// Chat events
sock.ev.on('chats.upsert', handler)
sock.ev.on('chats.update', handler)
sock.ev.on('chats.delete', handler)

// Contact events
sock.ev.on('contacts.upsert', handler)
sock.ev.on('contacts.update', handler)

// Group events
sock.ev.on('groups.upsert', handler)
sock.ev.on('groups.update', handler)
sock.ev.on('group-participants.update', handler)

// Other events
sock.ev.on('presence.update', handler)
sock.ev.on('blocklist.set', handler)
sock.ev.on('blocklist.update', handler)
sock.ev.on('call', handler)
```

## Error Handling

### Connection Errors

```typescript
sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
        
        if (shouldReconnect) {
            // Reconnect logic
        }
    }
})
```

### Method Errors

```typescript
try {
    await sock.sendMessage(jid, content)
} catch (error) {
    if (error.output?.statusCode === 404) {
        console.log('Chat not found')
    } else if (error.output?.statusCode === 403) {
        console.log('Forbidden - insufficient permissions')
    }
}
```

## Best Practices

### 1. Always Handle Connection Events

```typescript
sock.ev.on('connection.update', (update) => {
    // Always handle connection state changes
})
```

### 2. Save Credentials

```typescript
sock.ev.on('creds.update', saveCreds)
```

### 3. Implement Proper Error Handling

```typescript
const sendMessageSafely = async (jid, content) => {
    try {
        if (sock.ws.readyState !== sock.ws.OPEN) {
            throw new Error('Socket not connected')
        }
        return await sock.sendMessage(jid, content)
    } catch (error) {
        console.error('Failed to send message:', error)
        throw error
    }
}
```

### 4. Use Appropriate Timeouts

```typescript
const sock = makeWASocket({
    auth: state,
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 10_000
})
```

---

For more specific API documentation, see:
- [Message API](./message-api.md)
- [Group API](./group-api.md)
- [Types](./types.md)
