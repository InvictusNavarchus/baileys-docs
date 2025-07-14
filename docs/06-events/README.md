---
id: events
title: Event Handling
sidebar_position: 6
description: Complete guide to handling WhatsApp events with Baileys event system.
keywords: [baileys, events, event handling, websocket events, message events, connection events]
---

# Event Handling

Baileys uses an event-driven architecture to handle real-time WhatsApp events. This guide covers all available events and how to handle them effectively.

## Event System Overview

Baileys uses Node.js EventEmitter to emit events for various WhatsApp activities:

```typescript
import makeWASocket from '@whiskeysockets/baileys'

const sock = makeWASocket({ /* config */ })

// Listen to events
sock.ev.on('connection.update', (update) => {
    console.log('Connection update:', update)
})

sock.ev.on('messages.upsert', ({ messages, type }) => {
    console.log('New messages:', messages)
})
```

## Core Events

### Connection Events

#### connection.update
Fired when the connection state changes.

```typescript
sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr, isNewLogin } = update
    
    if (connection === 'close') {
        // Handle disconnection
        console.log('Connection closed:', lastDisconnect?.error)
    } else if (connection === 'open') {
        // Handle successful connection
        console.log('Connected to WhatsApp!')
    } else if (connection === 'connecting') {
        console.log('Connecting to WhatsApp...')
    }
    
    if (qr) {
        // QR code for authentication
        console.log('QR Code:', qr)
    }
    
    if (isNewLogin) {
        console.log('New login detected')
    }
})
```

#### creds.update
Fired when authentication credentials are updated.

```typescript
sock.ev.on('creds.update', () => {
    // Save credentials to persistent storage
    saveCreds()
})
```

### Message Events

#### messages.upsert
Fired when new messages are received or message history is synced.

```typescript
sock.ev.on('messages.upsert', ({ messages, type }) => {
    console.log('Message type:', type) // 'notify' | 'append'
    
    for (const message of messages) {
        if (!message.key.fromMe && type === 'notify') {
            // Handle incoming message
            console.log('New message from:', message.key.remoteJid)
            console.log('Message:', message.message)
        }
    }
})
```

#### messages.update
Fired when existing messages are updated (edited, deleted, etc.).

```typescript
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
```

#### messages.delete
Fired when messages are deleted.

```typescript
sock.ev.on('messages.delete', ({ keys }) => {
    for (const key of keys) {
        console.log('Message deleted:', key.id)
        // Remove from local storage
    }
})
```

#### message-receipt.update
Fired when message read/delivery receipts are received.

```typescript
sock.ev.on('message-receipt.update', (receipts) => {
    for (const receipt of receipts) {
        console.log('Receipt for message:', receipt.key.id)
        console.log('Receipt type:', receipt.receipt.readTimestamp ? 'read' : 'delivered')
    }
})
```

### Chat Events

#### chats.upsert
Fired when new chats are created or chat list is synced.

```typescript
sock.ev.on('chats.upsert', (chats) => {
    for (const chat of chats) {
        console.log('Chat:', chat.id)
        console.log('Unread count:', chat.unreadCount)
        console.log('Last message time:', chat.conversationTimestamp)
    }
})
```

#### chats.update
Fired when chat properties are updated.

```typescript
sock.ev.on('chats.update', (updates) => {
    for (const update of updates) {
        console.log('Chat updated:', update.id)
        
        if (update.unreadCount !== undefined) {
            console.log('New unread count:', update.unreadCount)
        }
        
        if (update.archived !== undefined) {
            console.log('Archive status:', update.archived)
        }
    }
})
```

#### chats.delete
Fired when chats are deleted.

```typescript
sock.ev.on('chats.delete', (deletedChats) => {
    for (const chatId of deletedChats) {
        console.log('Chat deleted:', chatId)
        // Clean up local data
    }
})
```

### Contact Events

#### contacts.upsert
Fired when contacts are added or updated.

```typescript
sock.ev.on('contacts.upsert', (contacts) => {
    for (const contact of contacts) {
        console.log('Contact:', contact.id)
        console.log('Name:', contact.name || contact.notify)
        console.log('Status:', contact.status)
    }
})
```

