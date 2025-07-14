---
id: performance
title: Performance Optimization
sidebar_position: 2
description: Advanced performance optimization techniques for Baileys WhatsApp bots.
keywords: [baileys, performance, optimization, memory, cpu, throughput, latency]
---

# Performance Optimization

This guide covers advanced performance optimization techniques to make your Baileys WhatsApp bot faster, more efficient, and capable of handling high loads.

## Message Processing Optimization

### Batch Processing

Process multiple messages together to reduce overhead:

```typescript
class BatchMessageProcessor {
    private messageQueue: WAMessage[] = []
    private batchSize = 50
    private batchTimeout = 1000
    private processingTimer: NodeJS.Timeout | null = null
    
    async addMessage(message: WAMessage) {
        this.messageQueue.push(message)
        
        // Process immediately if batch is full
        if (this.messageQueue.length >= this.batchSize) {
            await this.processBatch()
        } else if (!this.processingTimer) {
            // Set timer for partial batch
            this.processingTimer = setTimeout(() => {
                this.processBatch()
            }, this.batchTimeout)
        }
    }
    
    private async processBatch() {
        if (this.processingTimer) {
            clearTimeout(this.processingTimer)
            this.processingTimer = null
        }
        
        if (this.messageQueue.length === 0) return
        
        const batch = this.messageQueue.splice(0, this.batchSize)
        
        // Process messages in parallel with concurrency limit
        const concurrency = 10
        const chunks = this.chunkArray(batch, concurrency)
        
        for (const chunk of chunks) {
            await Promise.allSettled(
                chunk.map(message => this.processMessage(message))
            )
        }
    }
    
    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = []
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size))
        }
        return chunks
    }
    
    private async processMessage(message: WAMessage) {
        const startTime = performance.now()
        
        try {
            await this.handleMessage(message)
        } catch (error) {
            console.error('Message processing failed:', error)
        } finally {
            const duration = performance.now() - startTime
            this.recordMetric('message_processing_time', duration)
        }
    }
}
```

### Async Message Handling

Use async patterns to prevent blocking:

```typescript
class AsyncMessageHandler {
    private workerPool: Worker[] = []
    private taskQueue: MessageTask[] = []
    private maxWorkers = 4
    
    constructor() {
        this.initializeWorkers()
    }
    
    async handleMessage(message: WAMessage): Promise<void> {
        return new Promise((resolve, reject) => {
            const task: MessageTask = {
                message,
                resolve,
                reject,
                timestamp: Date.now()
            }
            
            this.taskQueue.push(task)
            this.processNextTask()
        })
    }
    
    private async processNextTask() {
        if (this.taskQueue.length === 0) return
        
        const availableWorker = this.workerPool.find(w => w.available)
        if (!availableWorker) return
        
        const task = this.taskQueue.shift()!
        availableWorker.available = false
        
        try {
            const result = await this.executeTask(task, availableWorker)
            task.resolve(result)
        } catch (error) {
            task.reject(error)
        } finally {
            availableWorker.available = true
            // Process next task
            setImmediate(() => this.processNextTask())
        }
    }
    
    private async executeTask(task: MessageTask, worker: Worker): Promise<any> {
        const messageType = this.getMessageType(task.message)
        
        switch (messageType) {
            case 'textMessage':
                return await this.processTextMessage(task.message)
            case 'imageMessage':
                return await this.processImageMessage(task.message)
            case 'videoMessage':
                return await this.processVideoMessage(task.message)
            default:
                return await this.processGenericMessage(task.message)
        }
    }
}
```

## Memory Optimization

### Efficient Caching

Implement smart caching strategies:

```typescript
class MemoryEfficientCache<T> {
    private cache = new Map<string, CacheEntry<T>>()
    private maxSize: number
    private ttl: number
    private cleanupInterval: NodeJS.Timeout
    
    constructor(maxSize = 1000, ttl = 300000) { // 5 minutes TTL
        this.maxSize = maxSize
        this.ttl = ttl
        
        // Cleanup expired entries every minute
        this.cleanupInterval = setInterval(() => {
            this.cleanup()
        }, 60000)
    }
    
    set(key: string, value: T, customTtl?: number): void {
        // Remove oldest entries if cache is full
        if (this.cache.size >= this.maxSize) {
            this.evictOldest()
        }
        
        const expiresAt = Date.now() + (customTtl || this.ttl)
        this.cache.set(key, {
            value,
            expiresAt,
            accessCount: 0,
            lastAccessed: Date.now()
        })
    }
    
    get(key: string): T | null {
        const entry = this.cache.get(key)
        if (!entry) return null
        
        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key)
            return null
        }
        
        // Update access statistics
        entry.accessCount++
        entry.lastAccessed = Date.now()
        
        return entry.value
    }
    
    private evictOldest(): void {
        let oldestKey: string | null = null
        let oldestTime = Date.now()
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed
                oldestKey = key
            }
        }
        
        if (oldestKey) {
            this.cache.delete(oldestKey)
        }
    }
    
    private cleanup(): void {
        const now = Date.now()
        const toDelete: string[] = []
        
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                toDelete.push(key)
            }
        }
        
        toDelete.forEach(key => this.cache.delete(key))
        
        // Log cache statistics
        console.log(`Cache cleanup: removed ${toDelete.length} expired entries, ${this.cache.size} remaining`)
    }
    
    getStats() {
        const now = Date.now()
        let expired = 0
        let totalAccess = 0
        
        for (const entry of this.cache.values()) {
            if (now > entry.expiresAt) expired++
            totalAccess += entry.accessCount
        }
        
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            expired,
            averageAccess: totalAccess / this.cache.size || 0
        }
    }
    
    destroy(): void {
        clearInterval(this.cleanupInterval)
        this.cache.clear()
    }
}

interface CacheEntry<T> {
    value: T
    expiresAt: number
    accessCount: number
    lastAccessed: number
}
```

### Memory Monitoring

Monitor and manage memory usage:

```typescript
class MemoryMonitor {
    private memoryThreshold = 500 * 1024 * 1024 // 500MB
    private checkInterval = 30000 // 30 seconds
    private monitoringInterval: NodeJS.Timeout
    private callbacks: Array<(usage: NodeJS.MemoryUsage) => void> = []
    
    constructor() {
        this.monitoringInterval = setInterval(() => {
            this.checkMemory()
        }, this.checkInterval)
    }
    
    onHighMemory(callback: (usage: NodeJS.MemoryUsage) => void): void {
        this.callbacks.push(callback)
    }
    
    private checkMemory(): void {
        const usage = process.memoryUsage()
        
        // Log memory usage
        console.log('Memory usage:', {
            rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
            external: `${Math.round(usage.external / 1024 / 1024)}MB`
        })
        
        // Check if memory usage is high
        if (usage.heapUsed > this.memoryThreshold) {
            console.warn('High memory usage detected!')
            
            // Notify callbacks
            this.callbacks.forEach(callback => {
                try {
                    callback(usage)
                } catch (error) {
                    console.error('Memory callback error:', error)
                }
            })
            
            // Force garbage collection if available
            if (global.gc) {
                console.log('Running garbage collection...')
                global.gc()
                
                const afterGC = process.memoryUsage()
                console.log('Memory after GC:', {
                    heapUsed: `${Math.round(afterGC.heapUsed / 1024 / 1024)}MB`,
                    freed: `${Math.round((usage.heapUsed - afterGC.heapUsed) / 1024 / 1024)}MB`
                })
            }
        }
    }
    
    getMemoryUsage(): NodeJS.MemoryUsage {
        return process.memoryUsage()
    }
    
    destroy(): void {
        clearInterval(this.monitoringInterval)
    }
}

// Usage
const memoryMonitor = new MemoryMonitor()

memoryMonitor.onHighMemory((usage) => {
    // Clear caches when memory is high
    messageCache.clear()
    userCache.clear()
    
    // Log warning
    logger.warn('High memory usage, cleared caches', {
        heapUsed: usage.heapUsed,
        threshold: 500 * 1024 * 1024
    })
})
```

