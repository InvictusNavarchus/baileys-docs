---
id: group-api
title: Group API Reference
sidebar_position: 4
description: Complete reference for WhatsApp group management operations with Baileys.
keywords: [baileys, group api, whatsapp groups, group management, participants]
---

# Group API Reference

This page provides comprehensive documentation for group management operations in Baileys.

## Group Creation

### groupCreate(subject, participants)

Creates a new WhatsApp group.

```typescript
const group = await sock.groupCreate('My Group', [
    '1234567890@s.whatsapp.net',
    '0987654321@s.whatsapp.net'
])

console.log('Group created:', group.id)
console.log('Group subject:', group.subject)
```

**Parameters:**
- `subject: string` - Group name/subject
- `participants: string[]` - Array of participant JIDs

**Returns:** `Promise<GroupMetadata>` - Created group metadata

## Group Information

### groupMetadata(jid)

Retrieves complete group metadata.

```typescript
const metadata = await sock.groupMetadata(groupJid)

console.log('Group name:', metadata.subject)
console.log('Owner:', metadata.owner)
console.log('Created:', new Date(metadata.creation * 1000))
console.log('Participants:', metadata.participants.length)
console.log('Description:', metadata.desc)
```

**Parameters:**
- `jid: string` - Group JID

**Returns:** `Promise<GroupMetadata>` - Group metadata

### groupFetchAllParticipating()

Fetches all groups the bot is participating in.

```typescript
const groups = await sock.groupFetchAllParticipating()

Object.values(groups).forEach(group => {
    console.log(`${group.subject}: ${group.participants.length} members`)
})
```

**Returns:** `Promise<{ [jid: string]: GroupMetadata }>` - All participating groups

## Participant Management

### groupParticipantsUpdate(jid, participants, action)

Updates group participants (add, remove, promote, demote).

```typescript
// Add participants
await sock.groupParticipantsUpdate(groupJid, [userJid], 'add')

// Remove participants
await sock.groupParticipantsUpdate(groupJid, [userJid], 'remove')

// Promote to admin
await sock.groupParticipantsUpdate(groupJid, [userJid], 'promote')

// Demote from admin
await sock.groupParticipantsUpdate(groupJid, [userJid], 'demote')
```

**Parameters:**
- `jid: string` - Group JID
- `participants: string[]` - Array of participant JIDs
- `action: ParticipantAction` - 'add' | 'remove' | 'promote' | 'demote'

**Returns:** `Promise<{ status: string, jid: string }[]>` - Operation results

### Participant Utilities

```typescript
// Check if user is admin
const isAdmin = (groupMetadata: GroupMetadata, userJid: string): boolean => {
    const participant = groupMetadata.participants.find(p => p.id === userJid)
    return participant?.admin === 'admin' || participant?.admin === 'superadmin'
}

// Check if user is owner
const isOwner = (groupMetadata: GroupMetadata, userJid: string): boolean => {
    return groupMetadata.owner === userJid
}

// Get all admins
const getAdmins = (groupMetadata: GroupMetadata): string[] => {
    return groupMetadata.participants
        .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
        .map(p => p.id)
}

// Get all regular members
const getMembers = (groupMetadata: GroupMetadata): string[] => {
    return groupMetadata.participants
        .filter(p => !p.admin)
        .map(p => p.id)
}
```

## Group Settings

### groupUpdateSubject(jid, subject)

Updates the group name/subject.

```typescript
await sock.groupUpdateSubject(groupJid, 'New Group Name')
```

**Parameters:**
- `jid: string` - Group JID
- `subject: string` - New group name

### groupUpdateDescription(jid, description?)

Updates the group description.

```typescript
// Set description
await sock.groupUpdateDescription(groupJid, 'This is the group description')

// Remove description
await sock.groupUpdateDescription(groupJid, '')
```

**Parameters:**
- `jid: string` - Group JID
- `description?: string` - New description (empty string to remove)

### groupSettingUpdate(jid, setting)

Updates group settings (who can send messages, edit group info, etc.).

```typescript
// Only admins can send messages
await sock.groupSettingUpdate(groupJid, 'announcement')

// Everyone can send messages
await sock.groupSettingUpdate(groupJid, 'not_announcement')

// Only admins can edit group info
await sock.groupSettingUpdate(groupJid, 'locked')

// Everyone can edit group info
await sock.groupSettingUpdate(groupJid, 'unlocked')
```

**Parameters:**
- `jid: string` - Group JID
- `setting: GroupSetting` - 'announcement' | 'not_announcement' | 'locked' | 'unlocked'

### updateProfilePicture(jid, content)

Updates group profile picture.

```typescript
import { readFileSync } from 'fs'

const image = readFileSync('./group-avatar.jpg')
await sock.updateProfilePicture(groupJid, image)
```

**Parameters:**
- `jid: string` - Group JID
- `content: WAMediaUpload` - Image data

## Group Invites

### groupInviteCode(jid)

Gets the group invite link code.

