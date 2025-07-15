---
id: media
title: Media Handling
sidebar_position: 7
description: Complete guide to handling media files (images, videos, audio, documents) with Baileys.
keywords: [baileys, media, images, videos, audio, documents, download, upload, processing]
---

# Media Handling

This guide covers comprehensive media handling in Baileys, including uploading, downloading, processing, and optimizing media files for WhatsApp.

## Media Types Supported

WhatsApp supports various media types through Baileys:

- **Images**: JPEG, PNG, WebP, GIF
- **Videos**: MP4, AVI, MOV, WebM (with GIF playback support)
- **Audio**: MP3, OGG, WAV, AAC (including voice messages/PTT)
- **Documents**: PDF, DOC, XLS, PPT, TXT, and more
- **Stickers**: WebP format (static and animated)

## Sending Media

### Image Messages

```typescript
// From file path
await sock.sendMessage(jid, {
    image: { url: './image.jpg' },
    caption: 'Image caption'
})

// From buffer
import { readFileSync } from 'fs'
const imageBuffer = readFileSync('./image.jpg')
await sock.sendMessage(jid, {
    image: imageBuffer,
    caption: 'Image from buffer'
})

// From URL (will be downloaded and sent)
await sock.sendMessage(jid, {
    image: { url: 'https://example.com/image.jpg' },
    caption: 'Image from URL'
})

// With custom thumbnail
await sock.sendMessage(jid, {
    image: { url: './image.jpg' },
    caption: 'Image with thumbnail',
    jpegThumbnail: thumbnailBuffer
})
```

### Video Messages

```typescript
// Regular video
await sock.sendMessage(jid, {
    video: { url: './video.mp4' },
    caption: 'Video message',
    mimetype: 'video/mp4'
})

// GIF video (plays automatically)
await sock.sendMessage(jid, {
    video: { url: './animation.mp4' },
    gifPlayback: true,
    caption: 'Animated GIF'
})

// Video with custom thumbnail
await sock.sendMessage(jid, {
    video: { url: './video.mp4' },
    caption: 'Video with thumbnail',
    jpegThumbnail: thumbnailBuffer
})
```

### Audio Messages

```typescript
// Regular audio file
await sock.sendMessage(jid, {
    audio: { url: './audio.mp3' },
    mimetype: 'audio/mp3'
})

// Voice message (PTT - Push to Talk)
await sock.sendMessage(jid, {
    audio: { url: './voice.ogg' },
    mimetype: 'audio/ogg; codecs=opus',
    ptt: true,
    seconds: 30 // Duration in seconds
})

// Audio with waveform data
await sock.sendMessage(jid, {
    audio: { url: './audio.mp3' },
    mimetype: 'audio/mp3',
    waveform: waveformData // Uint8Array
})
```

### Document Messages

```typescript
// Basic document
await sock.sendMessage(jid, {
    document: { url: './document.pdf' },
    fileName: 'Important Document.pdf',
    mimetype: 'application/pdf'
})

// Document with thumbnail
await sock.sendMessage(jid, {
    document: { url: './presentation.pptx' },
    fileName: 'Presentation.pptx',
    mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    jpegThumbnail: thumbnailBuffer
})

// Document with caption
await sock.sendMessage(jid, {
    document: { url: './report.docx' },
    fileName: 'Monthly Report.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    caption: 'Please review this document'
})
```

## Downloading Media

### Basic Media Download

```typescript
import { downloadMediaMessage } from '@whiskeysockets/baileys'

const downloadMedia = async (message: any) => {
    try {
        const buffer = await downloadMediaMessage(
            message,
            'buffer',
            {},
            {
                logger,
                reuploadRequest: sock.updateMediaMessage
            }
        )
        
        return buffer
    } catch (error) {
        console.error('Failed to download media:', error)
        throw error
    }
}

// Usage in message handler
sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const message of messages) {
        const messageType = Object.keys(message.message || {})[0]
        
        if (['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(messageType)) {
            try {
                const mediaBuffer = await downloadMedia(message)
                
                // Save to file
                const fs = require('fs')
                const filename = `media_${Date.now()}.${getFileExtension(messageType)}`
                fs.writeFileSync(filename, mediaBuffer)
                
                console.log(`Media saved as ${filename}`)
            } catch (error) {
                console.error('Failed to download media:', error)
            }
        }
    }
})
```

### Advanced Download with Streaming

```typescript
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

const downloadMediaStream = async (message: any, outputPath: string) => {
    try {
        const stream = await downloadMediaMessage(
            message,
            'stream',
            {},
            {
                logger,
                reuploadRequest: sock.updateMediaMessage
            }
        )
        
        const writeStream = createWriteStream(outputPath)
        await pipeline(stream, writeStream)
        
        console.log(`Media downloaded to ${outputPath}`)
    } catch (error) {
        console.error('Failed to download media stream:', error)
        throw error
    }
}
```

### Download with Progress Tracking