## Database Optimization

### Connection Pooling

Optimize database connections:

```typescript
class OptimizedDatabase {
    private pool: Pool
    private queryCache = new Map<string, any>()
    private preparedStatements = new Map<string, any>()
    
    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            
            // Connection pool settings
            min: 5,                    // Minimum connections
            max: 20,                   // Maximum connections
            idleTimeoutMillis: 30000,  // Close idle connections after 30s
            connectionTimeoutMillis: 2000, // Timeout for new connections
            
            // Performance settings
            statement_timeout: 10000,   // 10s query timeout
            query_timeout: 10000,
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000
        })
        
        this.pool.on('error', (err) => {
            console.error('Database pool error:', err)
        })
        
        this.pool.on('connect', (client) => {
            console.log('New database connection established')
        })
    }
    
    async query(text: string, params?: any[]): Promise<any> {
        const cacheKey = `${text}:${JSON.stringify(params)}`
        
        // Check cache for read queries
        if (text.trim().toLowerCase().startsWith('select')) {
            const cached = this.queryCache.get(cacheKey)
            if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
                return cached.result
            }
        }
        
        const start = Date.now()
        const client = await this.pool.connect()
        
        try {
            const result = await client.query(text, params)
            const duration = Date.now() - start
            
            // Log slow queries
            if (duration > 1000) {
                console.warn('Slow query detected:', {
                    query: text,
                    duration,
                    params: params?.length
                })
            }
            
            // Cache read results
            if (text.trim().toLowerCase().startsWith('select')) {
                this.queryCache.set(cacheKey, {
                    result,
                    timestamp: Date.now()
                })
                
                // Limit cache size
                if (this.queryCache.size > 1000) {
                    const firstKey = this.queryCache.keys().next().value
                    this.queryCache.delete(firstKey)
                }
            }
            
            return result
        } finally {
            client.release()
        }
    }
    
    async batchInsert(table: string, columns: string[], rows: any[][]): Promise<void> {
        if (rows.length === 0) return
        
        const client = await this.pool.connect()
        
        try {
            await client.query('BEGIN')
            
            // Use COPY for large batch inserts
            if (rows.length > 100) {
                const copyText = `COPY ${table} (${columns.join(', ')}) FROM STDIN WITH CSV`
                const stream = client.query(copyFrom(copyText))
                
                for (const row of rows) {
                    stream.write(row.join(',') + '\n')
                }
                
                stream.end()
                await new Promise((resolve, reject) => {
                    stream.on('end', resolve)
                    stream.on('error', reject)
                })
            } else {
                // Use regular INSERT for smaller batches
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
                const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
                
                for (const row of rows) {
                    await client.query(query, row)
                }
            }
            
            await client.query('COMMIT')
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }
    }
    
    async getStats() {
        return {
            totalConnections: this.pool.totalCount,
            idleConnections: this.pool.idleCount,
            waitingClients: this.pool.waitingCount,
            queryCacheSize: this.queryCache.size
        }
    }
}
```

### Query Optimization

Optimize database queries:

```typescript
class QueryOptimizer {
    // Use prepared statements for frequently executed queries
    private static readonly PREPARED_QUERIES = {
        GET_USER: 'SELECT * FROM users WHERE id = $1',
        GET_MESSAGES: 'SELECT * FROM messages WHERE chat_id = $1 ORDER BY timestamp DESC LIMIT $2',
        INSERT_MESSAGE: 'INSERT INTO messages (id, chat_id, sender, content, timestamp) VALUES ($1, $2, $3, $4, $5)',
        UPDATE_USER_ACTIVITY: 'UPDATE users SET last_activity = $1 WHERE id = $2'
    }
    
    static async getUserById(db: OptimizedDatabase, userId: string) {
        return await db.query(this.PREPARED_QUERIES.GET_USER, [userId])
    }
    
    static async getRecentMessages(db: OptimizedDatabase, chatId: string, limit = 50) {
        return await db.query(this.PREPARED_QUERIES.GET_MESSAGES, [chatId, limit])
    }
    
    static async insertMessage(db: OptimizedDatabase, message: MessageData) {
        return await db.query(this.PREPARED_QUERIES.INSERT_MESSAGE, [
            message.id,
            message.chatId,
            message.sender,
            JSON.stringify(message.content),
            message.timestamp
        ])
    }
    
    // Batch operations for better performance
    static async insertMessages(db: OptimizedDatabase, messages: MessageData[]) {
        const columns = ['id', 'chat_id', 'sender', 'content', 'timestamp']
        const rows = messages.map(msg => [
            msg.id,
            msg.chatId,
            msg.sender,
            JSON.stringify(msg.content),
            msg.timestamp
        ])
        
        await db.batchInsert('messages', columns, rows)
    }
    
    // Use indexes effectively
    static async getMessagesByTimeRange(
        db: OptimizedDatabase, 
        chatId: string, 
        startTime: Date, 
        endTime: Date
    ) {
        // This query will use the index on (chat_id, timestamp)
        const query = `
            SELECT * FROM messages 
            WHERE chat_id = $1 
            AND timestamp BETWEEN $2 AND $3 
            ORDER BY timestamp DESC
        `
        
        return await db.query(query, [chatId, startTime, endTime])
    }
    
    // Aggregate queries for analytics
    static async getMessageStats(db: OptimizedDatabase, chatId: string) {
        const query = `
            SELECT 
                COUNT(*) as total_messages,
                COUNT(DISTINCT sender) as unique_senders,
                DATE_TRUNC('day', timestamp) as date,
                COUNT(*) as daily_count
            FROM messages 
            WHERE chat_id = $1 
            AND timestamp > NOW() - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('day', timestamp)
            ORDER BY date DESC
        `
        
        return await db.query(query, [chatId])
    }
}
```

## Network Optimization

### Request Batching

Batch API requests to reduce overhead:

```typescript
class RequestBatcher {
    private batches = new Map<string, BatchRequest[]>()
    private batchTimeouts = new Map<string, NodeJS.Timeout>()
    private maxBatchSize = 10
    private batchTimeout = 100 // 100ms
    
    async addRequest(type: string, request: BatchRequest): Promise<any> {
        return new Promise((resolve, reject) => {
            const batchRequest = { ...request, resolve, reject }
            
            if (!this.batches.has(type)) {
                this.batches.set(type, [])
            }
            
            const batch = this.batches.get(type)!
            batch.push(batchRequest)
            
            // Process immediately if batch is full
            if (batch.length >= this.maxBatchSize) {
                this.processBatch(type)
            } else if (!this.batchTimeouts.has(type)) {
                // Set timeout for partial batch
                const timeout = setTimeout(() => {
                    this.processBatch(type)
                }, this.batchTimeout)
                
                this.batchTimeouts.set(type, timeout)
            }
        })
    }
    
    private async processBatch(type: string): Promise<void> {
        const batch = this.batches.get(type)
        if (!batch || batch.length === 0) return
        
        // Clear timeout
        const timeout = this.batchTimeouts.get(type)
        if (timeout) {
            clearTimeout(timeout)
            this.batchTimeouts.delete(type)
        }
        
        // Remove batch from queue
        this.batches.set(type, [])
        
        try {
            const results = await this.executeBatch(type, batch)
            
            // Resolve individual requests
            batch.forEach((request, index) => {
                request.resolve(results[index])
            })
        } catch (error) {
            // Reject all requests in batch
            batch.forEach(request => {
                request.reject(error)
            })
        }
    }
    
    private async executeBatch(type: string, batch: BatchRequest[]): Promise<any[]> {
        switch (type) {
            case 'sendMessage':
                return await this.batchSendMessages(batch)
            case 'getUserProfile':
                return await this.batchGetUserProfiles(batch)
            case 'getGroupMetadata':
                return await this.batchGetGroupMetadata(batch)
            default:
                throw new Error(`Unknown batch type: ${type}`)
        }
    }
    
    private async batchSendMessages(batch: BatchRequest[]): Promise<any[]> {
        // Send messages in parallel with concurrency limit
        const concurrency = 5
        const results: any[] = []
        
        for (let i = 0; i < batch.length; i += concurrency) {
            const chunk = batch.slice(i, i + concurrency)
            const chunkResults = await Promise.allSettled(
                chunk.map(request => 
                    this.sock.sendMessage(request.jid, request.content)
                )
            )
            
            results.push(...chunkResults.map(result => 
                result.status === 'fulfilled' ? result.value : result.reason
            ))
        }
        
        return results
    }
}

interface BatchRequest {
    jid?: string
    content?: any
    resolve?: (value: any) => void
    reject?: (error: any) => void
    [key: string]: any
}
```