#### contacts.update
Fired when contact information is updated.

```typescript
sock.ev.on('contacts.update', (updates) => {
    for (const update of updates) {
        console.log('Contact updated:', update.id)
        
        if (update.status) {
            console.log('New status:', update.status)
        }
        
        if (update.name) {
            console.log('New name:', update.name)
        }
    }
})
```

### Group Events

#### groups.upsert
Fired when group information is received.

```typescript
sock.ev.on('groups.upsert', (groups) => {
    for (const group of groups) {
        console.log('Group:', group.id)
        console.log('Subject:', group.subject)
        console.log('Participants:', group.participants.length)
    }
})
```

#### groups.update
Fired when group metadata is updated.

```typescript
sock.ev.on('groups.update', (updates) => {
    for (const update of updates) {
        console.log('Group updated:', update.id)
        
        if (update.subject) {
            console.log('New subject:', update.subject)
        }
        
        if (update.desc) {
            console.log('New description:', update.desc)
        }
        
        if (update.announce !== undefined) {
            console.log('Announcement mode:', update.announce)
        }
    }
})
```

#### group-participants.update
Fired when group participants are added, removed, or their roles change.

```typescript
sock.ev.on('group-participants.update', ({ id, participants, action, author }) => {
    console.log(`Group ${id}: ${action} ${participants.join(', ')}`)
    
    switch (action) {
        case 'add':
            console.log('New members added by:', author)
            break
        case 'remove':
            console.log('Members removed by:', author)
            break
        case 'promote':
            console.log('Members promoted to admin by:', author)
            break
        case 'demote':
            console.log('Members demoted from admin by:', author)
            break
    }
})
```

### Presence Events

#### presence.update
Fired when user presence (online/offline/typing) changes.

```typescript
sock.ev.on('presence.update', ({ id, presences }) => {
    console.log('Presence update for:', id)
    
    for (const [participant, presence] of Object.entries(presences)) {
        console.log(`${participant}: ${presence.lastKnownPresence}`)
        
        if (presence.lastSeen) {
            console.log('Last seen:', new Date(presence.lastSeen * 1000))
        }
    }
})
```

### Other Events

#### blocklist.set
Fired when the blocklist is initially loaded.

```typescript
sock.ev.on('blocklist.set', ({ blocklist }) => {
    console.log('Blocked contacts:', blocklist)
})
```

#### blocklist.update
Fired when contacts are blocked or unblocked.

```typescript
sock.ev.on('blocklist.update', ({ blocklist, type }) => {
    console.log(`Blocklist ${type}:`, blocklist)
})
```

#### call
Fired when calls are received.

```typescript
sock.ev.on('call', (calls) => {
    for (const call of calls) {
        console.log('Call from:', call.from)
        console.log('Call status:', call.status)
        
        if (call.status === 'offer') {
            // Incoming call
            console.log('Incoming call')
        }
    }
})
```

## Event Handling Patterns

### Event Router

```typescript
class EventRouter {
    private handlers = new Map<string, Function[]>()
    
    on(event: string, handler: Function) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, [])
        }
        this.handlers.get(event)!.push(handler)
    }
    
    emit(event: string, ...args: any[]) {
        const handlers = this.handlers.get(event) || []
        handlers.forEach(handler => {
            try {
                handler(...args)
            } catch (error) {
                console.error(`Error in ${event} handler:`, error)
            }
        })
    }
    
    setupBaileysEvents(sock: any) {
        // Route all Baileys events through our router
        const events = [
            'connection.update',
            'creds.update',
            'messages.upsert',
            'messages.update',
            'messages.delete',
            'message-receipt.update',
            'chats.upsert',
            'chats.update',
            'chats.delete',
            'contacts.upsert',
            'contacts.update',
            'groups.upsert',
            'groups.update',
            'group-participants.update',
            'presence.update',
            'blocklist.set',
            'blocklist.update',
            'call'
        ]
        
        events.forEach(event => {
            sock.ev.on(event, (...args: any[]) => {
                this.emit(event, ...args)
            })
        })
    }
}

// Usage
const router = new EventRouter()
router.setupBaileysEvents(sock)

router.on('messages.upsert', ({ messages, type }) => {
    // Handle messages
})

router.on('connection.update', (update) => {
    // Handle connection updates
})
```

