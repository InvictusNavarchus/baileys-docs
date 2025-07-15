---
id: debugging
title: Advanced Debugging Techniques
sidebar_position: 3
description: Advanced debugging techniques and tools for troubleshooting Baileys applications.
keywords: [baileys, debugging, logging, troubleshooting, development, tools]
---

# Advanced Debugging Techniques

This guide covers advanced debugging techniques and tools to help you diagnose and fix complex issues in your Baileys applications.

## Logging Configuration

### Enable Debug Logging

```typescript
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import pino from 'pino'

// Create detailed logger
const logger = pino({
    level: 'debug',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'hostname'
        }
    }
})

const sock = makeWASocket({
    auth: state,
    logger: logger.child({ module: 'baileys' }),
    printQRInTerminal: true
})
```

### Custom Logger Implementation

```typescript
class CustomLogger {
    private logFile: string

    constructor(logFile: string = 'baileys.log') {
        this.logFile = logFile
    }

    private writeLog(level: string, message: any, ...args: any[]) {
        const timestamp = new Date().toISOString()
        const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${JSON.stringify({ message, args })}\n`

        // Write to file
        require('fs').appendFileSync(this.logFile, logEntry)

        // Also log to console in development
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[${level.toUpperCase()}]`, message, ...args)
        }
    }

    fatal(msg: any, ...args: any[]) { this.writeLog('fatal', msg, ...args) }
    error(msg: any, ...args: any[]) { this.writeLog('error', msg, ...args) }
    warn(msg: any, ...args: any[]) { this.writeLog('warn', msg, ...args) }
    info(msg: any, ...args: any[]) { this.writeLog('info', msg, ...args) }
    debug(msg: any, ...args: any[]) { this.writeLog('debug', msg, ...args) }
    trace(msg: any, ...args: any[]) { this.writeLog('trace', msg, ...args) }

    child(bindings: any) {
        return new CustomLogger(`${bindings.module || 'child'}.log`)
    }

    get level() { return 'debug' }
    set level(value: string) { /* implement if needed */ }
}

const logger = new CustomLogger('baileys-debug.log')
```

## Connection Debugging

### Detailed Connection Monitoring

```typescript
class ConnectionMonitor {
    private connectionHistory: Array<{
        timestamp: Date
        event: string
        data: any
    }> = []

    private startTime = Date.now()

    monitor(sock: WASocket) {
        sock.ev.on('connection.update', (update) => {
            this.logEvent('connection.update', update)

            const { connection, lastDisconnect, qr, isNewLogin } = update

            if (connection) {
                console.log(`🔗 Connection state: ${connection}`)

                if (connection === 'open') {
                    const connectTime = Date.now() - this.startTime
                    console.log(`✅ Connected in ${connectTime}ms`)
                    this.analyzeConnectionTime(connectTime)
                }
            }

            if (lastDisconnect) {
                this.analyzeDisconnect(lastDisconnect)
            }

            if (qr) {
                console.log('📱 QR code generated')
            }

            if (isNewLogin) {
                console.log('🆕 New login detected')
            }
        })

        // Monitor WebSocket events
        sock.ws.addEventListener('open', () => {
            this.logEvent('websocket.open', { readyState: sock.ws.readyState })
        })

        sock.ws.addEventListener('close', (event) => {
            this.logEvent('websocket.close', {
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean
            })
        })

        sock.ws.addEventListener('error', (error) => {
            this.logEvent('websocket.error', error)
        })
    }

    private logEvent(event: string, data: any) {
        this.connectionHistory.push({
            timestamp: new Date(),
            event,
            data
        })

        // Keep only last 100 events
        if (this.connectionHistory.length > 100) {
            this.connectionHistory.shift()
        }
    }

    private analyzeConnectionTime(connectTime: number) {
        if (connectTime > 30000) {
            console.log('⚠️ Slow connection detected (>30s)')
        } else if (connectTime > 10000) {
            console.log('⚠️ Connection took longer than expected (>10s)')
        }
    }

    private analyzeDisconnect(lastDisconnect: any) {
        const error = lastDisconnect.error
        const statusCode = error?.output?.statusCode

        console.log(`❌ Disconnect reason: ${statusCode} - ${error?.message}`)

        // Analyze disconnect patterns
        const recentDisconnects = this.connectionHistory
            .filter(event => event.event === 'connection.update' && event.data.connection === 'close')
            .slice(-5)

        if (recentDisconnects.length >= 3) {
            console.log('⚠️ Frequent disconnections detected')
            this.suggestSolutions(statusCode)
        }
    }

    private suggestSolutions(statusCode: number) {
        const solutions = {
            428: 'Try increasing connectTimeoutMs and implementing exponential backoff',
            408: 'Check internet connection and increase timeout values',
            500: 'Clear auth state - session may be corrupted',
            401: 'Re-authentication required - user may have logged out',
            440: 'Another session is active - check for multiple instances'
        }

        const solution = solutions[statusCode]
        if (solution) {
            console.log(`💡 Suggestion: ${solution}`)
        }
    }

    getConnectionReport() {
        return {
            totalEvents: this.connectionHistory.length,
            recentEvents: this.connectionHistory.slice(-10),
            uptime: Date.now() - this.startTime,
            disconnectCount: this.connectionHistory.filter(e =>
                e.event === 'connection.update' && e.data.connection === 'close'
            ).length
        }
    }
}

// Usage
const monitor = new ConnectionMonitor()
monitor.monitor(sock)

// Get report after some time
setTimeout(() => {
    console.log('Connection Report:', monitor.getConnectionReport())
}, 60000)
```

