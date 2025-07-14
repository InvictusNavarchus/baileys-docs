---
title: Frequently Asked Questions (FAQ)
sidebar_position: 1
description: Answers to the most common questions about Baileys, WhatsApp bots, and troubleshooting.
keywords: [baileys, faq, frequently asked questions, whatsapp, bot, troubleshooting]
---

# Frequently Asked Questions (FAQ)

This section answers the most common questions about Baileys. If you don't find your answer here, check the [Troubleshooting Guide](../14-troubleshooting/README.md) or ask in our [Discord community](https://discord.gg/WeJM5FP9GG).

## General Questions

### Q: What is Baileys?
**A:** Baileys is a TypeScript/JavaScript library that allows you to interact with WhatsApp Web without using a browser. It implements the WhatsApp Web protocol directly, enabling you to build WhatsApp bots and automation tools.

### Q: Is Baileys legal to use?
**A:** Baileys itself is legal, but you must comply with WhatsApp's Terms of Service. Avoid spam, respect user privacy, and don't use it for malicious purposes. Always get user consent before automating interactions.

### Q: Does Baileys work with WhatsApp Business API?
**A:** No, Baileys works with WhatsApp Web, not the official WhatsApp Business API. It's designed for personal WhatsApp accounts and WhatsApp Business app accounts.

### Q: Can I use Baileys for commercial purposes?
**A:** Yes, Baileys is MIT licensed, but ensure you comply with WhatsApp's Terms of Service and applicable laws in your jurisdiction.

## Installation & Setup

### Q: What Node.js version do I need?
**A:** Node.js 20.0.0 or higher is required. We recommend using the latest LTS version.

### Q: Why do I get "engine-requirements.js" errors?
**A:** This usually means your Node.js version is too old. Update to Node.js 20.0.0 or higher:
```bash
# Using nvm
nvm install 20
nvm use 20

# Verify version
node --version
```

### Q: Can I use Baileys with JavaScript instead of TypeScript?
**A:** Yes! While Baileys is written in TypeScript, you can use it in plain JavaScript:
```javascript
const makeWASocket = require('@whiskeysockets/baileys').default
const { useMultiFileAuthState } = require('@whiskeysockets/baileys')

// Your JavaScript code here
```

### Q: Do I need to install additional dependencies?
**A:** Some features require optional peer dependencies:
- **Media processing**: `sharp` or `jimp`
- **Link previews**: `link-preview-js`
- **Audio processing**: `audio-decode`

## Authentication

### Q: How do I authenticate without scanning QR codes every time?
**A:** Use session persistence with `useMultiFileAuthState`:
```typescript
const { state, saveCreds } = await useMultiFileAuthState('auth_info')
const sock = makeWASocket({ auth: state })
sock.ev.on('creds.update', saveCreds)
```

### Q: Can I use pairing codes instead of QR codes?
**A:** Yes, for phone number-based authentication:
```typescript
const sock = makeWASocket({ printQRInTerminal: false })

if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode('1234567890')
    console.log('Pairing code:', code)
}
```

### Q: How many devices can I link to one WhatsApp account?
**A:** WhatsApp allows up to 4 linked devices per account. If you exceed this limit, older devices will be automatically logged out.

### Q: My session keeps expiring. What should I do?
**A:** This can happen due to:
- Corrupted session files
- WhatsApp security measures
- Multiple devices competing for the same session

Try clearing your auth folder and re-authenticating.

## Messages

### Q: How do I send different types of messages?
**A:** Baileys supports all WhatsApp message types:
```typescript
// Text
await sock.sendMessage(jid, { text: 'Hello!' })

// Image
await sock.sendMessage(jid, { 
    image: { url: './image.jpg' }, 
    caption: 'Caption' 
})

// Document
await sock.sendMessage(jid, { 
    document: { url: './file.pdf' },
    fileName: 'document.pdf',
    mimetype: 'application/pdf'
})
```

### Q: Can I send messages to multiple people at once?
**A:** Yes, but be careful about rate limiting:
```typescript
const recipients = ['user1@s.whatsapp.net', 'user2@s.whatsapp.net']

for (const jid of recipients) {
    await sock.sendMessage(jid, { text: 'Broadcast message' })
    await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
}
```

### Q: How do I handle message reactions?
**A:** Listen for message updates and check for reactions:
```typescript
sock.ev.on('messages.update', (updates) => {
    for (const update of updates) {
        if (update.update.reactions) {
            console.log('Reactions:', update.update.reactions)
        }
    }
})
```

### Q: Can I edit or delete messages?
**A:** Yes, for messages you sent:
```typescript
// Edit message
await sock.sendMessage(jid, {
    text: 'Updated text',
    edit: messageKey
})

// Delete message
await sock.sendMessage(jid, {
    delete: messageKey
})
```

## Groups

### Q: How do I create and manage groups?
**A:** Use the group management functions:
```typescript
// Create group
const group = await sock.groupCreate('Group Name', [
    'user1@s.whatsapp.net',
    'user2@s.whatsapp.net'
])

// Add participants
await sock.groupParticipantsUpdate(groupJid, [userJid], 'add')

// Make admin
await sock.groupParticipantsUpdate(groupJid, [userJid], 'promote')
```

### Q: Can my bot be an admin in groups?
**A:** Your bot can be made an admin by existing group admins, just like any other participant.

### Q: How do I handle group events?
**A:** Listen for group-related events:
```typescript
sock.ev.on('groups.update', (updates) => {
    // Group metadata changes
})

sock.ev.on('group-participants.update', (update) => {
    // Participant additions/removals
})
```

## Media