### Async Event Handler

```typescript
class AsyncEventHandler {
    private queue: Array<{ event: string, data: any }> = []
    private processing = false
    
    async handle(event: string, data: any) {
        this.queue.push({ event, data })
        
        if (!this.processing) {
            this.processQueue()
        }
    }
    
    private async processQueue() {
        this.processing = true
        
        while (this.queue.length > 0) {
            const { event, data } = this.queue.shift()!
            
            try {
                await this.processEvent(event, data)
            } catch (error) {
                console.error(`Error processing ${event}:`, error)
            }
        }
        
        this.processing = false
    }
    
    private async processEvent(event: string, data: any) {
        switch (event) {
            case 'messages.upsert':
                await this.handleMessages(data)
                break
            case 'groups.update':
                await this.handleGroupUpdates(data)
                break
            // Add more event handlers
        }
    }
    
    private async handleMessages({ messages, type }: any) {
        for (const message of messages) {
            if (type === 'notify' && !message.key.fromMe) {
                // Process message asynchronously
                await this.processMessage(message)
            }
        }
    }
    
    private async processMessage(message: any) {
        // Simulate async processing
        await new Promise(resolve => setTimeout(resolve, 100))
        console.log('Processed message:', message.key.id)
    }
    
    private async handleGroupUpdates(updates: any[]) {
        for (const update of updates) {
            // Process group update
            console.log('Processing group update:', update.id)
        }
    }
}

// Usage
const asyncHandler = new AsyncEventHandler()

sock.ev.on('messages.upsert', (data) => {
    asyncHandler.handle('messages.upsert', data)
})

sock.ev.on('groups.update', (data) => {
    asyncHandler.handle('groups.update', data)
})
```

### Event Persistence

```typescript
class EventPersistence {
    private db: any // Your database connection
    
    async saveMessage(message: any) {
        await this.db.query(
            'INSERT INTO messages (id, chat_id, sender, content, timestamp) VALUES ($1, $2, $3, $4, $5)',
            [
                message.key.id,
                message.key.remoteJid,
                message.key.participant || message.key.remoteJid,
                JSON.stringify(message.message),
                message.messageTimestamp
            ]
        )
    }
    
    async updateMessage(messageId: string, updates: any) {
        await this.db.query(
            'UPDATE messages SET content = $1, updated_at = NOW() WHERE id = $2',
            [JSON.stringify(updates), messageId]
        )
    }
    
    async deleteMessage(messageId: string) {
        await this.db.query('DELETE FROM messages WHERE id = $1', [messageId])
    }
    
    async saveChat(chat: any) {
        await this.db.query(
            'INSERT INTO chats (id, name, unread_count, last_message_time) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = $2, unread_count = $3, last_message_time = $4',
            [chat.id, chat.name, chat.unreadCount, chat.conversationTimestamp]
        )
    }
    
    setupEventPersistence(sock: any) {
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type === 'notify') {
                for (const message of messages) {
                    await this.saveMessage(message)
                }
            }
        })
        
        sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                await this.updateMessage(update.key.id, update.update)
            }
        })
        
        sock.ev.on('messages.delete', async ({ keys }) => {
            for (const key of keys) {
                await this.deleteMessage(key.id)
            }
        })
        
        sock.ev.on('chats.upsert', async (chats) => {
            for (const chat of chats) {
                await this.saveChat(chat)
            }
        })
    }
}
```

## Best Practices

### 1. Error Handling
Always wrap event handlers in try-catch blocks to prevent crashes.

### 2. Async Processing
Use async handlers for time-consuming operations to avoid blocking.

### 3. Event Filtering
Filter events based on your application needs to reduce processing overhead.

### 4. Memory Management
Clean up old event data to prevent memory leaks.

### 5. Logging
Log important events for debugging and monitoring.

---

**Related Pages:**
- [Messages](../05-messages/README.md) - Message handling
- [Architecture](../03-architecture/README.md) - System architecture