```typescript
const code = await sock.groupInviteCode(groupJid)
const inviteLink = `https://chat.whatsapp.com/${code}`
console.log('Invite link:', inviteLink)
```

**Parameters:**
- `jid: string` - Group JID

**Returns:** `Promise<string>` - Invite code

### groupRevokeInvite(jid)

Revokes the current invite link and generates a new one.

```typescript
const newCode = await sock.groupRevokeInvite(groupJid)
const newInviteLink = `https://chat.whatsapp.com/${newCode}`
```

**Parameters:**
- `jid: string` - Group JID

**Returns:** `Promise<string>` - New invite code

### groupAcceptInvite(code)

Joins a group using an invite code.

```typescript
const groupJid = await sock.groupAcceptInvite('INVITE_CODE_HERE')
console.log('Joined group:', groupJid)
```

**Parameters:**
- `code: string` - Invite code (without the full URL)

**Returns:** `Promise<string>` - Group JID

### groupGetInviteInfo(code)

Gets information about a group from its invite code without joining.

```typescript
const info = await sock.groupGetInviteInfo('INVITE_CODE_HERE')
console.log('Group name:', info.subject)
console.log('Member count:', info.size)
console.log('Description:', info.desc)
```

**Parameters:**
- `code: string` - Invite code

**Returns:** `Promise<GroupMetadata>` - Group information

## Group Operations

### groupLeave(jid)

Leaves a group.

```typescript
await sock.groupLeave(groupJid)
```

**Parameters:**
- `jid: string` - Group JID

### groupRequestJoin(jid)

Requests to join a group (for groups that require approval).

```typescript
await sock.groupRequestJoin(groupJid)
```

**Parameters:**
- `jid: string` - Group JID

### groupApproveRequest(jid, participants)

Approves join requests (admin only).

```typescript
await sock.groupApproveRequest(groupJid, [requesterJid])
```

**Parameters:**
- `jid: string` - Group JID
- `participants: string[]` - Array of requester JIDs to approve

### groupRejectRequest(jid, participants)

Rejects join requests (admin only).

```typescript
await sock.groupRejectRequest(groupJid, [requesterJid])
```

**Parameters:**
- `jid: string` - Group JID
- `participants: string[]` - Array of requester JIDs to reject

## Group Events

### Listening to Group Events

```typescript
// Group metadata updates
sock.ev.on('groups.update', (updates) => {
    for (const update of updates) {
        console.log('Group updated:', update.id)
        if (update.subject) {
            console.log('New name:', update.subject)
        }
        if (update.desc) {
            console.log('New description:', update.desc)
        }
    }
})

// Participant updates
sock.ev.on('group-participants.update', ({ id, participants, action, author }) => {
    console.log(`Group ${id}: ${action} ${participants.join(', ')}`)
    if (author) {
        console.log('Action by:', author)
    }
})

// New groups
sock.ev.on('groups.upsert', (groups) => {
    for (const group of groups) {
        console.log('New group:', group.subject)
    }
})
```

## Group Utilities

### Group JID Utilities

```typescript
import { isJidGroup } from '@whiskeysockets/baileys'

// Check if JID is a group
const isGroup = isJidGroup(jid)

// Extract group ID from JID
const getGroupId = (groupJid: string): string => {
    return groupJid.split('@')[0]
}

// Create group JID from ID
const createGroupJid = (groupId: string): string => {
    return `${groupId}@g.us`
}
```

### Group Message Utilities

```typescript
// Check if message is from group
const isGroupMessage = (message: WAMessage): boolean => {
    return isJidGroup(message.key.remoteJid)
}

// Get message sender in group
const getMessageSender = (message: WAMessage): string => {
    return message.key.participant || message.key.remoteJid
}

// Check if message mentions bot
const isBotMentioned = (message: WAMessage, botJid: string): boolean => {
    const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    return mentions.includes(botJid)
}
```

### Group Management Helper

```typescript
class GroupManager {
    constructor(private sock: WASocket) {}
    
    async createGroupWithRules(name: string, participants: string[], rules: string) {
        // Create group
        const group = await this.sock.groupCreate(name, participants)
        
        // Set description with rules
        await this.sock.groupUpdateDescription(group.id, rules)
        
        // Make it announcement group (only admins can send)
        await this.sock.groupSettingUpdate(group.id, 'announcement')
        
        // Send welcome message
        await this.sock.sendMessage(group.id, {
            text: `Welcome to ${name}!\n\nPlease read the group rules in the description.`
        })
        
        return group
    }
    
    async addMembersWithWelcome(groupJid: string, participants: string[]) {
        // Add participants
        const results = await this.sock.groupParticipantsUpdate(groupJid, participants, 'add')
        
        // Send welcome message to successfully added members
        const added = results.filter(r => r.status === '200').map(r => r.jid)
        
        if (added.length > 0) {
            const mentions = added.map(jid => `@${jid.split('@')[0]}`).join(' ')
            await this.sock.sendMessage(groupJid, {
                text: `Welcome ${mentions} to the group!`,
                mentions: added
            })
        }
        
        return results
    }
    
    async promoteWithAnnouncement(groupJid: string, participants: string[]) {
        // Promote to admin
        await this.sock.groupParticipantsUpdate(groupJid, participants, 'promote')
        
        // Announce promotion
        const mentions = participants.map(jid => `@${jid.split('@')[0]}`).join(' ')
        await this.sock.sendMessage(groupJid, {
            text: `🎉 ${mentions} has been promoted to admin!`,
            mentions: participants
        })
    }
}
```

## Error Handling

### Common Group Errors

```typescript
try {
    await sock.groupParticipantsUpdate(groupJid, [userJid], 'add')
} catch (error) {
    switch (error.output?.statusCode) {
        case 403:
            console.log('Not authorized - not an admin')
            break
        case 404:
            console.log('Group not found')
            break
        case 409:
            console.log('User already in group')
            break
        default:
            console.log('Unknown error:', error.message)
    }
}
```

### Participant Update Results

```typescript
const results = await sock.groupParticipantsUpdate(groupJid, participants, 'add')

results.forEach(result => {
    switch (result.status) {
        case '200':
            console.log(`Successfully added ${result.jid}`)
            break
        case '403':
            console.log(`${result.jid} privacy settings prevent adding`)
            break
        case '409':
            console.log(`${result.jid} is already in the group`)
            break
        default:
            console.log(`Failed to add ${result.jid}: ${result.status}`)
    }
})
```

---

For related API documentation, see:
- [Socket API](./socket-api.md)
- [Message API](./message-api.md)
- [Types](./types.md)
