---
title: Quick Start Guide
sidebar_position: 2
description: Get your first WhatsApp bot running in just 5 minutes! Create a simple echo bot that responds to messages.
keywords: [baileys, quick start, echo bot, whatsapp bot, tutorial]
---

# Quick Start Guide

Get your first WhatsApp bot running in just 5 minutes! This guide will walk you through creating a simple echo bot that responds to messages.

## Step 1: Create Your Bot File

Create a new file `src/index.ts` (or `index.js` if not using TypeScript):

```typescript
import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState,
    MessageUpsertType,
    WAMessage
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

async function startBot() {
    // Load authentication state from files
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    
    // Create the WhatsApp socket
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Display QR code in terminal
    })
    
    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Connection closed due to:', lastDisconnect?.error, 'Reconnecting:', shouldReconnect)
            
            // Reconnect if not logged out
            if (shouldReconnect) {
                startBot()
            }
        } else if (connection === 'open') {
            console.log('✅ Bot connected successfully!')
        }
    })
    
    // Save authentication credentials when updated
    sock.ev.on('creds.update', saveCreds)
    
    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        // Only process new messages
        if (type !== 'notify') return
        
        for (const message of messages) {
            // Skip if message is from status broadcast or if there's no message content
            if (!message.message || message.key.remoteJid === 'status@broadcast') continue
            
            // Skip messages from self
            if (message.key.fromMe) continue
            
            const messageText = getMessageText(message)
            const senderJid = message.key.remoteJid!
            
            console.log(`📨 Received: "${messageText}" from ${senderJid}`)
            
            // Echo the message back
            await sock.sendMessage(senderJid, {
                text: `🤖 Echo: ${messageText}`
            })
        }
    })
}

// Helper function to extract text from different message types
function getMessageText(message: WAMessage): string {
    const content = message.message
    
    if (content?.conversation) {
        return content.conversation
    }
    
    if (content?.extendedTextMessage?.text) {
        return content.extendedTextMessage.text
    }
    
    if (content?.imageMessage?.caption) {
        return content.imageMessage.caption
    }
    
    if (content?.videoMessage?.caption) {
        return content.videoMessage.caption
    }
    
    return '[Non-text message]'
}

// Start the bot
startBot().catch(console.error)
```

## Step 2: Run Your Bot

```bash
# If using TypeScript
npx ts-node src/index.ts

# If using JavaScript
node src/index.js
```

## Step 3: Connect to WhatsApp

1. **QR Code Method**: A QR code will appear in your terminal. Scan it with WhatsApp on your phone:
   - Open WhatsApp on your phone
   - Go to Settings > Linked Devices
   - Tap "Link a Device"
   - Scan the QR code

2. **Pairing Code Method** (Alternative):

```typescript
// Modify your bot to use pairing code instead
const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // Disable QR code
})

// Add this after creating the socket
if (!sock.authState.creds.registered) {
    const phoneNumber = '+1234567890' // Your phone number with country code
    const code = await sock.requestPairingCode(phoneNumber)
    console.log(`Pairing code: ${code}`)
}
```

## Step 4: Test Your Bot

Once connected, send a message to your WhatsApp number from another contact. Your bot should echo the message back!

## Enhanced Bot Example

Here's a more feature-rich version with command handling:

```typescript
import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState,
    WAMessage
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

async function startEnhancedBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    })
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) {
                startEnhancedBot()
            }
        } else if (connection === 'open') {
            console.log('✅ Enhanced bot connected!')
        }
    })
    
    sock.ev.on('creds.update', saveCreds)
    
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return
        
        for (const message of messages) {
            if (!message.message || message.key.remoteJid === 'status@broadcast' || message.key.fromMe) continue
            
            const messageText = getMessageText(message).toLowerCase()
            const senderJid = message.key.remoteJid!
            
            // Command handling
            if (messageText.startsWith('/')) {
                await handleCommand(sock, senderJid, messageText, message)
            } else {
                // Echo non-command messages
                await sock.sendMessage(senderJid, {
                    text: `🤖 You said: "${messageText}"\n\nTry these commands:\n/help - Show help\n/ping - Test bot\n/time - Current time`
                })
            }
        }
    })
}

async function handleCommand(sock: any, jid: string, command: string, originalMessage: WAMessage) {
    switch (command) {
        case '/help':
            await sock.sendMessage(jid, {
                text: `🤖 *Bot Commands*\n\n` +
                      `/help - Show this help message\n` +
                      `/ping - Test if bot is working\n` +
                      `/time - Get current time\n` +
                      `/echo [text] - Echo your text\n` +
                      `/info - Get chat info`
            })
            break
            
        case '/ping':
            await sock.sendMessage(jid, { text: '🏓 Pong! Bot is working!' })
            break
            
        case '/time':
            const now = new Date().toLocaleString()
            await sock.sendMessage(jid, { text: `🕐 Current time: ${now}` })
            break
            
        case '/info':
            const isGroup = jid.endsWith('@g.us')
            const chatType = isGroup ? 'Group' : 'Private Chat'
            await sock.sendMessage(jid, {
                text: `ℹ️ *Chat Information*\n\n` +
                      `Type: ${chatType}\n` +
                      `JID: ${jid}\n` +
                      `Message ID: ${originalMessage.key.id}`
            })
            break
            
        default:
            if (command.startsWith('/echo ')) {
                const textToEcho = command.substring(6)
                await sock.sendMessage(jid, { text: `📢 ${textToEcho}` })
            } else {
                await sock.sendMessage(jid, { 
                    text: `❌ Unknown command: ${command}\n\nType /help for available commands` 
                })
            }
    }
}

function getMessageText(message: WAMessage): string {
    const content = message.message
    
    if (content?.conversation) return content.conversation
    if (content?.extendedTextMessage?.text) return content.extendedTextMessage.text
    if (content?.imageMessage?.caption) return content.imageMessage.caption
    if (content?.videoMessage?.caption) return content.videoMessage.caption
    
    return '[Non-text message]'
}

startEnhancedBot().catch(console.error)
```

## Common Issues & Solutions

### Issue: QR Code Not Appearing
**Solution**: Make sure `printQRInTerminal: true` is set and your terminal supports QR code display.

### Issue: Connection Keeps Closing
**Solution**: Check your internet connection and ensure WhatsApp Web is not open in a browser.

### Issue: Messages Not Being Received
**Solution**: Verify the event handler is correctly set up and check for any console errors.

### Issue: Bot Responds to Its Own Messages
**Solution**: Always check `message.key.fromMe` and skip if `true`.

## Next Steps

Congratulations! You now have a working WhatsApp bot. Here's what to explore next:

1. **[Architecture Overview](../03-architecture/README.md)**: Understand how Baileys works internally
2. **[Authentication](../04-authentication/README.md)**: Learn about session management and security
3. **[Message System](../05-messages/README.md)**: Explore different message types and advanced features
4. **[Examples](../10-examples/README.md)**: See more complex bot implementations

## Tips for Development

1. **Use TypeScript**: Better error catching and IntelliSense support
2. **Handle errors gracefully**: Always wrap async operations in try-catch blocks
3. **Log everything**: Use proper logging to debug issues
4. **Test incrementally**: Start simple and add features gradually
5. **Read the events**: Understanding events is key to building robust bots

---

> **Remember**: This is just the beginning! Baileys offers much more functionality including media handling, group management, business features, and advanced customization options.
