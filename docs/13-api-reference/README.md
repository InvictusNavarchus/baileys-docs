---
title: API Reference
sidebar_position: 1
description: Comprehensive API documentation for all Baileys functions, types, and interfaces.
keywords: [baileys, api reference, documentation, functions, types, interfaces]
---

# API Reference

This section provides comprehensive API documentation for all Baileys functions, types, and interfaces.

## Core Socket API

### makeWASocket(config)

Creates a new WhatsApp socket connection.

**Parameters:**
- `config: UserFacingSocketConfig` - Socket configuration options

**Returns:** `WASocket` - The socket instance

**Example:**
```typescript
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'

const { state } = await useMultiFileAuthState('auth_info')
const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
})
```

### Socket Configuration

```typescript
interface SocketConfig {
    // Connection settings
    waWebSocketUrl?: string                    // WebSocket URL
    connectTimeoutMs?: number                  // Connection timeout
    keepAliveIntervalMs?: number              // Keep-alive interval
    
    // Authentication
    auth: AuthenticationState                  // Auth state (required)
    
    // Browser settings
    browser?: WABrowserDescription            // Browser identification
    printQRInTerminal?: boolean              // Show QR in terminal
    
    // Features
    emitOwnEvents?: boolean                   // Emit events for own actions
    syncFullHistory?: boolean                 // Sync full message history
    markOnlineOnConnect?: boolean            // Mark as online on connect
    
    // Caching
    userDevicesCache?: CacheStore            // User devices cache
    msgRetryCounterCache?: CacheStore        // Message retry cache
    mediaCache?: CacheStore                  // Media cache
    
    // Callbacks
    getMessage?: GetMessageFunction          // Get message from store
    cachedGroupMetadata?: GetGroupMetadataFunction // Get cached group metadata
    
    // Customization
    patchMessageBeforeSending?: MessagePatcher // Modify messages before sending
    shouldSyncHistoryMessage?: HistoryMessageFilter // Filter history messages
    shouldIgnoreJid?: JidFilter             // Filter JIDs to ignore
    
    // Logging
    logger?: Logger                          // Logger instance
}
```

## Message API

### sendMessage(jid, content, options?)

Sends a message to a chat.

**Parameters:**
- `jid: string` - Chat JID (e.g., '1234567890@s.whatsapp.net')
- `content: AnyMessageContent` - Message content
- `options?: MiscMessageGenerationOptions` - Additional options

**Returns:** `Promise<proto.WebMessageInfo>` - Sent message info

**Examples:**

```typescript
// Text message
await sock.sendMessage(jid, { text: 'Hello!' })

// Image message
await sock.sendMessage(jid, {
    image: { url: './image.jpg' },
    caption: 'Image caption'
})

// Message with options
await sock.sendMessage(jid, { text: 'Hello!' }, {
    quoted: originalMessage,
    ephemeralExpiration: 7 * 24 * 60 * 60 // 7 days
})
```

### Message Content Types

```typescript
type AnyMessageContent = 
    | { text: string }
    | { image: WAMediaUpload; caption?: string }
    | { video: WAMediaUpload; caption?: string; gifPlayback?: boolean }
    | { audio: WAMediaUpload; ptt?: boolean }
    | { document: WAMediaUpload; fileName?: string; mimetype?: string }
    | { location: LocationMessage }
    | { contacts: ContactsArrayMessage }
    | { poll: PollCreationMessage }
    | { react: ReactionMessage }
    | { forward: WAMessage }
    | { delete: WAMessageKey }
    | { edit: WAMessageKey; text: string }
```

### Message Options

```typescript
interface MiscMessageGenerationOptions {
    quoted?: WAMessage                       // Quote another message
    ephemeralExpiration?: number            // Disappearing message timer
    messageId?: string                      // Custom message ID
    additionalAttributes?: { [key: string]: string } // Custom attributes
    statusJidList?: string[]               // Status broadcast recipients
    backgroundColor?: string               // Background color (status)
    font?: number                         // Font style (status)
}
```

## Group Management API

### groupCreate(subject, participants)

Creates a new group.

**Parameters:**
- `subject: string` - Group name
- `participants: string[]` - Array of participant JIDs

**Returns:** `Promise<GroupMetadata>` - Created group metadata

```typescript
const group = await sock.groupCreate('My Group', [
    '1234567890@s.whatsapp.net',
    '0987654321@s.whatsapp.net'
])
```

