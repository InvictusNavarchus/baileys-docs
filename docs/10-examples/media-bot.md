---
id: media-bot
title: Media Bot Example
sidebar_position: 2
description: Build a WhatsApp bot that handles media messages - images, videos, audio, and documents.
keywords: [baileys, media bot, image processing, video, audio, document, download, upload]
---

# Media Bot Example

This example demonstrates how to build a WhatsApp bot that can handle various types of media messages including images, videos, audio files, and documents.

## Complete Media Bot

```typescript
import makeWASocket, { DisconnectReason, useMultiFileAuthState, downloadMediaMessage } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'

class MediaBot {
    private sock: WASocket
    private mediaDir = './media'
    
    constructor() {
        // Create media directory if it doesn't exist
        if (!fs.existsSync(this.mediaDir)) {
            fs.mkdirSync(this.mediaDir, { recursive: true })
        }
    }
    
    async start() {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_media_bot')
        
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
            console.log('✅ Media Bot connected!')
        }
    }
    
    private async handleMessages({ messages, type }: any) {
        if (type !== 'notify') return
        
        for (const message of messages) {
            if (message.key.fromMe) continue
            
            const messageType = Object.keys(message.message || {})[0]
            const sender = message.key.remoteJid
            
            try {
                switch (messageType) {
                    case 'imageMessage':
                        await this.handleImageMessage(message, sender)
                        break
                    case 'videoMessage':
                        await this.handleVideoMessage(message, sender)
                        break
                    case 'audioMessage':
                        await this.handleAudioMessage(message, sender)
                        break
                    case 'documentMessage':
                        await this.handleDocumentMessage(message, sender)
                        break
                    case 'conversation':
                    case 'extendedTextMessage':
                        await this.handleTextMessage(message, sender)
                        break
                }
            } catch (error) {
                console.error('Error handling message:', error)
                await this.sendErrorMessage(sender, 'Failed to process your message')
            }
        }
    }
    
    private async handleImageMessage(message: any, sender: string) {
        const imageMessage = message.message.imageMessage
        const caption = imageMessage.caption || ''
        
        console.log(`📸 Received image from ${sender}`)
        
        try {
            // Download the image
            const buffer = await downloadMediaMessage(message, 'buffer', {})
            const filename = `image_${Date.now()}.jpg`
            const filepath = path.join(this.mediaDir, filename)
            
            // Save original image
            fs.writeFileSync(filepath, buffer)
            
            // Get image info
            const metadata = await sharp(buffer).metadata()
            const fileSize = (buffer.length / 1024 / 1024).toFixed(2) // MB
            
            let response = `✅ Image received and saved!\n\n`
            response += `📊 **Image Info:**\n`
            response += `• Format: ${metadata.format?.toUpperCase()}\n`
            response += `• Dimensions: ${metadata.width}x${metadata.height}\n`
            response += `• Size: ${fileSize} MB\n`
            response += `• Filename: ${filename}`
            
            if (caption) {
                response += `\n• Caption: ${caption}`
            }
            
            await this.sock.sendMessage(sender, { text: response })
            
            // Check if user wants image processing
            if (caption.toLowerCase().includes('resize')) {
                await this.resizeImage(buffer, sender, filename)
            } else if (caption.toLowerCase().includes('thumbnail')) {
                await this.createThumbnail(buffer, sender, filename)
            } else if (caption.toLowerCase().includes('info')) {
                await this.analyzeImage(buffer, sender)
            }
            
        } catch (error) {
            console.error('Error processing image:', error)
            await this.sendErrorMessage(sender, 'Failed to process image')
        }
    }
    
    private async handleVideoMessage(message: any, sender: string) {
        const videoMessage = message.message.videoMessage
        const caption = videoMessage.caption || ''
        const isGif = videoMessage.gifPlayback
        
        console.log(`🎥 Received ${isGif ? 'GIF' : 'video'} from ${sender}`)
        
        try {
            const buffer = await downloadMediaMessage(message, 'buffer', {})
            const extension = isGif ? 'gif' : 'mp4'
            const filename = `video_${Date.now()}.${extension}`
            const filepath = path.join(this.mediaDir, filename)
            
            fs.writeFileSync(filepath, buffer)
            
            const fileSize = (buffer.length / 1024 / 1024).toFixed(2)
            const duration = videoMessage.seconds || 'Unknown'
            
            let response = `✅ ${isGif ? 'GIF' : 'Video'} received and saved!\n\n`
            response += `📊 **Video Info:**\n`
            response += `• Duration: ${duration}s\n`
            response += `• Size: ${fileSize} MB\n`
            response += `• Filename: ${filename}`
            
            if (caption) {
                response += `\n• Caption: ${caption}`
            }
            
            await this.sock.sendMessage(sender, { text: response })
            
            // Process video if requested
            if (caption.toLowerCase().includes('compress')) {
                await this.compressVideo(filepath, sender)
            } else if (caption.toLowerCase().includes('thumbnail')) {
                await this.extractVideoThumbnail(filepath, sender)
            }
            
        } catch (error) {
            console.error('Error processing video:', error)
            await this.sendErrorMessage(sender, 'Failed to process video')
        }
    }
    
    private async handleAudioMessage(message: any, sender: string) {
        const audioMessage = message.message.audioMessage
        const isPTT = audioMessage.ptt
        const duration = audioMessage.seconds || 'Unknown'
        
        console.log(`🎵 Received ${isPTT ? 'voice message' : 'audio'} from ${sender}`)
        
        try {
            const buffer = await downloadMediaMessage(message, 'buffer', {})
            const extension = isPTT ? 'ogg' : 'mp3'
            const filename = `audio_${Date.now()}.${extension}`
            const filepath = path.join(this.mediaDir, filename)
            
            fs.writeFileSync(filepath, buffer)
            
            const fileSize = (buffer.length / 1024).toFixed(2) // KB
            
            let response = `✅ ${isPTT ? 'Voice message' : 'Audio'} received and saved!\n\n`
            response += `📊 **Audio Info:**\n`
            response += `• Duration: ${duration}s\n`
            response += `• Size: ${fileSize} KB\n`
            response += `• Format: ${extension.toUpperCase()}\n`
            response += `• Filename: ${filename}`
            
            await this.sock.sendMessage(sender, { text: response })
            
            // Convert audio format if requested
            if (isPTT) {
                await this.convertAudio(filepath, sender, 'mp3')
            }
            
        } catch (error) {
            console.error('Error processing audio:', error)
            await this.sendErrorMessage(sender, 'Failed to process audio')
        }
    }
    
    private async handleDocumentMessage(message: any, sender: string) {
        const documentMessage = message.message.documentMessage
        const filename = documentMessage.fileName || 'document'
        const mimetype = documentMessage.mimetype || 'unknown'
        const caption = documentMessage.caption || ''
        
        console.log(`📄 Received document from ${sender}: ${filename}`)
        
        try {
            const buffer = await downloadMediaMessage(message, 'buffer', {})
            const filepath = path.join(this.mediaDir, filename)
            
            fs.writeFileSync(filepath, buffer)
            
            const fileSize = (buffer.length / 1024 / 1024).toFixed(2)
            
            let response = `✅ Document received and saved!\n\n`
            response += `📊 **Document Info:**\n`
            response += `• Filename: ${filename}\n`
            response += `• Type: ${mimetype}\n`
            response += `• Size: ${fileSize} MB`
            
            if (caption) {
                response += `\n• Caption: ${caption}`
            }
            
            await this.sock.sendMessage(sender, { text: response })
            
            // Analyze document type
            await this.analyzeDocument(filepath, mimetype, sender)
            
        } catch (error) {
            console.error('Error processing document:', error)
            await this.sendErrorMessage(sender, 'Failed to process document')
        }
    }
    
    private async handleTextMessage(message: any, sender: string) {
        const text = message.message.conversation || message.message.extendedTextMessage?.text || ''
        
        if (text.startsWith('/')) {
            await this.handleCommand(text, sender)
        }
    }
    
    private async handleCommand(text: string, sender: string) {
        const args = text.slice(1).split(' ')
        const command = args[0].toLowerCase()
        
        switch (command) {
            case 'help':
                await this.sendHelpMessage(sender)
                break
            case 'stats':
                await this.sendStatsMessage(sender)
                break
            case 'clear':
                await this.clearMediaFiles(sender)
                break
            case 'list':
                await this.listMediaFiles(sender)
                break
            default:
                await this.sock.sendMessage(sender, {
                    text: `❌ Unknown command: ${command}\nType /help for available commands`
                })
        }
    }
    
    private async resizeImage(buffer: Buffer, sender: string, originalFilename: string) {
        try {
            const resized = await sharp(buffer)
                .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toBuffer()
            
            const filename = `resized_${originalFilename}`
            const filepath = path.join(this.mediaDir, filename)
            fs.writeFileSync(filepath, resized)
            
            await this.sock.sendMessage(sender, {
                image: resized,
                caption: `🔄 Image resized to max 800x600\nSaved as: ${filename}`
            })
        } catch (error) {
            await this.sendErrorMessage(sender, 'Failed to resize image')
        }
    }
    
    private async createThumbnail(buffer: Buffer, sender: string, originalFilename: string) {
        try {
            const thumbnail = await sharp(buffer)
                .resize(150, 150, { fit: 'cover' })
                .jpeg({ quality: 70 })
                .toBuffer()
            
            const filename = `thumb_${originalFilename}`
            const filepath = path.join(this.mediaDir, filename)
            fs.writeFileSync(filepath, thumbnail)
            
            await this.sock.sendMessage(sender, {
                image: thumbnail,
                caption: `🖼️ Thumbnail created (150x150)\nSaved as: ${filename}`
            })
        } catch (error) {
            await this.sendErrorMessage(sender, 'Failed to create thumbnail')
        }
    }
    
    private async analyzeImage(buffer: Buffer, sender: string) {
        try {
            const metadata = await sharp(buffer).metadata()
            const stats = await sharp(buffer).stats()
            
            let analysis = `🔍 **Detailed Image Analysis:**\n\n`
            analysis += `📐 **Dimensions:** ${metadata.width}x${metadata.height}\n`
            analysis += `🎨 **Format:** ${metadata.format?.toUpperCase()}\n`
            analysis += `🌈 **Channels:** ${metadata.channels}\n`
            analysis += `📊 **Bit Depth:** ${metadata.depth}\n`
            analysis += `💾 **Size:** ${(buffer.length / 1024 / 1024).toFixed(2)} MB\n`
            
            if (stats.isOpaque !== undefined) {
                analysis += `🔍 **Transparency:** ${stats.isOpaque ? 'No' : 'Yes'}\n`
            }
            
            if (metadata.density) {
                analysis += `📏 **Density:** ${metadata.density} DPI\n`
            }
            
            await this.sock.sendMessage(sender, { text: analysis })
        } catch (error) {
            await this.sendErrorMessage(sender, 'Failed to analyze image')
        }
    }
    
    private async compressVideo(filepath: string, sender: string) {
        const outputPath = filepath.replace('.mp4', '_compressed.mp4')
        
        try {
            await new Promise((resolve, reject) => {
                ffmpeg(filepath)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .videoBitrate('500k')
                    .audioBitrate('128k')
                    .output(outputPath)
                    .on('end', resolve)
                    .on('error', reject)
                    .run()
            })
            
            const compressedBuffer = fs.readFileSync(outputPath)
            const originalSize = fs.statSync(filepath).size
            const compressedSize = compressedBuffer.length
            const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1)
            
            await this.sock.sendMessage(sender, {
                video: compressedBuffer,
                caption: `🗜️ Video compressed!\nSize reduction: ${reduction}%`
            })
        } catch (error) {
            await this.sendErrorMessage(sender, 'Failed to compress video')
        }
    }
    
    private async extractVideoThumbnail(filepath: string, sender: string) {
        const thumbnailPath = filepath.replace(path.extname(filepath), '_thumb.jpg')
        
        try {
            await new Promise((resolve, reject) => {
                ffmpeg(filepath)
                    .screenshots({
                        timestamps: ['00:00:01'],
                        filename: path.basename(thumbnailPath),
                        folder: path.dirname(thumbnailPath),
                        size: '320x240'
                    })
                    .on('end', resolve)
                    .on('error', reject)
            })
            
            const thumbnailBuffer = fs.readFileSync(thumbnailPath)
            
            await this.sock.sendMessage(sender, {
                image: thumbnailBuffer,
                caption: '🖼️ Video thumbnail extracted'
            })
        } catch (error) {
            await this.sendErrorMessage(sender, 'Failed to extract video thumbnail')
        }
    }
    
    private async convertAudio(filepath: string, sender: string, targetFormat: string) {
        const outputPath = filepath.replace(path.extname(filepath), `.${targetFormat}`)
        
        try {
            await new Promise((resolve, reject) => {
                ffmpeg(filepath)
                    .toFormat(targetFormat)
                    .output(outputPath)
                    .on('end', resolve)
                    .on('error', reject)
                    .run()
            })
            
            const convertedBuffer = fs.readFileSync(outputPath)
            
            await this.sock.sendMessage(sender, {
                audio: convertedBuffer,
                mimetype: `audio/${targetFormat}`,
                caption: `🔄 Audio converted to ${targetFormat.toUpperCase()}`
            })
        } catch (error) {
            await this.sendErrorMessage(sender, 'Failed to convert audio')
        }
    }
    
    private async analyzeDocument(filepath: string, mimetype: string, sender: string) {
        const stats = fs.statSync(filepath)
        const extension = path.extname(filepath).toLowerCase()
        
        let analysis = `📄 **Document Analysis:**\n\n`
        analysis += `📁 **Type:** ${mimetype}\n`
        analysis += `📏 **Size:** ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`
        analysis += `📅 **Created:** ${stats.birthtime.toLocaleString()}\n`
        
        // Analyze based on file type
        switch (extension) {
            case '.pdf':
                analysis += `📖 **Format:** PDF Document\n`
                analysis += `💡 **Tip:** Send with caption "extract" to extract text`
                break
            case '.docx':
            case '.doc':
                analysis += `📝 **Format:** Word Document\n`
                break
            case '.xlsx':
            case '.xls':
                analysis += `📊 **Format:** Excel Spreadsheet\n`
                break
            case '.pptx':
            case '.ppt':
                analysis += `📽️ **Format:** PowerPoint Presentation\n`
                break
            case '.txt':
                analysis += `📄 **Format:** Plain Text\n`
                const content = fs.readFileSync(filepath, 'utf8')
                analysis += `📝 **Lines:** ${content.split('\n').length}\n`
                analysis += `🔤 **Characters:** ${content.length}`
                break
        }
        
        await this.sock.sendMessage(sender, { text: analysis })
    }
    
    private async sendHelpMessage(sender: string) {
        const help = `🤖 **Media Bot Help**\n\n` +
            `📸 **Image Commands:**\n` +
            `• Send image with "resize" to resize\n` +
            `• Send image with "thumbnail" to create thumbnail\n` +
            `• Send image with "info" for detailed analysis\n\n` +
            `🎥 **Video Commands:**\n` +
            `• Send video with "compress" to compress\n` +
            `• Send video with "thumbnail" to extract thumbnail\n\n` +
            `🎵 **Audio Commands:**\n` +
            `• Voice messages are auto-converted to MP3\n\n` +
            `📄 **Document Commands:**\n` +
            `• Documents are automatically analyzed\n\n` +
            `⚙️ **Bot Commands:**\n` +
            `• /help - Show this help\n` +
            `• /stats - Show bot statistics\n` +
            `• /list - List saved media files\n` +
            `• /clear - Clear all media files`
        
        await this.sock.sendMessage(sender, { text: help })
    }
    
    private async sendStatsMessage(sender: string) {
        const files = fs.readdirSync(this.mediaDir)
        const totalSize = files.reduce((size, file) => {
            return size + fs.statSync(path.join(this.mediaDir, file)).size
        }, 0)
        
        const stats = `📊 **Bot Statistics:**\n\n` +
            `📁 **Total Files:** ${files.length}\n` +
            `💾 **Total Size:** ${(totalSize / 1024 / 1024).toFixed(2)} MB\n` +
            `📸 **Images:** ${files.filter(f => f.includes('image_')).length}\n` +
            `🎥 **Videos:** ${files.filter(f => f.includes('video_')).length}\n` +
            `🎵 **Audio:** ${files.filter(f => f.includes('audio_')).length}\n` +
            `📄 **Documents:** ${files.filter(f => !f.includes('image_') && !f.includes('video_') && !f.includes('audio_')).length}`
        
        await this.sock.sendMessage(sender, { text: stats })
    }
    
    private async listMediaFiles(sender: string) {
        const files = fs.readdirSync(this.mediaDir)
        
        if (files.length === 0) {
            await this.sock.sendMessage(sender, { text: '📁 No media files found' })
            return
        }
        
        let list = `📁 **Media Files:**\n\n`
        files.slice(0, 20).forEach((file, index) => {
            const stats = fs.statSync(path.join(this.mediaDir, file))
            const size = (stats.size / 1024).toFixed(1)
            list += `${index + 1}. ${file} (${size} KB)\n`
        })
        
        if (files.length > 20) {
            list += `\n... and ${files.length - 20} more files`
        }
        
        await this.sock.sendMessage(sender, { text: list })
    }
    
    private async clearMediaFiles(sender: string) {
        try {
            const files = fs.readdirSync(this.mediaDir)
            files.forEach(file => {
                fs.unlinkSync(path.join(this.mediaDir, file))
            })
            
            await this.sock.sendMessage(sender, {
                text: `🗑️ Cleared ${files.length} media files`
            })
        } catch (error) {
            await this.sendErrorMessage(sender, 'Failed to clear media files')
        }
    }
    
    private async sendErrorMessage(sender: string, message: string) {
        await this.sock.sendMessage(sender, {
            text: `❌ ${message}`
        })
    }
}

// Start the bot
const mediaBot = new MediaBot()
mediaBot.start().catch(console.error)
```

