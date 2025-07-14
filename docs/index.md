---
id: index
title: Baileys Documentation
sidebar_position: 0
slug: /
description: Complete guide to building WhatsApp bots with Baileys - the most comprehensive TypeScript library for WhatsApp automation.
keywords: [baileys, whatsapp, bot, typescript, websocket, automation, documentation]
---

# Baileys Documentation

Welcome to the complete guide for building WhatsApp bots with Baileys - the most comprehensive and powerful TypeScript library for WhatsApp automation.

## Quick Start

Get up and running with Baileys in minutes:

```bash
npm install @whiskeysockets/baileys
```

```typescript
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
            if(shouldReconnect) {
                connectToWhatsApp()
            }
        } else if(connection === 'open') {
            console.log('opened connection')
        }
    })

    sock.ev.on('messages.upsert', ({ messages }) => {
        console.log('received messages', messages)
    })

    sock.ev.on('creds.update', saveCreds)
}

connectToWhatsApp()
```

## What's in This Documentation

### 🚀 Getting Started
- [Introduction](./introduction/) - Learn what Baileys is and why to use it
- [Installation](./installation/) - Set up Baileys in your project
- [Quick Start Guide](./installation/quick-start) - Build your first bot

### 🏗️ Core Concepts  
- [Architecture](./architecture/) - Understand Baileys' internal structure
- [Authentication](./authentication/) - Manage sessions and connections
- [Messages](./messages/) - Send, receive, and process messages

### 📚 Practical Guides
- [Examples](./examples/basic-bot) - Real-world bot implementations
- [Deployment](./deployment/) - Production setup and scaling

### 📖 Reference
- [API Reference](./api-reference/) - Complete API documentation
- [Troubleshooting](./troubleshooting/) - Common issues and solutions
- [FAQ](./faq/) - Frequently asked questions

## Key Features

- **🔒 Secure**: Full end-to-end encryption with Signal protocol
- **⚡ Fast**: Direct WebSocket connection, no browser overhead
- **🛠 TypeScript**: Complete type safety and IntelliSense support
- **📱 Multi-device**: Works with WhatsApp's latest multi-device API
- **🎯 Feature-complete**: All message types, groups, business features
- **🔄 Reliable**: Robust error handling and session management

## Community & Support

- 💬 [Discord Community](https://discord.gg/WeJM5FP9GG)
- 🐛 [GitHub Issues](https://github.com/WhiskeySockets/Baileys/issues)
- 💡 [GitHub Discussions](https://github.com/WhiskeySockets/Baileys/discussions)
- 📦 [NPM Package](https://www.npmjs.com/package/@whiskeysockets/baileys)

## Ready to Start?

Jump into the [Introduction](./introduction/) to learn more about Baileys, or go straight to [Installation](./installation/) if you're ready to start coding!

---

*Built with ❤️ by the WhiskeySockets team*
