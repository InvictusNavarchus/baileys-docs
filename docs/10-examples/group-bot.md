---
id: group-bot
title: Group Bot Example
sidebar_position: 3
description: Build a WhatsApp bot for group management with admin features, moderation, and automation.
keywords: [baileys, group bot, group management, admin, moderation, whatsapp groups]
---

# Group Bot Example

This example demonstrates how to build a comprehensive WhatsApp group management bot with admin features, moderation tools, and automation capabilities.

## Complete Group Bot

```typescript
import makeWASocket, { DisconnectReason, useMultiFileAuthState, isJidGroup, GroupMetadata } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

class GroupBot {
    private sock: WASocket
    private adminJids = new Set<string>() // Bot admins
    private groupSettings = new Map<string, any>() // Group-specific settings
    private userWarnings = new Map<string, number>() // User warning counts
    
    constructor() {
        // Add your admin JIDs here
        this.adminJids.add('your-admin-number@s.whatsapp.net')
    }
    
    async start() {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_group_bot')
        
        this.sock = makeWASocket({
            auth: state,
            printQRInTerminal: true
        })
        
        this.sock.ev.on('connection.update', this.handleConnection.bind(this))
        this.sock.ev.on('creds.update', saveCreds)
        this.sock.ev.on('messages.upsert', this.handleMessages.bind(this))
        this.sock.ev.on('group-participants.update', this.handleParticipantUpdate.bind(this))
        this.sock.ev.on('groups.update', this.handleGroupUpdate.bind(this))
    }
    
    private handleConnection({ connection, lastDisconnect }: any) {
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            
            if (shouldReconnect) {
                console.log('Reconnecting...')
                this.start()
            }
        } else if (connection === 'open') {
            console.log('✅ Group Bot connected!')
        }
    }
    
    private async handleMessages({ messages, type }: any) {
        if (type !== 'notify') return
        
        for (const message of messages) {
            if (message.key.fromMe) continue
            
            const sender = message.key.remoteJid
            const participant = message.key.participant || sender
            const isGroup = isJidGroup(sender)
            
            if (!isGroup) {
                await this.handlePrivateMessage(message, sender)
                continue
            }
            
            const text = this.getMessageText(message)
            
            // Check for spam/inappropriate content
            if (await this.isSpamMessage(text, participant, sender)) {
                await this.handleSpam(message, participant, sender)
                continue
            }
            
            // Handle commands
            if (text.startsWith('/') || text.startsWith('!')) {
                await this.handleGroupCommand(message, text, participant, sender)
            }
            
            // Auto-moderation
            await this.autoModerate(message, text, participant, sender)
        }
    }
    
    private async handleGroupCommand(message: any, text: string, participant: string, groupJid: string) {
        const args = text.slice(1).split(' ')
        const command = args[0].toLowerCase()
        
        const isAdmin = await this.isGroupAdmin(participant, groupJid)
        const isBotAdmin = this.adminJids.has(participant)
        
        switch (command) {
            case 'help':
                await this.sendHelpMessage(groupJid, isAdmin, isBotAdmin)
                break
                
            case 'rules':
                await this.sendGroupRules(groupJid)
                break
                
            case 'info':
                await this.sendGroupInfo(groupJid)
                break
                
            case 'stats':
                await this.sendGroupStats(groupJid)
                break
                
            // Admin-only commands
            case 'kick':
            case 'remove':
                if (isAdmin) await this.kickUser(args, groupJid, participant)
                else await this.sendNoPermissionMessage(groupJid)
                break
                
            case 'add':
                if (isAdmin) await this.addUser(args, groupJid, participant)
                else await this.sendNoPermissionMessage(groupJid)
                break
                
            case 'promote':
                if (isAdmin) await this.promoteUser(args, groupJid, participant)
                else await this.sendNoPermissionMessage(groupJid)
                break
                
            case 'demote':
                if (isAdmin) await this.demoteUser(args, groupJid, participant)
                else await this.sendNoPermissionMessage(groupJid)
                break
                
            case 'mute':
                if (isAdmin) await this.muteGroup(args, groupJid)
                else await this.sendNoPermissionMessage(groupJid)
                break
                
            case 'unmute':
                if (isAdmin) await this.unmuteGroup(groupJid)
                else await this.sendNoPermissionMessage(groupJid)
                break
                
            case 'warn':
                if (isAdmin) await this.warnUser(args, groupJid, participant)
                else await this.sendNoPermissionMessage(groupJid)
                break
                
            case 'warnings':
                await this.showWarnings(args, groupJid)
                break
                
            case 'clearwarnings':
                if (isAdmin) await this.clearWarnings(args, groupJid)
                else await this.sendNoPermissionMessage(groupJid)
                break
                
            // Bot admin-only commands
            case 'setrules':
                if (isBotAdmin) await this.setGroupRules(args, groupJid)
                else await this.sendNoPermissionMessage(groupJid)
                break
                
            case 'settings':
                if (isBotAdmin) await this.manageSettings(args, groupJid)
                else await this.sendNoPermissionMessage(groupJid)
                break
                
            case 'backup':
                if (isBotAdmin) await this.backupGroup(groupJid)
                else await this.sendNoPermissionMessage(groupJid)
                break
                
            default:
                await this.sock.sendMessage(groupJid, {
                    text: `❌ Unknown command: ${command}\nType /help for available commands`
                })
        }
    }
    
    private async handleParticipantUpdate({ id, participants, action, author }: any) {
        const groupJid = id
        
        switch (action) {
            case 'add':
                await this.welcomeNewMembers(groupJid, participants)
                break
            case 'remove':
                await this.farewellMembers(groupJid, participants, author)
                break
            case 'promote':
                await this.announcePromotion(groupJid, participants, author)
                break
            case 'demote':
                await this.announceDemotion(groupJid, participants, author)
                break
        }
    }
    
    private async handleGroupUpdate(updates: any[]) {
        for (const update of updates) {
            if (update.subject) {
                await this.announceNameChange(update.id, update.subject)
            }
            if (update.desc) {
                await this.announceDescriptionChange(update.id, update.desc)
            }
        }
    }
    
    private async isGroupAdmin(userJid: string, groupJid: string): Promise<boolean> {
        try {
            const metadata = await this.sock.groupMetadata(groupJid)
            const participant = metadata.participants.find(p => p.id === userJid)
            return participant?.admin === 'admin' || participant?.admin === 'superadmin'
        } catch {
            return false
        }
    }
    
    private async kickUser(args: string[], groupJid: string, adminJid: string) {
        if (args.length < 2) {
            await this.sock.sendMessage(groupJid, {
                text: '❌ Usage: /kick @user or /kick reply-to-message'
            })
            return
        }
        
        // Extract user JID from mention or reply
        const targetJid = this.extractUserJid(args[1])
        if (!targetJid) {
            await this.sock.sendMessage(groupJid, {
                text: '❌ Please mention a user or reply to their message'
            })
            return
        }
        
        try {
            await this.sock.groupParticipantsUpdate(groupJid, [targetJid], 'remove')
            await this.sock.sendMessage(groupJid, {
                text: `✅ User removed from group by admin`,
                mentions: [adminJid]
            })
        } catch (error) {
            await this.sock.sendMessage(groupJid, {
                text: '❌ Failed to remove user. Make sure I have admin permissions.'
            })
        }
    }
    
    private async addUser(args: string[], groupJid: string, adminJid: string) {
        if (args.length < 2) {
            await this.sock.sendMessage(groupJid, {
                text: '❌ Usage: /add +1234567890'
            })
            return
        }
        
        const phoneNumber = args[1].replace(/[^\d]/g, '')
        const userJid = `${phoneNumber}@s.whatsapp.net`
        
        try {
            const results = await this.sock.groupParticipantsUpdate(groupJid, [userJid], 'add')
            const result = results[0]
            
            if (result.status === '200') {
                await this.sock.sendMessage(groupJid, {
                    text: `✅ User added to group by admin`,
                    mentions: [adminJid, userJid]
                })
            } else {
                await this.sock.sendMessage(groupJid, {
                    text: `❌ Failed to add user: ${result.status}`
                })
            }
        } catch (error) {
            await this.sock.sendMessage(groupJid, {
                text: '❌ Failed to add user. They may have privacy settings preventing this.'
            })
        }
    }
    
    private async promoteUser(args: string[], groupJid: string, adminJid: string) {
        const targetJid = this.extractUserJid(args[1])
        if (!targetJid) {
            await this.sock.sendMessage(groupJid, {
                text: '❌ Please mention a user to promote'
            })
            return
        }
        
        try {
            await this.sock.groupParticipantsUpdate(groupJid, [targetJid], 'promote')
            await this.sock.sendMessage(groupJid, {
                text: `🎉 User promoted to admin!`,
                mentions: [targetJid, adminJid]
            })
        } catch (error) {
            await this.sock.sendMessage(groupJid, {
                text: '❌ Failed to promote user'
            })
        }
    }
    
    private async demoteUser(args: string[], groupJid: string, adminJid: string) {
        const targetJid = this.extractUserJid(args[1])
        if (!targetJid) {
            await this.sock.sendMessage(groupJid, {
                text: '❌ Please mention a user to demote'
            })
            return
        }
        
        try {
            await this.sock.groupParticipantsUpdate(groupJid, [targetJid], 'demote')
            await this.sock.sendMessage(groupJid, {
                text: `📉 User demoted from admin`,
                mentions: [targetJid, adminJid]
            })
        } catch (error) {
            await this.sock.sendMessage(groupJid, {
                text: '❌ Failed to demote user'
            })
        }
    }
    
    private async muteGroup(args: string[], groupJid: string) {
        try {
            await this.sock.groupSettingUpdate(groupJid, 'announcement')
            
            const duration = args[1] ? `for ${args[1]}` : ''
            await this.sock.sendMessage(groupJid, {
                text: `🔇 Group muted ${duration}. Only admins can send messages.`
            })
            
            // Set auto-unmute timer if duration specified
            if (args[1]) {
                const minutes = parseInt(args[1])
                if (!isNaN(minutes)) {
                    setTimeout(async () => {
                        await this.unmuteGroup(groupJid)
                    }, minutes * 60 * 1000)
                }
            }
        } catch (error) {
            await this.sock.sendMessage(groupJid, {
                text: '❌ Failed to mute group'
            })
        }
    }
    
    private async unmuteGroup(groupJid: string) {
        try {
            await this.sock.groupSettingUpdate(groupJid, 'not_announcement')
            await this.sock.sendMessage(groupJid, {
                text: '🔊 Group unmuted. Everyone can send messages now.'
            })
        } catch (error) {
            await this.sock.sendMessage(groupJid, {
                text: '❌ Failed to unmute group'
            })
        }
    }
    
    private async warnUser(args: string[], groupJid: string, adminJid: string) {
        const targetJid = this.extractUserJid(args[1])
        if (!targetJid) {
            await this.sock.sendMessage(groupJid, {
                text: '❌ Please mention a user to warn'
            })
            return
        }
        
        const reason = args.slice(2).join(' ') || 'No reason provided'
        const warningKey = `${groupJid}:${targetJid}`
        const currentWarnings = this.userWarnings.get(warningKey) || 0
        const newWarnings = currentWarnings + 1
        
        this.userWarnings.set(warningKey, newWarnings)
        
        let message = `⚠️ Warning ${newWarnings}/3\n`
        message += `User: @${targetJid.split('@')[0]}\n`
        message += `Reason: ${reason}\n`
        message += `Admin: @${adminJid.split('@')[0]}`
        
        if (newWarnings >= 3) {
            message += '\n\n🚫 Maximum warnings reached. User will be removed.'
            
            // Auto-kick after 3 warnings
            setTimeout(async () => {
                try {
                    await this.sock.groupParticipantsUpdate(groupJid, [targetJid], 'remove')
                    await this.sock.sendMessage(groupJid, {
                        text: '🚫 User automatically removed for exceeding warning limit'
                    })
                    this.userWarnings.delete(warningKey)
                } catch (error) {
                    console.error('Failed to auto-kick user:', error)
                }
            }, 5000)
        }
        
        await this.sock.sendMessage(groupJid, {
            text: message,
            mentions: [targetJid, adminJid]
        })
    }
    
    private async showWarnings(args: string[], groupJid: string) {
        const targetJid = args[1] ? this.extractUserJid(args[1]) : null
        
        if (targetJid) {
            // Show warnings for specific user
            const warningKey = `${groupJid}:${targetJid}`
            const warnings = this.userWarnings.get(warningKey) || 0
            
            await this.sock.sendMessage(groupJid, {
                text: `⚠️ User @${targetJid.split('@')[0]} has ${warnings}/3 warnings`,
                mentions: [targetJid]
            })
        } else {
            // Show all warnings for the group
            let message = '⚠️ **Group Warnings:**\n\n'
            let hasWarnings = false
            
            for (const [key, warnings] of this.userWarnings.entries()) {
                if (key.startsWith(groupJid + ':')) {
                    const userJid = key.split(':')[1]
                    message += `• @${userJid.split('@')[0]}: ${warnings}/3\n`
                    hasWarnings = true
                }
            }
            
            if (!hasWarnings) {
                message = '✅ No warnings in this group'
            }
            
            await this.sock.sendMessage(groupJid, { text: message })
        }
    }
    
    private async clearWarnings(args: string[], groupJid: string) {
        const targetJid = this.extractUserJid(args[1])
        if (!targetJid) {
            await this.sock.sendMessage(groupJid, {
                text: '❌ Please mention a user to clear warnings'
            })
            return
        }
        
        const warningKey = `${groupJid}:${targetJid}`
        this.userWarnings.delete(warningKey)
        
        await this.sock.sendMessage(groupJid, {
            text: `✅ Warnings cleared for @${targetJid.split('@')[0]}`,
            mentions: [targetJid]
        })
    }
    
    private async welcomeNewMembers(groupJid: string, participants: string[]) {
        const settings = this.groupSettings.get(groupJid) || {}
        if (!settings.welcomeEnabled) return
        
        const metadata = await this.sock.groupMetadata(groupJid)
        const welcomeMessage = settings.welcomeMessage || 
            `👋 Welcome to *${metadata.subject}*!\n\nPlease read the group rules and enjoy your stay!`
        
        for (const participant of participants) {
            await this.sock.sendMessage(groupJid, {
                text: welcomeMessage,
                mentions: [participant]
            })
        }
    }
    
    private async farewellMembers(groupJid: string, participants: string[], author?: string) {
        const settings = this.groupSettings.get(groupJid) || {}
        if (!settings.farewellEnabled) return
        
        const farewellMessage = settings.farewellMessage || 
            `👋 Goodbye! Thanks for being part of our group.`
        
        await this.sock.sendMessage(groupJid, {
            text: farewellMessage
        })
    }
    
    private async isSpamMessage(text: string, userJid: string, groupJid: string): Promise<boolean> {
        // Simple spam detection
        const spamPatterns = [
            /(.)\1{10,}/, // Repeated characters
            /https?:\/\/[^\s]+/gi, // Multiple URLs
            /join.*group/gi, // Group promotion
            /free.*money/gi, // Scam patterns
        ]
        
        return spamPatterns.some(pattern => pattern.test(text))
    }
    
    private async handleSpam(message: any, userJid: string, groupJid: string) {
        // Delete the spam message
        await this.sock.sendMessage(groupJid, {
            delete: message.key
        })
        
        // Warn the user
        await this.warnUser(['warn', `@${userJid.split('@')[0]}`, 'Spam detected'], groupJid, 'system')
        
        await this.sock.sendMessage(groupJid, {
            text: '🚫 Spam message detected and removed',
            mentions: [userJid]
        })
    }
    
    private async autoModerate(message: any, text: string, userJid: string, groupJid: string) {
        const settings = this.groupSettings.get(groupJid) || {}
        if (!settings.autoModerationEnabled) return
        
        // Check for inappropriate content
        const inappropriateWords = settings.bannedWords || []
        const hasInappropriateContent = inappropriateWords.some(word => 
            text.toLowerCase().includes(word.toLowerCase())
        )
        
        if (hasInappropriateContent) {
            await this.sock.sendMessage(groupJid, {
                delete: message.key
            })
            
            await this.sock.sendMessage(groupJid, {
                text: '⚠️ Message removed for inappropriate content',
                mentions: [userJid]
            })
        }
    }
    
    private getMessageText(message: any): string {
        return message.message?.conversation || 
               message.message?.extendedTextMessage?.text || 
               message.message?.imageMessage?.caption || 
               message.message?.videoMessage?.caption || ''
    }
    
    private extractUserJid(mention: string): string | null {
        if (!mention) return null
        
        // Extract from mention format @1234567890
        const phoneMatch = mention.match(/@(\d+)/)
        if (phoneMatch) {
            return `${phoneMatch[1]}@s.whatsapp.net`
        }
        
        // Direct phone number
        const directMatch = mention.match(/\+?(\d+)/)
        if (directMatch) {
            return `${directMatch[1]}@s.whatsapp.net`
        }
        
        return null
    }
    
    private async sendHelpMessage(groupJid: string, isAdmin: boolean, isBotAdmin: boolean) {
        let help = `🤖 **Group Bot Commands**\n\n`
        
        help += `📋 **General Commands:**\n`
        help += `• /help - Show this help\n`
        help += `• /rules - Show group rules\n`
        help += `• /info - Show group information\n`
        help += `• /stats - Show group statistics\n`
        help += `• /warnings [@user] - Show warnings\n\n`
        
        if (isAdmin) {
            help += `👑 **Admin Commands:**\n`
            help += `• /kick @user - Remove user from group\n`
            help += `• /add +number - Add user to group\n`
            help += `• /promote @user - Promote to admin\n`
            help += `• /demote @user - Demote from admin\n`
            help += `• /mute [minutes] - Mute group\n`
            help += `• /unmute - Unmute group\n`
            help += `• /warn @user [reason] - Warn user\n`
            help += `• /clearwarnings @user - Clear warnings\n\n`
        }
        
        if (isBotAdmin) {
            help += `🔧 **Bot Admin Commands:**\n`
            help += `• /setrules <text> - Set group rules\n`
            help += `• /settings - Manage bot settings\n`
            help += `• /backup - Backup group data\n`
        }
        
        await this.sock.sendMessage(groupJid, { text: help })
    }
    
    private async sendGroupInfo(groupJid: string) {
        try {
            const metadata = await this.sock.groupMetadata(groupJid)
            
            let info = `📊 **Group Information**\n\n`
            info += `📝 **Name:** ${metadata.subject}\n`
            info += `👥 **Members:** ${metadata.participants.length}\n`
            info += `👑 **Admins:** ${metadata.participants.filter(p => p.admin).length}\n`
            info += `📅 **Created:** ${new Date(metadata.creation * 1000).toLocaleDateString()}\n`
            
            if (metadata.desc) {
                info += `📄 **Description:** ${metadata.desc}\n`
            }
            
            await this.sock.sendMessage(groupJid, { text: info })
        } catch (error) {
            await this.sock.sendMessage(groupJid, {
                text: '❌ Failed to get group information'
            })
        }
    }
    
    private async sendNoPermissionMessage(groupJid: string) {
        await this.sock.sendMessage(groupJid, {
            text: '❌ You don\'t have permission to use this command'
        })
    }
    
    private async handlePrivateMessage(message: any, sender: string) {
        const text = this.getMessageText(message)
        
        if (text.toLowerCase().includes('help')) {
            await this.sock.sendMessage(sender, {
                text: `🤖 **Group Bot Help**\n\nAdd me to a group and make me admin to use group management features!\n\nCommands work in groups only.`
            })
        }
    }
}

// Start the bot
const groupBot = new GroupBot()
groupBot.start().catch(console.error)
```

