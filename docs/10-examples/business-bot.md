---
id: business-bot
title: Business Bot Example
sidebar_position: 4
description: Build a WhatsApp Business bot with catalog management, order processing, and customer support features.
keywords: [baileys, business bot, whatsapp business, catalog, orders, customer support, ecommerce]
---

# Business Bot Example

This example demonstrates how to build a comprehensive WhatsApp Business bot with catalog management, order processing, customer support, and automated responses.

## Complete Business Bot

```typescript
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

interface Product {
    id: string
    name: string
    description: string
    price: number
    currency: string
    image?: string
    category: string
    inStock: boolean
    sku: string
}

interface Order {
    id: string
    customerId: string
    products: Array<{ productId: string, quantity: number, price: number }>
    total: number
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
    createdAt: Date
    customerInfo: {
        name: string
        phone: string
        address?: string
    }
}

class BusinessBot {
    private sock: WASocket
    private products: Map<string, Product> = new Map()
    private orders: Map<string, Order> = new Map()
    private customerSessions: Map<string, any> = new Map()
    private businessInfo = {
        name: 'My Business',
        description: 'Quality products and services',
        address: '123 Business St, City',
        phone: '+1234567890',
        email: 'contact@mybusiness.com',
        website: 'https://mybusiness.com',
        hours: 'Mon-Fri 9AM-6PM'
    }

    constructor() {
        this.initializeProducts()
    }

    private initializeProducts() {
        // Sample products
        const sampleProducts: Product[] = [
            {
                id: 'prod1',
                name: 'Premium T-Shirt',
                description: '100% cotton premium quality t-shirt',
                price: 29.99,
                currency: 'USD',
                category: 'Clothing',
                inStock: true,
                sku: 'TSH001'
            },
            {
                id: 'prod2',
                name: 'Wireless Headphones',
                description: 'High-quality wireless headphones with noise cancellation',
                price: 149.99,
                currency: 'USD',
                category: 'Electronics',
                inStock: true,
                sku: 'WH001'
            },
            {
                id: 'prod3',
                name: 'Coffee Mug',
                description: 'Ceramic coffee mug with custom design',
                price: 12.99,
                currency: 'USD',
                category: 'Home',
                inStock: false,
                sku: 'MUG001'
            }
        ]

        sampleProducts.forEach(product => {
            this.products.set(product.id, product)
        })
    }

    async start() {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_business_bot')

        this.sock = makeWASocket({
            auth: state,
            printQRInTerminal: true
        })

        this.sock.ev.on('connection.update', this.handleConnection.bind(this))
        this.sock.ev.on('creds.update', saveCreds)
        this.sock.ev.on('messages.upsert', this.handleMessages.bind(this))
    }

    private handleConnection({ connection, lastDisconnect }: any) {
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut

            if (shouldReconnect) {
                console.log('Reconnecting...')
                this.start()
            }
        } else if (connection === 'open') {
            console.log('✅ Business Bot connected!')
        }
    }

    private async handleMessages({ messages, type }: any) {
        if (type !== 'notify') return

        for (const message of messages) {
            if (message.key.fromMe) continue

            const customerId = message.key.remoteJid
            const text = this.getMessageText(message)

            // Handle different message types
            const messageType = Object.keys(message.message || {})[0]

            switch (messageType) {
                case 'conversation':
                case 'extendedTextMessage':
                    await this.handleTextMessage(text, customerId)
                    break
                case 'listResponseMessage':
                    await this.handleListResponse(message, customerId)
                    break
                case 'buttonsResponseMessage':
                    await this.handleButtonResponse(message, customerId)
                    break
                case 'orderMessage':
                    await this.handleOrderMessage(message, customerId)
                    break
                default:
                    await this.sendDefaultResponse(customerId)
            }
        }
    }

    private async handleTextMessage(text: string, customerId: string) {
        const lowerText = text.toLowerCase()

        // Check for common greetings
        if (this.isGreeting(lowerText)) {
            await this.sendWelcomeMessage(customerId)
            return
        }

        // Handle commands
        if (text.startsWith('/')) {
            await this.handleCommand(text, customerId)
            return
        }

        // Handle keywords
        if (lowerText.includes('catalog') || lowerText.includes('products') || lowerText.includes('shop')) {
            await this.sendCatalog(customerId)
        } else if (lowerText.includes('order') || lowerText.includes('buy')) {
            await this.showOrderOptions(customerId)
        } else if (lowerText.includes('track') || lowerText.includes('status')) {
            await this.showOrderTracking(customerId)
        } else if (lowerText.includes('support') || lowerText.includes('help')) {
            await this.sendSupportMenu(customerId)
        } else if (lowerText.includes('contact') || lowerText.includes('info')) {
            await this.sendBusinessInfo(customerId)
        } else {
            await this.sendMainMenu(customerId)
        }
    }

    private async handleCommand(text: string, customerId: string) {
        const args = text.slice(1).split(' ')
        const command = args[0].toLowerCase()

        switch (command) {
            case 'start':
            case 'menu':
                await this.sendMainMenu(customerId)
                break
            case 'catalog':
                await this.sendCatalog(customerId)
                break
            case 'search':
                await this.searchProducts(args.slice(1).join(' '), customerId)
                break
            case 'order':
                await this.showOrderOptions(customerId)
                break
            case 'track':
                await this.showOrderTracking(customerId)
                break
            case 'support':
                await this.sendSupportMenu(customerId)
                break
            case 'info':
                await this.sendBusinessInfo(customerId)
                break
            default:
                await this.sendMainMenu(customerId)
        }
    }

    private async sendWelcomeMessage(customerId: string) {
        const welcomeText = `👋 Welcome to *${this.businessInfo.name}*!\n\n` +
            `${this.businessInfo.description}\n\n` +
            `I'm here to help you browse our products and place orders. ` +
            `Type *menu* to see available options or *catalog* to browse products.`

        await this.sock.sendMessage(customerId, {
            text: welcomeText
        })

        await this.sendMainMenu(customerId)
    }

    private async sendMainMenu(customerId: string) {
        const menuMessage = {
            text: '🏪 *Main Menu*\n\nWhat would you like to do?',
            footer: this.businessInfo.name,
            buttons: [
                { buttonId: 'catalog', buttonText: { displayText: '🛍️ Browse Catalog' }, type: 1 },
                { buttonId: 'orders', buttonText: { displayText: '📦 My Orders' }, type: 1 },
                { buttonId: 'support', buttonText: { displayText: '🆘 Support' }, type: 1 }
            ],
            headerType: 1
        }

        await this.sock.sendMessage(customerId, { buttonMessage: menuMessage })
    }

    private async sendCatalog(customerId: string) {
        const categories = [...new Set(Array.from(this.products.values()).map(p => p.category))]

        const sections = categories.map(category => ({
            title: category,
            rows: Array.from(this.products.values())
                .filter(p => p.category === category)
                .map(product => ({
                    title: product.name,
                    description: `$${product.price} - ${product.inStock ? '✅ In Stock' : '❌ Out of Stock'}`,
                    rowId: `product_${product.id}`
                }))
        }))

        const listMessage = {
            text: '🛍️ *Product Catalog*\n\nBrowse our products by category:',
            footer: 'Select a product to view details',
            title: 'Our Products',
            buttonText: 'Browse Products',
            sections
        }

        await this.sock.sendMessage(customerId, { listMessage })
    }

    private async handleListResponse(message: any, customerId: string) {
        const selectedId = message.message.listResponseMessage.singleSelectReply.selectedRowId

        if (selectedId.startsWith('product_')) {
            const productId = selectedId.replace('product_', '')
            await this.showProductDetails(productId, customerId)
        } else if (selectedId.startsWith('order_')) {
            const orderId = selectedId.replace('order_', '')
            await this.showOrderDetails(orderId, customerId)
        }
    }

    private async showProductDetails(productId: string, customerId: string) {
        const product = this.products.get(productId)
        if (!product) {
            await this.sock.sendMessage(customerId, {
                text: '❌ Product not found'
            })
            return
        }

        let productText = `🛍️ *${product.name}*\n\n`
        productText += `📝 ${product.description}\n\n`
        productText += `💰 Price: $${product.price} ${product.currency}\n`
        productText += `📦 SKU: ${product.sku}\n`
        productText += `📊 Status: ${product.inStock ? '✅ In Stock' : '❌ Out of Stock'}\n`
        productText += `🏷️ Category: ${product.category}`

        const buttons = []

        if (product.inStock) {
            buttons.push({
                buttonId: `add_to_cart_${productId}`,
                buttonText: { displayText: '🛒 Add to Cart' },
                type: 1
            })
        }

        buttons.push(
            {
                buttonId: 'back_to_catalog',
                buttonText: { displayText: '⬅️ Back to Catalog' },
                type: 1
            },
            {
                buttonId: 'main_menu',
                buttonText: { displayText: '🏠 Main Menu' },
                type: 1
            }
        )

        const productMessage = {
            text: productText,
            footer: this.businessInfo.name,
            buttons,
            headerType: 1
        }

        await this.sock.sendMessage(customerId, { buttonMessage: productMessage })
    }

    private async handleButtonResponse(message: any, customerId: string) {
        const buttonId = message.message.buttonsResponseMessage.selectedButtonId

        if (buttonId === 'catalog') {
            await this.sendCatalog(customerId)
        } else if (buttonId === 'orders') {
            await this.showCustomerOrders(customerId)
        } else if (buttonId === 'support') {
            await this.sendSupportMenu(customerId)
        } else if (buttonId === 'back_to_catalog') {
            await this.sendCatalog(customerId)
        } else if (buttonId === 'main_menu') {
            await this.sendMainMenu(customerId)
        } else if (buttonId.startsWith('add_to_cart_')) {
            const productId = buttonId.replace('add_to_cart_', '')
            await this.addToCart(productId, customerId)
        } else if (buttonId.startsWith('confirm_order_')) {
            const orderId = buttonId.replace('confirm_order_', '')
            await this.confirmOrder(orderId, customerId)
        }
    }

    private async addToCart(productId: string, customerId: string) {
        const product = this.products.get(productId)
        if (!product || !product.inStock) {
            await this.sock.sendMessage(customerId, {
                text: '❌ Product is not available'
            })
            return
        }

        // Get or create customer session
        let session = this.customerSessions.get(customerId) || { cart: [] }

        // Check if product already in cart
        const existingItem = session.cart.find((item: any) => item.productId === productId)

        if (existingItem) {
            existingItem.quantity += 1
        } else {
            session.cart.push({
                productId,
                quantity: 1,
                price: product.price
            })
        }

        this.customerSessions.set(customerId, session)

        await this.sock.sendMessage(customerId, {
            text: `✅ *${product.name}* added to cart!\n\nType *cart* to view your cart or continue shopping.`
        })

        await this.sendMainMenu(customerId)
    }

    private async showCustomerOrders(customerId: string) {
        const customerOrders = Array.from(this.orders.values())
            .filter(order => order.customerId === customerId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        if (customerOrders.length === 0) {
            await this.sock.sendMessage(customerId, {
                text: '📦 You have no orders yet.\n\nBrowse our catalog to place your first order!'
            })
            await this.sendMainMenu(customerId)
            return
        }

        const sections = [{
            title: 'Your Orders',
            rows: customerOrders.slice(0, 10).map(order => ({
                title: `Order #${order.id}`,
                description: `$${order.total.toFixed(2)} - ${order.status.toUpperCase()}`,
                rowId: `order_${order.id}`
            }))
        }]

        const listMessage = {
            text: '📦 *Your Orders*\n\nSelect an order to view details:',
            footer: 'Recent orders',
            title: 'Order History',
            buttonText: 'View Orders',
            sections
        }

        await this.sock.sendMessage(customerId, { listMessage })
    }

    private async showOrderDetails(orderId: string, customerId: string) {
        const order = this.orders.get(orderId)
        if (!order || order.customerId !== customerId) {
            await this.sock.sendMessage(customerId, {
                text: '❌ Order not found'
            })
            return
        }

        let orderText = `📦 *Order #${order.id}*\n\n`
        orderText += `📅 Date: ${order.createdAt.toLocaleDateString()}\n`
        orderText += `📊 Status: ${order.status.toUpperCase()}\n`
        orderText += `💰 Total: $${order.total.toFixed(2)}\n\n`
        orderText += `📋 *Items:*\n`

        for (const item of order.products) {
            const product = this.products.get(item.productId)
            if (product) {
                orderText += `• ${product.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}\n`
            }
        }

        if (order.customerInfo.address) {
            orderText += `\n📍 *Delivery Address:*\n${order.customerInfo.address}`
        }

        await this.sock.sendMessage(customerId, {
            text: orderText
        })
    }

    private async sendSupportMenu(customerId: string) {
        const supportText = `🆘 *Customer Support*\n\n` +
            `How can we help you today?`

        const buttons = [
            { buttonId: 'faq', buttonText: { displayText: '❓ FAQ' }, type: 1 },
            { buttonId: 'contact_human', buttonText: { displayText: '👨‍💼 Talk to Human' }, type: 1 },
            { buttonId: 'business_info', buttonText: { displayText: 'ℹ️ Business Info' }, type: 1 }
        ]

        await this.sock.sendMessage(customerId, {
            buttonMessage: {
                text: supportText,
                footer: this.businessInfo.name,
                buttons,
                headerType: 1
            }
        })
    }

    private async sendBusinessInfo(customerId: string) {
        let infoText = `ℹ️ *${this.businessInfo.name}*\n\n`
        infoText += `📝 ${this.businessInfo.description}\n\n`
        infoText += `📍 *Address:*\n${this.businessInfo.address}\n\n`
        infoText += `📞 *Phone:* ${this.businessInfo.phone}\n`
        infoText += `📧 *Email:* ${this.businessInfo.email}\n`
        infoText += `🌐 *Website:* ${this.businessInfo.website}\n\n`
        infoText += `🕒 *Business Hours:*\n${this.businessInfo.hours}`

        await this.sock.sendMessage(customerId, {
            text: infoText
        })
    }

    private async searchProducts(query: string, customerId: string) {
        if (!query.trim()) {
            await this.sock.sendMessage(customerId, {
                text: '❌ Please provide a search term\n\nExample: /search headphones'
            })
            return
        }

        const results = Array.from(this.products.values()).filter(product =>
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.description.toLowerCase().includes(query.toLowerCase()) ||
            product.category.toLowerCase().includes(query.toLowerCase())
        )

        if (results.length === 0) {
            await this.sock.sendMessage(customerId, {
                text: `❌ No products found for "${query}"\n\nTry browsing our catalog instead.`
            })
            await this.sendCatalog(customerId)
            return
        }

        const sections = [{
            title: `Search Results (${results.length})`,
            rows: results.map(product => ({
                title: product.name,
                description: `$${product.price} - ${product.inStock ? '✅ In Stock' : '❌ Out of Stock'}`,
                rowId: `product_${product.id}`
            }))
        }]

        const listMessage = {
            text: `🔍 *Search Results for "${query}"*\n\nFound ${results.length} product(s):`,
            footer: 'Select a product to view details',
            title: 'Search Results',
            buttonText: 'View Products',
            sections
        }

        await this.sock.sendMessage(customerId, { listMessage })
    }

    private isGreeting(text: string): boolean {
        const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening']
        return greetings.some(greeting => text.includes(greeting))
    }

    private getMessageText(message: any): string {
        return message.message?.conversation ||
               message.message?.extendedTextMessage?.text ||
               message.message?.imageMessage?.caption ||
               message.message?.videoMessage?.caption || ''
    }

    private async sendDefaultResponse(customerId: string) {
        await this.sock.sendMessage(customerId, {
            text: `I'm not sure how to handle that message type. Type *menu* to see available options.`
        })

        await this.sendMainMenu(customerId)
    }
}

// Start the bot
const businessBot = new BusinessBot()
businessBot.start().catch(console.error)
```