## Message Debugging

### Message Flow Tracing

```typescript
class MessageTracer {
    private messageFlow: Map<string, Array<{
        timestamp: Date
        stage: string
        data: any
    }>> = new Map()

    trace(sock: WASocket) {
        // Trace outgoing messages
        const originalSendMessage = sock.sendMessage.bind(sock)
        sock.sendMessage = async (jid: string, content: any, options?: any) => {
            const messageId = options?.messageId || this.generateId()

            this.logMessageStage(messageId, 'send_initiated', { jid, content, options })

            try {
                const result = await originalSendMessage(jid, content, { ...options, messageId })
                this.logMessageStage(messageId, 'send_completed', result)
                return result
            } catch (error) {
                this.logMessageStage(messageId, 'send_failed', error)
                throw error
            }
        }

        // Trace incoming messages
        sock.ev.on('messages.upsert', ({ messages, type }) => {
            messages.forEach(message => {
                const messageId = message.key.id
                this.logMessageStage(messageId, 'received', { message, type })
            })
        })

        // Trace message updates
        sock.ev.on('messages.update', (updates) => {
            updates.forEach(update => {
                const messageId = update.key.id
                this.logMessageStage(messageId, 'updated', update)
            })
        })

        // Trace receipts
        sock.ev.on('message-receipt.update', (receipts) => {
            receipts.forEach(receipt => {
                const messageId = receipt.key.id
                this.logMessageStage(messageId, 'receipt', receipt)
            })
        })
    }

    private logMessageStage(messageId: string, stage: string, data: any) {
        if (!this.messageFlow.has(messageId)) {
            this.messageFlow.set(messageId, [])
        }

        this.messageFlow.get(messageId)!.push({
            timestamp: new Date(),
            stage,
            data
        })

        console.log(`📨 Message ${messageId}: ${stage}`)

        // Clean up old message traces
        if (this.messageFlow.size > 1000) {
            const oldestKey = this.messageFlow.keys().next().value
            this.messageFlow.delete(oldestKey)
        }
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2, 15)
    }

    getMessageTrace(messageId: string) {
        return this.messageFlow.get(messageId) || []
    }

    analyzeMessageDelivery() {
        const analysis = {
            totalMessages: this.messageFlow.size,
            successful: 0,
            failed: 0,
            pending: 0,
            averageDeliveryTime: 0
        }

        const deliveryTimes: number[] = []

        this.messageFlow.forEach((stages, messageId) => {
            const sendStage = stages.find(s => s.stage === 'send_initiated')
            const completeStage = stages.find(s => s.stage === 'send_completed')
            const failStage = stages.find(s => s.stage === 'send_failed')

            if (failStage) {
                analysis.failed++
            } else if (completeStage && sendStage) {
                analysis.successful++
                const deliveryTime = completeStage.timestamp.getTime() - sendStage.timestamp.getTime()
                deliveryTimes.push(deliveryTime)
            } else {
                analysis.pending++
            }
        })

        if (deliveryTimes.length > 0) {
            analysis.averageDeliveryTime = deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
        }

        return analysis
    }
}

// Usage
const tracer = new MessageTracer()
tracer.trace(sock)

// Analyze after some time
setInterval(() => {
    const analysis = tracer.analyzeMessageDelivery()
    console.log('Message Delivery Analysis:', analysis)
}, 300000) // Every 5 minutes
```