```typescript
const downloadWithProgress = async (message: any, outputPath: string) => {
    const mediaMessage = message.message.imageMessage || 
                        message.message.videoMessage || 
                        message.message.audioMessage || 
                        message.message.documentMessage
    
    const fileLength = mediaMessage.fileLength
    let downloadedBytes = 0
    
    try {
        const stream = await downloadMediaMessage(message, 'stream')
        const writeStream = createWriteStream(outputPath)
        
        stream.on('data', (chunk) => {
            downloadedBytes += chunk.length
            const progress = (downloadedBytes / fileLength) * 100
            console.log(`Download progress: ${progress.toFixed(2)}%`)
        })
        
        await pipeline(stream, writeStream)
        console.log('Download completed!')
    } catch (error) {
        console.error('Download failed:', error)
    }
}
```

## Media Processing

### Image Processing with Sharp

```typescript
import sharp from 'sharp'

class ImageProcessor {
    static async resize(buffer: Buffer, width: number, height: number): Promise<Buffer> {
        return await sharp(buffer)
            .resize(width, height, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer()
    }
    
    static async createThumbnail(buffer: Buffer, size = 150): Promise<Buffer> {
        return await sharp(buffer)
            .resize(size, size, { fit: 'cover' })
            .jpeg({ quality: 70 })
            .toBuffer()
    }
    
    static async compress(buffer: Buffer, quality = 80): Promise<Buffer> {
        return await sharp(buffer)
            .jpeg({ quality })
            .toBuffer()
    }
    
    static async convertToWebP(buffer: Buffer): Promise<Buffer> {
        return await sharp(buffer)
            .webp({ quality: 80 })
            .toBuffer()
    }
    
    static async addWatermark(buffer: Buffer, watermarkPath: string): Promise<Buffer> {
        const watermark = await sharp(watermarkPath)
            .resize(100, 100)
            .toBuffer()
        
        return await sharp(buffer)
            .composite([{ input: watermark, gravity: 'southeast' }])
            .toBuffer()
    }
    
    static async getMetadata(buffer: Buffer) {
        return await sharp(buffer).metadata()
    }
}

// Usage
const processImage = async (imageBuffer: Buffer) => {
    // Get image info
    const metadata = await ImageProcessor.getMetadata(imageBuffer)
    console.log('Image dimensions:', metadata.width, 'x', metadata.height)
    
    // Resize if too large
    if (metadata.width > 1920 || metadata.height > 1080) {
        imageBuffer = await ImageProcessor.resize(imageBuffer, 1920, 1080)
    }
    
    // Compress
    imageBuffer = await ImageProcessor.compress(imageBuffer, 85)
    
    // Create thumbnail
    const thumbnail = await ImageProcessor.createThumbnail(imageBuffer)
    
    return { processedImage: imageBuffer, thumbnail }
}
```

### Video Processing with FFmpeg

```typescript
import ffmpeg from 'fluent-ffmpeg'
import { promisify } from 'util'

class VideoProcessor {
    static async compress(inputPath: string, outputPath: string, options = {}) {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .videoBitrate('500k')
                .audioBitrate('128k')
                .size('1280x720')
                .output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run()
        })
    }
    
    static async extractThumbnail(inputPath: string, outputPath: string, timeOffset = '00:00:01') {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .screenshots({
                    timestamps: [timeOffset],
                    filename: outputPath,
                    size: '320x240'
                })
                .on('end', resolve)
                .on('error', reject)
        })
    }
    
    static async convertToGif(inputPath: string, outputPath: string, duration = 10) {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .inputOptions([`-t ${duration}`])
                .outputOptions([
                    '-vf scale=480:-1:flags=lanczos,fps=10',
                    '-c:v gif'
                ])
                .output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run()
        })
    }
    
    static async getVideoInfo(inputPath: string) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(inputPath, (err, metadata) => {
                if (err) reject(err)
                else resolve(metadata)
            })
        })
    }
    
    static async extractAudio(inputPath: string, outputPath: string) {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .noVideo()
                .audioCodec('mp3')
                .output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run()
        })
    }
}

// Usage
const processVideo = async (videoPath: string) => {
    // Get video info
    const info = await VideoProcessor.getVideoInfo(videoPath)
    console.log('Video info:', info)
    
    // Compress video
    const compressedPath = videoPath.replace('.mp4', '_compressed.mp4')
    await VideoProcessor.compress(videoPath, compressedPath)
    
    // Extract thumbnail
    const thumbnailPath = videoPath.replace('.mp4', '_thumb.jpg')
    await VideoProcessor.extractThumbnail(videoPath, thumbnailPath)
    
    return { compressedPath, thumbnailPath }
}
```

### Audio Processing

```typescript
class AudioProcessor {
    static async convertFormat(inputPath: string, outputPath: string, format: string) {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .toFormat(format)
                .output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run()
        })
    }
    
    static async generateWaveform(audioBuffer: Buffer): Promise<Uint8Array> {
        // Simplified waveform generation
        // In practice, you'd use a proper audio analysis library
        const samples = 64 // WhatsApp uses 64 samples for waveform
        const waveform = new Uint8Array(samples)
        
        // Generate mock waveform data
        for (let i = 0; i < samples; i++) {
            waveform[i] = Math.floor(Math.random() * 100)
        }
        
        return waveform
    }
    
    static async getAudioDuration(inputPath: string): Promise<number> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(inputPath, (err, metadata) => {
                if (err) reject(err)
                else resolve(metadata.format.duration || 0)
            })
        })
    }
    
    static async normalizeAudio(inputPath: string, outputPath: string) {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .audioFilters('loudnorm')
                .output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run()
        })
    }
}
```