### groupParticipantsUpdate(jid, participants, action)

Updates group participants.

**Parameters:**
- `jid: string` - Group JID
- `participants: string[]` - Participant JIDs
- `action: ParticipantAction` - 'add' | 'remove' | 'promote' | 'demote'

```typescript
await sock.groupParticipantsUpdate(groupJid, [userJid], 'add')
await sock.groupParticipantsUpdate(groupJid, [userJid], 'promote')
```

### groupMetadata(jid)

Gets group metadata.

**Parameters:**
- `jid: string` - Group JID

**Returns:** `Promise<GroupMetadata>` - Group metadata

```typescript
const metadata = await sock.groupMetadata(groupJid)
console.log('Group name:', metadata.subject)
console.log('Participants:', metadata.participants.length)
```

### Group Management Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `groupUpdateSubject` | Update group name | `(jid, subject)` | `Promise<void>` |
| `groupUpdateDescription` | Update group description | `(jid, description?)` | `Promise<void>` |
| `groupSettingUpdate` | Update group settings | `(jid, setting)` | `Promise<void>` |
| `groupLeave` | Leave a group | `(jid)` | `Promise<void>` |
| `groupInviteCode` | Get invite code | `(jid)` | `Promise<string>` |
| `groupRevokeInvite` | Revoke invite code | `(jid)` | `Promise<string>` |
| `groupAcceptInvite` | Join via invite code | `(code)` | `Promise<string>` |

## Authentication API

### useMultiFileAuthState(folder)

Creates file-based authentication state.

**Parameters:**
- `folder: string` - Folder path for auth files

**Returns:** `Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }>`

```typescript
const { state, saveCreds } = await useMultiFileAuthState('auth_info')
```

### requestPairingCode(phoneNumber)

Requests a pairing code for authentication.

**Parameters:**
- `phoneNumber: string` - Phone number with country code

**Returns:** `Promise<string>` - 8-digit pairing code

```typescript
if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode('+1234567890')
    console.log('Pairing code:', code)
}
```

## Media API

### downloadMediaMessage(message, type?, options?)

Downloads media from a message.

**Parameters:**
- `message: WAMessage` - Message containing media
- `type?: 'buffer' | 'stream'` - Return type (default: 'buffer')
- `options?: DownloadMediaMessageOptions` - Download options

**Returns:** `Promise<Buffer | Transform>` - Media data

```typescript
import { downloadMediaMessage } from '@whiskeysockets/baileys'

const buffer = await downloadMediaMessage(message, 'buffer')
const stream = await downloadMediaMessage(message, 'stream')
```

### Media Upload Types

```typescript
type WAMediaUpload = 
    | { url: string }                       // File path or URL
    | { stream: Readable }                  // Stream
    | Buffer                               // Buffer
    | Uint8Array                          // Uint8Array
```

## Event API

### Event Types

```typescript
interface BaileysEventMap {
    'connection.update': ConnectionState
    'creds.update': void
    'messages.upsert': { messages: WAMessage[], type: MessageUpsertType }
    'messages.update': WAMessageUpdate[]
    'messages.delete': { keys: WAMessageKey[] }
    'message-receipt.update': MessageUserReceiptUpdate[]
    'chats.upsert': Chat[]
    'chats.update': ChatUpdate[]
    'chats.delete': string[]
    'presence.update': { id: string, presences: { [participant: string]: PresenceData } }
    'contacts.upsert': Contact[]
    'contacts.update': Partial<Contact>[]
    'groups.upsert': GroupMetadata[]
    'groups.update': Partial<GroupMetadata>[]
    'group-participants.update': {
        id: string
        participants: string[]
        action: ParticipantAction
        author?: string
    }
    'blocklist.set': { blocklist: string[] }
    'blocklist.update': { blocklist: string[], type: 'add' | 'remove' }
    'call': WACallEvent[]
    'labels.edit': Label
    'labels.association': {
        association: LabelAssociation
        type: 'add' | 'remove'
    }
}
```

### Event Handling

```typescript
// Connection events
sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update
    // Handle connection state changes
})

// Message events
sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type === 'notify') {
        for (const message of messages) {
            // Process new messages
        }
    }
})

// Group events
sock.ev.on('groups.update', (updates) => {
    for (const update of updates) {
        // Handle group updates
    }
})
```

## Utility Functions

### JID Utilities