## Installation Requirements

```bash
# Install required dependencies
npm install @whiskeysockets/baileys
npm install sharp          # For image processing
npm install fluent-ffmpeg   # For video/audio processing

# Install FFmpeg (required for video/audio processing)
# Ubuntu/Debian:
sudo apt install ffmpeg

# macOS:
brew install ffmpeg

# Windows:
# Download from https://ffmpeg.org/download.html
```

## Features

### Image Processing
- **Automatic Analysis**: Get detailed image metadata
- **Resizing**: Resize images to specified dimensions
- **Thumbnail Creation**: Generate thumbnails
- **Format Support**: JPEG, PNG, WebP, GIF, SVG

### Video Processing
- **Compression**: Reduce video file size
- **Thumbnail Extraction**: Extract frames as images
- **Format Support**: MP4, AVI, MOV, WebM
- **GIF Support**: Handle animated GIFs

### Audio Processing
- **Format Conversion**: Convert between audio formats
- **Voice Message Handling**: Process PTT messages
- **Format Support**: MP3, OGG, WAV, AAC

### Document Handling
- **File Analysis**: Get document metadata
- **Format Support**: PDF, DOC, XLS, PPT, TXT
- **Size Monitoring**: Track file sizes

## Usage Examples

### Send Image for Processing
```
[Send an image with caption: "resize"]
Bot: ✅ Image received and saved!
     🔄 Image resized to max 800x600
```

### Get Video Thumbnail
```
[Send a video with caption: "thumbnail"]
Bot: ✅ Video received and saved!
     🖼️ Video thumbnail extracted
```

### Bot Commands
```
/help    - Show available commands
/stats   - Display bot statistics
/list    - List all saved media files
/clear   - Clear all media files
```

This media bot provides a comprehensive solution for handling all types of media messages in WhatsApp, with automatic processing and user-friendly commands.

---

**Related Examples:**
- [Basic Bot](./basic-bot.md) - Simple message handling
- [Group Bot](./group-bot.md) - Group management features
- [Business Bot](./business-bot.md) - Business-focused features
