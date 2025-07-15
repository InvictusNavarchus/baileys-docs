---
id: examples
title: Examples Overview
sidebar_position: 10
description: Collection of practical examples and use cases for building WhatsApp bots with Baileys.
keywords: [baileys, examples, bot examples, whatsapp bot, tutorials, use cases]
---

# Examples Overview

This section contains practical examples and complete implementations of WhatsApp bots using Baileys. Each example demonstrates different features and use cases to help you build your own applications.

## Available Examples

### [Basic Bot](./basic-bot.md)
A simple WhatsApp bot that demonstrates fundamental concepts:
- Connection handling
- Message receiving and sending
- Basic command processing
- Error handling
- Session management

**Key Features:**
- Text message handling
- Simple command system
- Auto-replies
- Connection management

**Best For:** Beginners learning Baileys basics

---

### [Media Bot](./media-bot.md)
A comprehensive media processing bot that handles all types of media:
- Image processing and optimization
- Video compression and thumbnail extraction
- Audio format conversion
- Document analysis
- Sticker creation

**Key Features:**
- Multi-format media support
- Real-time processing
- File optimization
- Metadata extraction
- Storage management

**Best For:** Applications requiring media processing

---

### [Group Bot](./group-bot.md)
A full-featured group management bot with admin capabilities:
- Member management (add/remove/promote/demote)
- Auto-moderation and spam detection
- Welcome/farewell messages
- Warning system
- Group settings management

**Key Features:**
- Admin permission checks
- Automated moderation
- Bulk operations
- Custom group settings
- Activity logging

**Best For:** Group administration and moderation

---

### [Business Bot](./business-bot.md)
A WhatsApp Business bot for e-commerce and customer service:
- Product catalog management
- Order processing
- Customer support
- Interactive menus
- Payment integration

**Key Features:**
- Interactive buttons and lists
- Shopping cart functionality
- Order tracking
- Customer profiles
- Business analytics

**Best For:** E-commerce and business applications

## Common Patterns

### Bot Architecture

Most bots follow this general structure:

```typescript
class WhatsAppBot {
    private sock: WASocket
    private eventHandlers: Map<string, Function>
    
    constructor() {
        this.eventHandlers = new Map()
        this.setupEventHandlers()
    }
    
    async start() {
        // Initialize connection
        const { state, saveCreds } = await useMultiFileAuthState('auth')
        
        this.sock = makeWASocket({
            auth: state,
            // ... other config
        })
        
        // Setup event listeners
        this.sock.ev.on('connection.update', this.handleConnection.bind(this))
        this.sock.ev.on('creds.update', saveCreds)
        this.sock.ev.on('messages.upsert', this.handleMessages.bind(this))
    }
    
    private setupEventHandlers() {
        // Register command handlers
        this.eventHandlers.set('help', this.handleHelp.bind(this))
        this.eventHandlers.set('ping', this.handlePing.bind(this))
        // ... more handlers
    }
    
    private async handleMessages({ messages, type }) {
        // Process incoming messages
    }
    
    private handleConnection({ connection, lastDisconnect }) {
        // Handle connection state changes
    }
}
```

### Message Processing Pipeline

```typescript
class MessageProcessor {
    async processMessage(message: WAMessage) {
        // 1. Validate message
        if (!this.isValidMessage(message)) return
        
        // 2. Extract content
        const content = this.extractContent(message)
        
        // 3. Determine message type
        const messageType = this.getMessageType(message)
        
        // 4. Route to appropriate handler
        await this.routeMessage(messageType, content, message)
        
        // 5. Log activity
        this.logActivity(message, messageType)
    }
    
    private isValidMessage(message: WAMessage): boolean {
        return !message.key.fromMe && message.message != null
    }
    
    private extractContent(message: WAMessage): string {
        // Extract text content from various message types
        return getMessageText(message)
    }
    
    private getMessageType(message: WAMessage): string {
        return Object.keys(message.message || {})[0]
    }
    
    private async routeMessage(type: string, content: string, message: WAMessage) {
        switch (type) {
            case 'conversation':
            case 'extendedTextMessage':
                await this.handleTextMessage(content, message)
                break
            case 'imageMessage':
                await this.handleImageMessage(message)
                break
            // ... other types
        }
    }
}
```

### Command System