## Sticker Creation

### Creating Stickers from Images

```typescript
class StickerCreator {
    static async createFromImage(imagePath: string): Promise<Buffer> {
        return await sharp(imagePath)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp()
            .toBuffer()
    }
    
    static async createAnimatedSticker(videoPath: string): Promise<Buffer> {
        // Convert video to animated WebP
        return new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .inputOptions(['-t 10']) // Max 10 seconds
                .outputOptions([
                    '-vf scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
                    '-c:v libwebp',
                    '-lossless 0',
                    '-compression_level 6',
                    '-q:v 50',
                    '-loop 0',
                    '-preset default',
                    '-an'
                ])
                .format('webp')
                .on('end', (stdout, stderr) => {
                    resolve(Buffer.from(stdout))
                })
                .on('error', reject)
                .run()
        })
    }
}

// Usage
const createAndSendSticker = async (imagePath: string, jid: string) => {
    try {
        const stickerBuffer = await StickerCreator.createFromImage(imagePath)
        
        await sock.sendMessage(jid, {
            sticker: stickerBuffer
        })
        
        console.log('Sticker sent successfully!')
    } catch (error) {
        console.error('Failed to create/send sticker:', error)
    }
}
```

## Media Utilities

### File Type Detection

```typescript
import { fileTypeFromBuffer } from 'file-type'

const detectFileType = async (buffer: Buffer) => {
    const fileType = await fileTypeFromBuffer(buffer)
    return fileType
}

const getFileExtension = (messageType: string): string => {
    const extensions = {
        imageMessage: 'jpg',
        videoMessage: 'mp4',
        audioMessage: 'mp3',
        documentMessage: 'pdf'
    }
    return extensions[messageType] || 'bin'
}

const getMimeType = (extension: string): string => {
    const mimeTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        mp4: 'video/mp4',
        avi: 'video/avi',
        mov: 'video/quicktime',
        mp3: 'audio/mp3',
        ogg: 'audio/ogg',
        wav: 'audio/wav',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream'
}
```

### Media Validation

```typescript
class MediaValidator {
    static validateImage(buffer: Buffer): { valid: boolean, error?: string } {
        const maxSize = 16 * 1024 * 1024 // 16MB
        
        if (buffer.length > maxSize) {
            return { valid: false, error: 'Image too large (max 16MB)' }
        }
        
        // Check if it's a valid image
        const imageHeaders = {
            jpeg: [0xFF, 0xD8, 0xFF],
            png: [0x89, 0x50, 0x4E, 0x47],
            gif: [0x47, 0x49, 0x46],
            webp: [0x52, 0x49, 0x46, 0x46]
        }
        
        const isValidImage = Object.values(imageHeaders).some(header =>
            header.every((byte, index) => buffer[index] === byte)
        )
        
        if (!isValidImage) {
            return { valid: false, error: 'Invalid image format' }
        }
        
        return { valid: true }
    }
    
    static validateVideo(buffer: Buffer): { valid: boolean, error?: string } {
        const maxSize = 64 * 1024 * 1024 // 64MB
        
        if (buffer.length > maxSize) {
            return { valid: false, error: 'Video too large (max 64MB)' }
        }
        
        // Basic MP4 validation
        const mp4Header = [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]
        const isMP4 = mp4Header.every((byte, index) => buffer[index + 4] === byte)
        
        if (!isMP4) {
            return { valid: false, error: 'Only MP4 videos are supported' }
        }
        
        return { valid: true }
    }
    
    static validateAudio(buffer: Buffer): { valid: boolean, error?: string } {
        const maxSize = 16 * 1024 * 1024 // 16MB
        
        if (buffer.length > maxSize) {
            return { valid: false, error: 'Audio too large (max 16MB)' }
        }
        
        return { valid: true }
    }
    
    static validateDocument(buffer: Buffer): { valid: boolean, error?: string } {
        const maxSize = 100 * 1024 * 1024 // 100MB
        
        if (buffer.length > maxSize) {
            return { valid: false, error: 'Document too large (max 100MB)' }
        }
        
        return { valid: true }
    }
}
```

## Best Practices

### 1. File Size Optimization
- Compress images and videos before sending
- Use appropriate quality settings
- Generate thumbnails for large media

### 2. Error Handling
- Always validate media before processing
- Handle download failures gracefully
- Implement retry mechanisms

### 3. Performance
- Use streaming for large files
- Process media asynchronously
- Implement caching for frequently accessed media

### 4. Security
- Validate file types and sizes
- Scan for malicious content
- Sanitize file names

### 5. Storage Management
- Clean up temporary files
- Implement media retention policies
- Use cloud storage for large files

---

**Related Pages:**
- [Messages](/messages/) - Message handling
- [Examples](/examples/media-bot) - Media bot example
