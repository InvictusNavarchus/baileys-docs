# Basic WhatsApp Bot

This example demonstrates how to build a complete, production-ready WhatsApp bot with essential features like command handling, error management, and proper session handling.

## Complete Bot Implementation

```typescript
import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    WAMessage,
    MessageUpsertType,
    Browsers
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import P from 'pino'

// Configure logger
const logger = P({
    timestamp: () => `,"time":"${new Date().toJSON()}"`,
    level: 'info'
})

class WhatsAppBot {
    private sock?: ReturnType<typeof makeWASocket>
    private isConnected = false
    private reconnectAttempts = 0
    private maxReconnectAttempts = 5
    
    // Bot configuration
    private config = {
        authFolder: 'auth_info',
        printQRInTerminal: true,
        browser: Browsers.ubuntu('WhatsApp Bot'),
        defaultPrefix: '!',
        adminNumbers: ['+1234567890@s.whatsapp.net'], // Add admin numbers
        enableLogging: true
    }
    
    // Command handlers
    private commands = new Map<string, (message: WAMessage, args: string[]) => Promise<void>>()
    
    constructor() {
        this.setupCommands()
    }
    
    async start() {
        try {
            await this.connect()
        } catch (error) {
            logger.error('Failed to start bot:', error)
            process.exit(1)
        }
    }
    
    private async connect() {
        const { state, saveCreds } = await useMultiFileAuthState(this.config.authFolder)
        
        this.sock = makeWASocket({
            auth: state,
            printQRInTerminal: this.config.printQRInTerminal,
            browser: this.config.browser,
            logger: logger.child({ class: 'baileys' }),
            generateHighQualityLinkPreview: true,
            markOnlineOnConnect: false // Don't mark as online to avoid notifications
        })
        
        this.setupEventHandlers()
        this.sock.ev.on('creds.update', saveCreds)
    }
    
    private setupEventHandlers() {
        if (!this.sock) return
        
        // Connection updates
        this.sock.ev.on('connection.update', this.handleConnectionUpdate.bind(this))
        
        // Incoming messages
        this.sock.ev.on('messages.upsert', this.handleMessages.bind(this))
        
        // Message updates (status, reactions, etc.)
        this.sock.ev.on('messages.update', this.handleMessageUpdates.bind(this))
        
        // Group updates
        this.sock.ev.on('groups.update', this.handleGroupUpdates.bind(this))
        
        // Presence updates
        this.sock.ev.on('presence.update', this.handlePresenceUpdate.bind(this))
    }
    
    private async handleConnectionUpdate(update: any) {
        const { connection, lastDisconnect, qr } = update
        
        if (qr) {
            logger.info('QR Code received, scan with your phone')
        }
        
        if (connection === 'close') {
            this.isConnected = false
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            
            logger.info('Connection closed due to:', lastDisconnect?.error, 'Reconnecting:', shouldReconnect)
            
            if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++
                logger.info(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
                
                // Exponential backoff
                const delay = Math.pow(2, this.reconnectAttempts) * 1000
                setTimeout(() => this.connect(), delay)
            } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                logger.error('Max reconnection attempts reached. Exiting...')
                process.exit(1)
            }
        } else if (connection === 'open') {
            this.isConnected = true
            this.reconnectAttempts = 0
            logger.info('✅ Bot connected successfully!')
            
            // Send startup notification to admins
            await this.notifyAdmins('🤖 Bot is now online and ready!')
        }
    }
    
    private async handleMessages({ messages, type }: { messages: WAMessage[], type: MessageUpsertType }) {
        if (type !== 'notify') return
        
        for (const message of messages) {
            try {
                await this.processMessage(message)
            } catch (error) {
                logger.error('Error processing message:', error)
            }
        }
    }
    
    private async processMessage(message: WAMessage) {
        // Skip invalid messages
        if (!message.message || message.key.remoteJid === 'status@broadcast') return
        
        // Skip own messages
        if (message.key.fromMe) return
        
        const messageText = this.getMessageText(message)
        const senderJid = message.key.remoteJid!
        const isGroup = senderJid.endsWith('@g.us')
        const senderName = message.pushName || 'Unknown'
        
        // Log message
        if (this.config.enableLogging) {
            logger.info(`📨 ${isGroup ? 'Group' : 'Private'} message from ${senderName} (${senderJid}): ${messageText}`)
        }
        
        // Check if message is a command
        if (messageText.startsWith(this.config.defaultPrefix)) {
            await this.handleCommand(message, messageText)
        } else {
            // Handle non-command messages
            await this.handleRegularMessage(message, messageText)
        }
    }
    
    private async handleCommand(message: WAMessage, messageText: string) {
        const args = messageText.slice(this.config.defaultPrefix.length).trim().split(/\s+/)
        const command = args.shift()?.toLowerCase()
        
        if (!command) return
        
        const handler = this.commands.get(command)
        if (handler) {
            try {
                await handler(message, args)
            } catch (error) {
                logger.error(`Error executing command ${command}:`, error)
                await this.sendMessage(message.key.remoteJid!, {
                    text: `❌ Error executing command: ${error.message}`
                })
            }
        } else {
            await this.sendMessage(message.key.remoteJid!, {
                text: `❓ Unknown command: ${command}\nType ${this.config.defaultPrefix}help for available commands`
            })
        }
    }
    
    private async handleRegularMessage(message: WAMessage, messageText: string) {
        // Auto-responses for regular messages
        const lowerText = messageText.toLowerCase()
        
        if (lowerText.includes('hello') || lowerText.includes('hi')) {
            await this.sendMessage(message.key.remoteJid!, {
                text: `👋 Hello ${message.pushName || 'there'}! I'm a WhatsApp bot. Type ${this.config.defaultPrefix}help to see what I can do.`
            })
        }
    }
    
    private setupCommands() {
        // Help command
        this.commands.set('help', async (message) => {
            const helpText = `🤖 *WhatsApp Bot Commands*\n\n` +
                `${this.config.defaultPrefix}help - Show this help message\n` +
                `${this.config.defaultPrefix}ping - Test bot responsiveness\n` +
                `${this.config.defaultPrefix}time - Get current time\n` +
                `${this.config.defaultPrefix}echo <text> - Echo your message\n` +
                `${this.config.defaultPrefix}info - Get chat information\n` +
                `${this.config.defaultPrefix}status - Get bot status\n` +
                `${this.config.defaultPrefix}joke - Get a random joke\n` +
                `${this.config.defaultPrefix}weather <city> - Get weather info\n\n` +
                `*Admin Commands:*\n` +
                `${this.config.defaultPrefix}broadcast <message> - Send message to all chats\n` +
                `${this.config.defaultPrefix}stats - Get bot statistics`
            
            await this.sendMessage(message.key.remoteJid!, { text: helpText })
        })
        
        // Ping command
        this.commands.set('ping', async (message) => {
            const start = Date.now()
            const sent = await this.sendMessage(message.key.remoteJid!, { text: '🏓 Pong!' })
            const latency = Date.now() - start
            
            // Edit message to show latency
            await this.sendMessage(message.key.remoteJid!, {
                text: `🏓 Pong! Latency: ${latency}ms`,
                edit: sent.key
            })
        })
        
        // Time command
        this.commands.set('time', async (message) => {
            const now = new Date()
            const timeString = now.toLocaleString('en-US', {
                timeZone: 'UTC',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
            
            await this.sendMessage(message.key.remoteJid!, {
                text: `🕐 Current time (UTC): ${timeString}`
            })
        })
        
        // Echo command
        this.commands.set('echo', async (message, args) => {
            const text = args.join(' ')
            if (!text) {
                await this.sendMessage(message.key.remoteJid!, {
                    text: '❌ Please provide text to echo\nUsage: !echo <your message>'
                })
                return
            }
            
            await this.sendMessage(message.key.remoteJid!, {
                text: `📢 ${text}`
            })
        })
        
        // Info command
        this.commands.set('info', async (message) => {
            const isGroup = message.key.remoteJid!.endsWith('@g.us')
            const chatType = isGroup ? 'Group Chat' : 'Private Chat'
            
            let infoText = `ℹ️ *Chat Information*\n\n` +
                `Type: ${chatType}\n` +
                `JID: ${message.key.remoteJid}\n` +
                `Message ID: ${message.key.id}\n` +
                `Timestamp: ${new Date(message.messageTimestamp! * 1000).toLocaleString()}`
            
            if (isGroup) {
                try {
                    const groupMetadata = await this.sock!.groupMetadata(message.key.remoteJid!)
                    infoText += `\nGroup Name: ${groupMetadata.subject}\n` +
                        `Participants: ${groupMetadata.participants.length}\n` +
                        `Created: ${new Date(groupMetadata.creation! * 1000).toLocaleDateString()}`
                } catch (error) {
                    logger.error('Failed to get group metadata:', error)
                }
            }
            
            await this.sendMessage(message.key.remoteJid!, { text: infoText })
        })
        
        // Status command
        this.commands.set('status', async (message) => {
            const uptime = process.uptime()
            const uptimeString = this.formatUptime(uptime)
            
            const statusText = `📊 *Bot Status*\n\n` +
                `Status: ${this.isConnected ? '🟢 Online' : '🔴 Offline'}\n` +
                `Uptime: ${uptimeString}\n` +
                `Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n` +
                `Node.js Version: ${process.version}\n` +
                `Platform: ${process.platform}`
            
            await this.sendMessage(message.key.remoteJid!, { text: statusText })
        })
        
        // Joke command
        this.commands.set('joke', async (message) => {
            const jokes = [
                "Why don't scientists trust atoms? Because they make up everything!",
                "Why did the scarecrow win an award? He was outstanding in his field!",
                "Why don't eggs tell jokes? They'd crack each other up!",
                "What do you call a fake noodle? An impasta!",
                "Why did the math book look so sad? Because it had too many problems!"
            ]
            
            const randomJoke = jokes[Math.floor(Math.random() * jokes.length)]
            await this.sendMessage(message.key.remoteJid!, {
                text: `😄 ${randomJoke}`
            })
        })
        
        // Admin-only commands
        this.commands.set('broadcast', async (message, args) => {
            if (!this.isAdmin(message.key.remoteJid!)) {
                await this.sendMessage(message.key.remoteJid!, {
                    text: '❌ This command is only available to administrators.'
                })
                return
            }
            
            const broadcastText = args.join(' ')
            if (!broadcastText) {
                await this.sendMessage(message.key.remoteJid!, {
                    text: '❌ Please provide a message to broadcast'
                })
                return
            }
            
            // Implementation would require storing chat list
            await this.sendMessage(message.key.remoteJid!, {
                text: '📢 Broadcast feature would be implemented here'
            })
        })
    }
    
    private async handleMessageUpdates(updates: any[]) {
        for (const update of updates) {
            if (update.update.status) {
                // Handle message status updates (sent, delivered, read)
                logger.debug(`Message ${update.key.id} status: ${update.update.status}`)
            }
        }
    }
    
    private async handleGroupUpdates(updates: any[]) {
        for (const update of updates) {
            logger.info('Group update:', update)
        }
    }
    
    private async handlePresenceUpdate(update: any) {
        logger.debug('Presence update:', update)
    }
    
    private getMessageText(message: WAMessage): string {
        const content = message.message
        
        if (content?.conversation) return content.conversation
        if (content?.extendedTextMessage?.text) return content.extendedTextMessage.text
        if (content?.imageMessage?.caption) return content.imageMessage.caption || '[Image]'
        if (content?.videoMessage?.caption) return content.videoMessage.caption || '[Video]'
        if (content?.documentMessage) return `[Document: ${content.documentMessage.fileName}]`
        if (content?.audioMessage) return '[Audio]'
        if (content?.locationMessage) return '[Location]'
        if (content?.contactMessage) return '[Contact]'
        
        return '[Unsupported message type]'
    }
    
    private async sendMessage(jid: string, content: any) {
        if (!this.sock || !this.isConnected) {
            throw new Error('Bot is not connected')
        }
        
        return await this.sock.sendMessage(jid, content)
    }
    
    private async notifyAdmins(message: string) {
        for (const adminJid of this.config.adminNumbers) {
            try {
                await this.sendMessage(adminJid, { text: message })
            } catch (error) {
                logger.error(`Failed to notify admin ${adminJid}:`, error)
            }
        }
    }
    
    private isAdmin(jid: string): boolean {
        return this.config.adminNumbers.includes(jid)
    }
    
    private formatUptime(seconds: number): string {
        const days = Math.floor(seconds / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = Math.floor(seconds % 60)
        
        return `${days}d ${hours}h ${minutes}m ${secs}s`
    }
    
    // Graceful shutdown
    async shutdown() {
        logger.info('Shutting down bot...')
        
        await this.notifyAdmins('🤖 Bot is shutting down...')
        
        if (this.sock) {
            this.sock.end()
        }
        
        logger.info('Bot shutdown complete')
        process.exit(0)
    }
}

// Create and start the bot
const bot = new WhatsAppBot()

// Handle graceful shutdown
process.on('SIGINT', () => bot.shutdown())
process.on('SIGTERM', () => bot.shutdown())

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error)
    bot.shutdown()
})

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason)
    bot.shutdown()
})