```typescript
interface Command {
    name: string
    description: string
    usage: string
    adminOnly?: boolean
    execute: (args: string[], message: WAMessage, bot: WhatsAppBot) => Promise<void>
}

class CommandManager {
    private commands = new Map<string, Command>()
    
    register(command: Command) {
        this.commands.set(command.name, command)
    }
    
    async execute(commandName: string, args: string[], message: WAMessage, bot: WhatsAppBot) {
        const command = this.commands.get(commandName)
        if (!command) {
            throw new Error(`Command '${commandName}' not found`)
        }
        
        // Check permissions
        if (command.adminOnly && !await this.isAdmin(message.key.participant)) {
            throw new Error('Insufficient permissions')
        }
        
        // Execute command
        await command.execute(args, message, bot)
    }
    
    getHelp(): string {
        let help = '📋 **Available Commands:**\n\n'
        
        for (const [name, command] of this.commands.entries()) {
            help += `• **/${name}** - ${command.description}\n`
            help += `  Usage: ${command.usage}\n\n`
        }
        
        return help
    }
}
```

### Error Handling

```typescript
class ErrorHandler {
    static async handleError(error: Error, context: any) {
        console.error('Bot error:', error)
        
        // Log error details
        logger.error('Bot error occurred', {
            error: error.message,
            stack: error.stack,
            context
        })
        
        // Send error notification to admin
        if (context.adminJid) {
            try {
                await context.sock.sendMessage(context.adminJid, {
                    text: `❌ Bot Error: ${error.message}`
                })
            } catch (notificationError) {
                console.error('Failed to send error notification:', notificationError)
            }
        }
        
        // Send user-friendly error message
        if (context.userJid) {
            try {
                await context.sock.sendMessage(context.userJid, {
                    text: '❌ Sorry, something went wrong. Please try again later.'
                })
            } catch (userError) {
                console.error('Failed to send user error message:', userError)
            }
        }
    }
}
```

## Development Tips

### 1. Start Simple
Begin with the basic bot example and gradually add features as you learn.

### 2. Use TypeScript
TypeScript provides better development experience with type safety and IntelliSense.

### 3. Implement Logging
Add comprehensive logging to help with debugging and monitoring.

### 4. Handle Errors Gracefully
Always wrap operations in try-catch blocks and provide user feedback.

### 5. Test Thoroughly
Test your bot with different message types and edge cases.

### 6. Follow Best Practices
- Use environment variables for configuration
- Implement rate limiting
- Validate user input
- Handle connection failures
- Clean up resources properly

## Example Structure

Each example follows this structure:

```
example-bot/
├── src/
│   ├── bot.ts              # Main bot class
│   ├── handlers/           # Message handlers
│   │   ├── text.ts
│   │   ├── media.ts
│   │   └── commands.ts
│   ├── utils/              # Utility functions
│   │   ├── helpers.ts
│   │   └── validators.ts
│   ├── config/             # Configuration
│   │   └── settings.ts
│   └── index.ts            # Entry point
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Running Examples

### Prerequisites

```bash
# Install Node.js 20+
node --version

# Install dependencies
npm install @whiskeysockets/baileys
npm install typescript @types/node
```

### Setup

1. Clone or download the example
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Build: `npm run build`
5. Run: `npm start`

### Authentication

All examples support both QR code and pairing code authentication:

```typescript
// QR Code (default)
const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
})

// Pairing Code
if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(phoneNumber)
    console.log(`Pairing code: ${code}`)
}
```

## Contributing Examples

We welcome contributions of new examples! Please follow these guidelines:

### Example Requirements

1. **Complete Implementation**: Include all necessary code to run
2. **Documentation**: Provide clear README with setup instructions
3. **Error Handling**: Implement proper error handling
4. **TypeScript**: Use TypeScript with proper types
5. **Best Practices**: Follow established patterns

### Submission Process

1. Create example in `docs/10-examples/`
2. Follow naming convention: `feature-bot.md`
3. Include complete, working code
4. Add to examples overview
5. Test thoroughly before submission

## Getting Help

If you need help with examples:

1. Check the [Troubleshooting Guide](../14-troubleshooting/README.md)
2. Review [Common Issues](../14-troubleshooting/common-issues.md)
3. Join our community discussions
4. Open an issue on GitHub

---

**Next Steps:**
- Try the [Basic Bot](./basic-bot.md) to get started
- Explore [Media Bot](./media-bot.md) for media handling
- Check [Group Bot](./group-bot.md) for group management
- Review [Business Bot](./business-bot.md) for commercial use cases