### Q: What media formats are supported?
**A:** WhatsApp supports:
- **Images**: JPEG, PNG, WebP
- **Videos**: MP4, 3GP, MOV
- **Audio**: MP3, OGG, AAC, M4A
- **Documents**: PDF, DOC, XLS, PPT, etc.

### Q: How do I download media from messages?
**A:** Use the `downloadMediaMessage` function:
```typescript
import { downloadMediaMessage } from '@whiskeysockets/baileys'

const buffer = await downloadMediaMessage(message, 'buffer')
const stream = await downloadMediaMessage(message, 'stream')
```

### Q: Why do media downloads fail?
**A:** Common reasons:
- Media expired (WhatsApp removes old media)
- Network issues
- Insufficient permissions

Try using the `reuploadRequest` option:
```typescript
const buffer = await downloadMediaMessage(
    message,
    'buffer',
    {},
    { reuploadRequest: sock.updateMediaMessage }
)
```

## Performance & Scaling

### Q: Can I run multiple bots on the same server?
**A:** Yes, but each bot needs its own authentication state and phone number. Use different auth folders for each bot.

### Q: How do I handle high message volumes?
**A:** Implement message queuing and rate limiting:
```typescript
const messageQueue = []
const processQueue = async () => {
    while (messageQueue.length > 0) {
        const message = messageQueue.shift()
        await processMessage(message)
        await new Promise(resolve => setTimeout(resolve, 100)) // Rate limit
    }
}
```

### Q: Should I use a database for message storage?
**A:** For production applications, yes. Implement a custom auth state that uses your database instead of files.

## Errors & Debugging

### Q: What does "Connection closed due to 428" mean?
**A:** This is a normal connection closure. Implement reconnection logic:
```typescript
sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
        if (shouldReconnect) {
            connectToWhatsApp() // Reconnect
        }
    }
})
```

### Q: How do I enable debug logging?
**A:** Use a logger with debug level:
```typescript
import P from 'pino'

const logger = P({ level: 'debug' })
const sock = makeWASocket({
    logger: logger.child({ class: 'baileys' })
})
```

### Q: My bot stops working after some time. Why?
**A:** Common causes:
- Memory leaks (implement proper cleanup)
- Unhandled promise rejections
- Connection issues (implement reconnection)
- Session expiration

## Business Features

### Q: Can I use Baileys with WhatsApp Business accounts?
**A:** Yes, Baileys works with both personal and WhatsApp Business app accounts.

### Q: How do I access business features like catalogs?
**A:** Use the business socket methods:
```typescript
const catalog = await sock.getCatalog(businessJid)
const businessProfile = await sock.getBusinessProfile(businessJid)
```

### Q: Can I send product messages?
**A:** Yes, if you have access to a business catalog:
```typescript
await sock.sendMessage(jid, {
    product: {
        productId: 'product-id',
        businessOwnerJid: 'business@s.whatsapp.net'
    }
})
```

## Deployment

### Q: Can I deploy Baileys to cloud platforms?
**A:** Yes, but consider:
- **Heroku**: Works but may have connection issues due to dyno cycling
- **AWS/GCP/Azure**: Recommended for production
- **VPS**: Good balance of control and cost

### Q: How do I handle session persistence in cloud deployments?
**A:** Use external storage:
- Database (PostgreSQL, MongoDB)
- Cloud storage (AWS S3, Google Cloud Storage)
- Redis for caching

### Q: Should I use Docker?
**A:** Yes, Docker provides consistency across environments:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## Legal & Compliance

### Q: What are WhatsApp's usage limits?
**A:** WhatsApp doesn't publish specific limits, but avoid:
- Sending too many messages too quickly
- Spamming users
- Automated messaging without consent

### Q: How do I comply with GDPR/privacy laws?
**A:** 
- Get explicit user consent
- Implement data deletion mechanisms
- Store minimal user data
- Provide privacy notices

### Q: Can WhatsApp ban my number?
**A:** Yes, if you violate their Terms of Service. To minimize risk:
- Don't spam
- Respect user preferences
- Use reasonable rate limits
- Don't use for bulk messaging

## Advanced Usage

### Q: Can I customize the browser identification?
**A:** Yes, use the browser configuration:
```typescript
import { Browsers } from '@whiskeysockets/baileys'

const sock = makeWASocket({
    browser: Browsers.ubuntu('My Custom Bot')
})
```

### Q: How do I implement custom functionality?
**A:** You can register custom WebSocket event handlers:
```typescript
sock.ws.on('CB:custom_event', (node) => {
    // Handle custom events
})
```

### Q: Can I modify messages before sending?
**A:** Yes, use the `patchMessageBeforeSending` option:
```typescript
const sock = makeWASocket({
    patchMessageBeforeSending: (msg) => {
        // Modify message before sending
        return msg
    }
})
```

## Getting Help

### Q: Where can I get help if I'm stuck?
**A:** 
1. Check this FAQ and the [Troubleshooting Guide](../14-troubleshooting/README.md)
2. Search [GitHub Issues](https://github.com/WhiskeySockets/Baileys/issues)
3. Join our [Discord community](https://discord.gg/WeJM5FP9GG)
4. Create a new GitHub issue with detailed information

### Q: How do I report bugs?
**A:** Create a GitHub issue with:
- Baileys version
- Node.js version
- Operating system
- Complete error message
- Minimal code to reproduce

### Q: Can I contribute to Baileys?
**A:** Yes! Contributions are welcome:
- Report bugs
- Submit pull requests
- Improve documentation
- Help other users in Discord

---

> **Still have questions?** Join our [Discord community](https://discord.gg/WeJM5FP9GG) where the community and maintainers can help you directly.