## Features

### Group Management
- **Member Management**: Add, remove, promote, demote members
- **Group Settings**: Mute/unmute groups, change settings
- **Auto-moderation**: Spam detection, inappropriate content filtering
- **Warning System**: 3-strike warning system with auto-kick

### Welcome & Farewell
- **Welcome Messages**: Greet new members automatically
- **Farewell Messages**: Say goodbye to leaving members
- **Customizable Messages**: Set custom welcome/farewell text

### Admin Tools
- **Permission Checks**: Verify admin status before executing commands
- **Bulk Operations**: Handle multiple users at once
- **Group Statistics**: Show member counts, admin info
- **Backup System**: Export group data and settings

## Usage Examples

### Basic Commands
```
/help          - Show available commands
/rules         - Display group rules
/info          - Show group information
/stats         - Display group statistics
```

### Admin Commands
```
/kick @user           - Remove user from group
/add +1234567890      - Add user to group
/promote @user        - Make user an admin
/demote @user         - Remove admin privileges
/mute 30              - Mute group for 30 minutes
/warn @user spam      - Warn user for spam
```

### Bot Admin Commands
```
/setrules Welcome to our group! Please be respectful.
/settings welcome on  - Enable welcome messages
/backup              - Create group backup
```

This group bot provides comprehensive group management capabilities with moderation tools, automation features, and admin controls for WhatsApp groups.

---

**Related Examples:**
- [Basic Bot](./basic-bot.md) - Simple message handling
- [Media Bot](./media-bot.md) - Media processing features
- [Business Bot](./business-bot.md) - Business-focused features