// Start the bot
bot.start().catch((error) => {
    logger.error('Failed to start bot:', error)
    process.exit(1)
})
```

## Package.json Configuration

```json
{
  "name": "whatsapp-bot",
  "version": "1.0.0",
  "description": "A comprehensive WhatsApp bot built with Baileys",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "clean": "rm -rf dist",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src/**/*.ts"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.18",
    "@hapi/boom": "^9.1.3",
    "pino": "^9.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## Environment Configuration

Create a `.env` file:

```bash
# Bot Configuration
BOT_NAME=WhatsApp Bot
LOG_LEVEL=info
ENABLE_LOGGING=true

# Admin Configuration
ADMIN_NUMBERS=+1234567890,+0987654321

# Features
DEFAULT_PREFIX=!
AUTO_READ_MESSAGES=false
MARK_ONLINE_ON_CONNECT=false
```

## Running the Bot

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Start the bot:**
   ```bash
   npm start
   ```

4. **For development:**
   ```bash
   npm run dev
   ```

## Features Included

- ✅ **Command System**: Extensible command handling with prefix support
- ✅ **Error Handling**: Comprehensive error handling and recovery
- ✅ **Auto-Reconnection**: Automatic reconnection with exponential backoff
- ✅ **Admin Commands**: Admin-only functionality
- ✅ **Logging**: Structured logging with Pino
- ✅ **Graceful Shutdown**: Proper cleanup on exit
- ✅ **Message Types**: Support for various message types
- ✅ **Group Support**: Works in both private and group chats
- ✅ **Status Tracking**: Connection and message status monitoring

## Extending the Bot

### Adding New Commands

```typescript
this.commands.set('newcommand', async (message, args) => {
    // Your command logic here
    await this.sendMessage(message.key.remoteJid!, {
        text: 'New command response'
    })
})
```

### Adding Middleware

```typescript
private async processMessage(message: WAMessage) {
    // Add middleware here
    if (await this.rateLimitCheck(message)) return
    if (await this.spamFilter(message)) return
    
    // Continue with normal processing
    // ... rest of the method
}
```

### Database Integration

```typescript
import { Pool } from 'pg'

class DatabaseManager {
    private db: Pool
    
    constructor() {
        this.db = new Pool({
            connectionString: process.env.DATABASE_URL
        })
    }
    
    async logMessage(message: WAMessage) {
        await this.db.query(
            'INSERT INTO messages (jid, content, timestamp) VALUES ($1, $2, $3)',
            [message.key.remoteJid, this.getMessageText(message), new Date()]
        )
    }
}
```

This basic bot provides a solid foundation that you can extend with additional features like database integration, web dashboards, AI responses, and more complex business logic.

## Next Steps

- **[Media Bot](./media-bot.md)**: Handle images, videos, and documents
- **[Group Bot](./group-bot.md)**: Advanced group management features
- **[Business Bot](./business-bot.md)**: E-commerce and business features
- **[Deployment](../11-deployment/README.md)**: Deploy your bot to production