```typescript
import { 
    jidNormalizedUser,
    jidDecode,
    jidEncode,
    areJidsSameUser,
    isJidGroup,
    isJidBroadcast,
    isJidNewsletter
} from '@whiskeysockets/baileys'

// Normalize JID
const normalizedJid = jidNormalizedUser('1234567890@s.whatsapp.net')

// Decode JID
const decoded = jidDecode('1234567890@s.whatsapp.net')
// { user: '1234567890', server: 's.whatsapp.net' }

// Encode JID
const encoded = jidEncode('1234567890', 's.whatsapp.net')

// Check JID types
const isGroup = isJidGroup(jid)
const isBroadcast = isJidBroadcast(jid)
const isNewsletter = isJidNewsletter(jid)
```

### Message Utilities

```typescript
import {
    getContentType,
    getDevice,
    generateMessageIDV2,
    unixTimestampSeconds
} from '@whiskeysockets/baileys'

// Get message content type
const contentType = getContentType(message.message)

// Get device info
const device = getDevice(message)

// Generate message ID
const messageId = generateMessageIDV2()

// Get Unix timestamp
const timestamp = unixTimestampSeconds()
```

### Crypto Utilities

```typescript
import {
    generateSignalPubKey,
    generateRegistrationId,
    Curve
} from '@whiskeysockets/baileys'

// Generate key pair
const keyPair = Curve.generateKeyPair()

// Generate registration ID
const registrationId = generateRegistrationId()

// Generate public key
const pubKey = generateSignalPubKey(privateKey)
```

## Type Definitions

### Core Types

```typescript
// Message types
interface WAMessage {
    key: WAMessageKey
    message?: WAMessageContent
    messageTimestamp?: number
    status?: WAMessageStatus
    participant?: string
    pushName?: string
}

interface WAMessageKey {
    remoteJid?: string
    fromMe?: boolean
    id?: string
    participant?: string
}

// Connection types
interface ConnectionState {
    connection: WAConnectionState
    lastDisconnect?: {
        error: Error | undefined
        date: Date
    }
    isNewLogin?: boolean
    qr?: string
    receivedPendingNotifications?: boolean
}

// Group types
interface GroupMetadata {
    id: string
    owner: string | undefined
    subject: string
    creation?: number
    participants: GroupParticipant[]
    size?: number
    restrict?: boolean
    announce?: boolean
    // ... more properties
}

// Contact types
interface Contact {
    id: string
    lid?: string
    name?: string
    notify?: string
    verifiedName?: string
    imgUrl?: string | null
    status?: string
}
```

### Enums

```typescript
enum DisconnectReason {
    connectionClosed = 428,
    connectionLost = 408,
    connectionReplaced = 440,
    timedOut = 408,
    loggedOut = 401,
    badSession = 500,
    restartRequired = 515,
    multideviceMismatch = 411
}

enum WAMessageStatus {
    ERROR = 0,
    PENDING = 1,
    SERVER_ACK = 2,
    DELIVERY_ACK = 3,
    READ = 4,
    PLAYED = 5
}

type MessageUpsertType = 'append' | 'notify'
type ParticipantAction = 'add' | 'remove' | 'promote' | 'demote'
type WAConnectionState = 'open' | 'connecting' | 'close'
```

## Error Handling

### Common Errors

```typescript
import { Boom } from '@hapi/boom'

try {
    await sock.sendMessage(jid, content)
} catch (error) {
    if (error instanceof Boom) {
        switch (error.output.statusCode) {
            case 401:
                console.log('Authentication failed')
                break
            case 403:
                console.log('Forbidden - insufficient permissions')
                break
            case 404:
                console.log('Chat not found')
                break
            case 500:
                console.log('Internal server error')
                break
        }
    }
}
```

### Disconnect Reasons

```typescript
sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
        
        switch (statusCode) {
            case DisconnectReason.badSession:
                // Bad session file, need to re-authenticate
                break
            case DisconnectReason.connectionClosed:
                // Connection closed, can reconnect
                break
            case DisconnectReason.loggedOut:
                // Logged out, need manual re-authentication
                break
            case DisconnectReason.restartRequired:
                // Restart required
                break
        }
    }
})
```

## Next Steps

- **[Socket API](./socket-api.md)**: Detailed socket methods
- **[Message API](./message-api.md)**: Complete message API reference
- **[Group API](./group-api.md)**: Group management API
- **[Types](./types.md)**: Complete type definitions

---

> **Note**: This API reference covers the most commonly used functions. For the complete API, refer to the TypeScript definitions in the library.