### Connection Optimization

Optimize WebSocket connections:

```typescript
class OptimizedConnection {
    private reconnectAttempts = 0
    private maxReconnectAttempts = 5
    private reconnectDelay = 1000
    private heartbeatInterval: NodeJS.Timeout | null = null
    private connectionMetrics = {
        connectTime: 0,
        messagesSent: 0,
        messagesReceived: 0,
        reconnections: 0
    }
    
    async connect(): Promise<WASocket> {
        const startTime = Date.now()
        
        const sock = makeWASocket({
            auth: this.state,
            
            // Connection optimization
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            retryRequestDelayMs: 1000,
            maxMsgRetryCount: 3,
            
            // Reduce bandwidth usage
            syncFullHistory: false,
            shouldSyncHistoryMessage: (msg) => {
                // Only sync recent messages
                const messageAge = Date.now() - (msg.messageTimestamp * 1000)
                return messageAge < 24 * 60 * 60 * 1000 // Last 24 hours
            },
            
            // Optimize message handling
            getMessage: async (key) => {
                // Implement efficient message retrieval
                return await this.getMessageFromCache(key)
            }
        })
        
        this.setupConnectionOptimizations(sock)
        this.connectionMetrics.connectTime = Date.now() - startTime
        
        return sock
    }
    
    private setupConnectionOptimizations(sock: WASocket): void {
        // Connection monitoring
        sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
            if (connection === 'open') {
                this.reconnectAttempts = 0
                this.startHeartbeat(sock)
                console.log('Connection established in', this.connectionMetrics.connectTime, 'ms')
            } else if (connection === 'close') {
                this.stopHeartbeat()
                this.handleDisconnection(lastDisconnect)
            }
        })
        
        // Message tracking
        sock.ev.on('messages.upsert', ({ messages }) => {
            this.connectionMetrics.messagesReceived += messages.length
        })
        
        // Optimize message sending
        const originalSendMessage = sock.sendMessage.bind(sock)
        sock.sendMessage = async (jid: string, content: any, options?: any) => {
            const result = await originalSendMessage(jid, content, options)
            this.connectionMetrics.messagesSent++
            return result
        }
    }
    
    private startHeartbeat(sock: WASocket): void {
        this.heartbeatInterval = setInterval(async () => {
            try {
                // Send a lightweight ping to keep connection alive
                await sock.query({
                    tag: 'iq',
                    attrs: { type: 'get', to: 's.whatsapp.net' },
                    content: [{ tag: 'ping', attrs: {} }]
                })
            } catch (error) {
                console.warn('Heartbeat failed:', error.message)
            }
        }, 30000) // Every 30 seconds
    }
    
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval)
            this.heartbeatInterval = null
        }
    }
    
    private async handleDisconnection(lastDisconnect: any): Promise<void> {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        
        if (statusCode === DisconnectReason.loggedOut) {
            console.log('Logged out, stopping reconnection attempts')
            return
        }
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            this.connectionMetrics.reconnections++
            
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
            
            setTimeout(() => {
                this.connect()
            }, delay)
        } else {
            console.error('Max reconnection attempts reached')
        }
    }
    
    getConnectionMetrics() {
        return { ...this.connectionMetrics }
    }
}
```

## Performance Monitoring

### Real-time Metrics

Monitor performance in real-time:

```typescript
class PerformanceMonitor {
    private metrics = new Map<string, MetricData>()
    private histograms = new Map<string, number[]>()
    
    // Timer for measuring operation duration
    timer(name: string): () => void {
        const start = performance.now()
        
        return () => {
            const duration = performance.now() - start
            this.recordMetric(name, duration)
        }
    }
    
    // Record a metric value
    recordMetric(name: string, value: number): void {
        const existing = this.metrics.get(name)
        
        if (existing) {
            existing.count++
            existing.sum += value
            existing.min = Math.min(existing.min, value)
            existing.max = Math.max(existing.max, value)
            existing.avg = existing.sum / existing.count
        } else {
            this.metrics.set(name, {
                count: 1,
                sum: value,
                min: value,
                max: value,
                avg: value
            })
        }
        
        // Update histogram
        const histogram = this.histograms.get(name) || []
        histogram.push(value)
        
        // Keep only last 1000 values
        if (histogram.length > 1000) {
            histogram.shift()
        }
        
        this.histograms.set(name, histogram)
    }
    
    // Get percentile from histogram
    getPercentile(name: string, percentile: number): number {
        const histogram = this.histograms.get(name)
        if (!histogram || histogram.length === 0) return 0
        
        const sorted = [...histogram].sort((a, b) => a - b)
        const index = Math.ceil((percentile / 100) * sorted.length) - 1
        return sorted[Math.max(0, index)]
    }
    
    // Get all metrics
    getMetrics(): Record<string, any> {
        const result: Record<string, any> = {}
        
        for (const [name, data] of this.metrics.entries()) {
            result[name] = {
                ...data,
                p50: this.getPercentile(name, 50),
                p95: this.getPercentile(name, 95),
                p99: this.getPercentile(name, 99)
            }
        }
        
        return result
    }
    
    // Reset metrics
    reset(): void {
        this.metrics.clear()
        this.histograms.clear()
    }
}

interface MetricData {
    count: number
    sum: number
    min: number
    max: number
    avg: number
}

// Usage
const perfMonitor = new PerformanceMonitor()

// Measure message processing time
const endTimer = perfMonitor.timer('message_processing')
await processMessage(message)
endTimer()

// Record custom metrics
perfMonitor.recordMetric('queue_size', messageQueue.length)
perfMonitor.recordMetric('active_connections', activeConnections)

// Get performance report
const metrics = perfMonitor.getMetrics()
console.log('Performance metrics:', metrics)
```

## Best Practices Summary

### 1. Message Processing
- Use batch processing for high-volume scenarios
- Implement async patterns to prevent blocking
- Add concurrency limits to prevent resource exhaustion

### 2. Memory Management
- Implement efficient caching with TTL and size limits
- Monitor memory usage and trigger cleanup when needed
- Use streaming for large file operations

### 3. Database Optimization
- Use connection pooling with appropriate limits
- Implement query caching for read operations
- Use batch operations for bulk data operations

### 4. Network Optimization
- Batch API requests to reduce overhead
- Implement proper connection management
- Use heartbeat to maintain connection health

### 5. Monitoring
- Track key performance metrics
- Set up alerts for performance degradation
- Regular performance testing and optimization

---

**Related Pages:**
- [Best Practices](./README.md) - General best practices
- [Scaling](../deployment/scaling.md) - Application scaling
- [Monitoring](../deployment/monitoring.md) - Performance monitoring
