import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';

// --- DATABASE SETUP ---
const MONGODB_URI = "mongodb+srv://chatappuser:password1234@cluster0.nzjhc4a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(MONGODB_URI, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true } });
let messagesCollection, usersCollection, conversationsCollection;

async function connectToDb() {
  try {
    await client.connect();
    const db = client.db("chatApp");
    messagesCollection = db.collection("messages");
    usersCollection = db.collection("users");
    conversationsCollection = db.collection("conversations");
    await usersCollection.createIndex({ "username": 1 }, { unique: true });
    console.log("✅ Successfully connected to MongoDB!");
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB", err);
    process.exit(1);
  }
}

// --- SERVER SETUP & HELPER ---
const app = express();
app.use(cors());
const server = http.createServer(app);
const PORT = 8080;
const io = new Server(server, { cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] } });
const onlineUsers = new Map();

async function getFullConversationDetails(convo, userId) {
    if (!convo || !convo.participants) return null;
    const participantsInfo = await usersCollection.find({ userId: { $in: convo.participants } }).toArray();
    const lastMessage = await messagesCollection.findOne({ conversationId: convo._id.toString() }, { sort: { timestamp: -1 } });
    if (convo.isGroup) {
        return { ...convo, participantsInfo, lastMessage };
    } else {
        const otherUser = participantsInfo.find(p => p.userId !== userId);
        return { ...convo, participantsInfo, otherUser, lastMessage };
    }
}

// --- SOCKET.IO LOGIC ---
io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;
    const username = socket.handshake.auth.username;
    console.log(`✅ User connected: ${userId || socket.id}`);
    if (userId) {
        onlineUsers.set(userId, socket.id);
        socket.join(userId);
        conversationsCollection.find({ participants: userId }).toArray().then(convos => {
            convos.forEach(convo => socket.join(convo._id.toString()));
        });
    }

    socket.on('check_username', async ({ username }, callback) => {
        const user = await usersCollection.findOne({ username });
        callback({ isAvailable: !user });
    });

    socket.on('create_user', async (data, callback) => {
        try {
            const newUser = { ...data, userId: `user_${Date.now()}`, avatarUrl: '', bio: '' };
            await usersCollection.insertOne(newUser);
            callback({ success: true, user: newUser });
        } catch (error) {
            if (error.code === 11000) { callback({ success: false, message: 'This username is already taken.' });
            } else { callback({ success: false, message: 'Could not create profile.' }); }
        }
    });

    socket.on('update_profile', async (data, callback) => {
        try {
            const filter = { userId: data.userId };
            const updateDoc = { $set: { username: data.username, avatarUrl: data.avatarUrl, bio: data.bio } };
            await usersCollection.updateOne(filter, updateDoc);
            const updatedUser = await usersCollection.findOne(filter);
            callback({ success: true, user: updatedUser });
        } catch (error) {
            if (error.code === 11000) { callback({ success: false, message: 'That username is already taken.' });
            } else { callback({ success: false, message: 'Failed to update profile.' }); }
        }
    });

    socket.on('get_conversations', async (data, callback) => {
        if (!data.userId) return callback([]);
        try {
            const userConversations = await conversationsCollection.find({ participants: data.userId }).toArray();
            const conversationsWithDetails = await Promise.all(
                userConversations.map(convo => getFullConversationDetails(convo, data.userId))
            );
            callback(conversationsWithDetails.filter(c => c));
        } catch (error) { console.error("Error in get_conversations:", error); callback([]); }
    });

    socket.on('search', async ({ searchTerm }, callback) => {
        if (!searchTerm.trim()) { return callback([]); }
        try {
            const userQuery = usersCollection.find({ username: { $regex: searchTerm, $options: 'i' }, userId: { $ne: userId } }).limit(5).toArray();
            const groupQuery = conversationsCollection.find({ isGroup: true, participants: userId, groupName: { $regex: searchTerm, $options: 'i' } }).limit(5).toArray();
            const [users, groups] = await Promise.all([userQuery, groupQuery]);
            const formattedUsers = users.map(u => ({ ...u, type: 'user' }));
            const formattedGroups = await Promise.all(groups.map(async (g) => {
                const fullGroup = await getFullConversationDetails(g, userId);
                return { ...fullGroup, type: 'group' };
            }));
            callback([...formattedUsers, ...formattedGroups]);
        } catch (error) { console.error('Error searching:', error); callback([]); }
    });

    socket.on('create_conversation', async ({ currentUser, otherUser }, callback) => {
        try {
            let conversation = await conversationsCollection.findOne({ isGroup: { $ne: true }, participants: { $all: [currentUser.userId, otherUser.userId] } });
            if (!conversation) {
                const newConversationDoc = { participants: [currentUser.userId, otherUser.userId], createdAt: new Date(), isGroup: false };
                const result = await conversationsCollection.insertOne(newConversationDoc);
                conversation = { _id: result.insertedId, ...newConversationDoc };
                const fullDetails = await getFullConversationDetails(conversation, currentUser.userId);
                io.sockets.sockets.forEach((s) => {
                    if (s.handshake.auth.userId === currentUser.userId || s.handshake.auth.userId === otherUser.userId) {
                        s.join(conversation._id.toString());
                        s.emit('new_conversation', fullDetails);
                    }
                });
            }
            const fullDetails = await getFullConversationDetails(conversation, currentUser.userId);
            callback(fullDetails);
        } catch (error) { console.error("Error in create_conversation:", error); }
    });

    socket.on('create_group', async (data) => {
        const { groupName, members, creator } = data;
        try {
            const allParticipantIds = [...members.map(m => m.userId), creator.userId];
            const newGroupDoc = {
                groupName, participants: allParticipantIds, ownerId: creator.userId, admins: [creator.userId],
                isGroup: true, groupAvatarUrl: '', groupDescription: '', createdAt: new Date(),
            };
            const result = await conversationsCollection.insertOne(newGroupDoc);
            const newGroup = { _id: result.insertedId, ...newGroupDoc };
            const fullGroupDetails = await getFullConversationDetails(newGroup, creator.userId);
            io.sockets.sockets.forEach((s) => {
                if (allParticipantIds.includes(s.handshake.auth.userId)) {
                    s.join(newGroup._id.toString());
                    s.emit('new_conversation', { ...fullGroupDetails, _isNew: true, _creatorId: creator.userId });
                }
            });
        } catch (error) { console.error(error); }
    });
    
    socket.on('update_group_info', async (data) => {
        const { conversationId, groupName, groupDescription, groupAvatarUrl } = data;
        const convo = await conversationsCollection.findOne({ _id: new ObjectId(conversationId) });
        if (convo && convo.admins.includes(userId)) {
            const updateDoc = { $set: { groupName, groupDescription, groupAvatarUrl } };
            await conversationsCollection.updateOne({ _id: new ObjectId(conversationId) }, updateDoc);
            const updatedConvo = await conversationsCollection.findOne({ _id: new ObjectId(conversationId) });
            const fullDetails = await getFullConversationDetails(updatedConvo, userId);
            io.to(conversationId).emit('group_updated', fullDetails);
        }
    });

    socket.on('add_group_members', async (data) => {
        const { conversationId, newMemberIds } = data;
        const convo = await conversationsCollection.findOne({ _id: new ObjectId(conversationId) });
        if (convo && convo.admins.includes(userId)) {
            const updateDoc = { $addToSet: { participants: { $each: newMemberIds } } };
            await conversationsCollection.updateOne({ _id: new ObjectId(conversationId) }, updateDoc);
            io.sockets.sockets.forEach((s) => {
                if (newMemberIds.includes(s.handshake.auth.userId)) { s.join(conversationId); }
            });
            const updatedConvo = await conversationsCollection.findOne({ _id: new ObjectId(conversationId) });
            const fullDetails = await getFullConversationDetails(updatedConvo, userId);
            io.to(conversationId).emit('group_updated', fullDetails);
        }
    });

    socket.on('remove_group_member', async (data) => {
        const { conversationId, memberIdToRemove } = data;
        const convo = await conversationsCollection.findOne({ _id: new ObjectId(conversationId) });
        if (convo && convo.admins.includes(userId) && memberIdToRemove !== convo.ownerId) {
            const updateDoc = { $pull: { participants: memberIdToRemove, admins: memberIdToRemove } };
            await conversationsCollection.updateOne({ _id: new ObjectId(conversationId) }, updateDoc);
            io.sockets.sockets.forEach((s) => {
                if (s.handshake.auth.userId === memberIdToRemove) { s.leave(conversationId); }
            });
            const updatedConvo = await conversationsCollection.findOne({ _id: new ObjectId(conversationId) });
            const fullDetails = await getFullConversationDetails(updatedConvo, userId);
            io.to(conversationId).emit('group_updated', fullDetails);
        }
    });

    socket.on('promote_admin', async (data) => {
        const { conversationId, memberIdToPromote } = data;
        const convo = await conversationsCollection.findOne({ _id: new ObjectId(conversationId) });
        if (convo && convo.ownerId === userId) {
            const updateDoc = { $addToSet: { admins: memberIdToPromote } };
            await conversationsCollection.updateOne({ _id: new ObjectId(conversationId) }, updateDoc);
            const updatedConvo = await conversationsCollection.findOne({ _id: new ObjectId(conversationId) });
            const fullDetails = await getFullConversationDetails(updatedConvo, userId);
            io.to(conversationId).emit('group_updated', fullDetails);
        }
    });
    
    socket.on('demote_admin', async (data) => {
        const { conversationId, memberIdToDemote } = data;
        const convo = await conversationsCollection.findOne({ _id: new ObjectId(conversationId) });
        if (convo && convo.ownerId === userId && memberIdToDemote !== convo.ownerId) {
            const updateDoc = { $pull: { admins: memberIdToDemote } };
            await conversationsCollection.updateOne({ _id: new ObjectId(conversationId) }, updateDoc);
            const updatedConvo = await conversationsCollection.findOne({ _id: new ObjectId(conversationId) });
            const fullDetails = await getFullConversationDetails(updatedConvo, userId);
            io.to(conversationId).emit('group_updated', fullDetails);
        }
    });

    socket.on('react_to_message', async (data) => {
        const { messageId, conversationId, emoji } = data;
        try {
            const message = await messagesCollection.findOne({ _id: new ObjectId(messageId) });
            if (!message) return;

            let reactions = message.reactions || [];
            const existingReactionIndex = reactions.findIndex(r => r.userId === userId);

            if (existingReactionIndex > -1) {
                if (reactions[existingReactionIndex].emoji === emoji) {
                    reactions.splice(existingReactionIndex, 1);
                } else {
                    reactions[existingReactionIndex].emoji = emoji;
                }
            } else {
                reactions.push({ emoji, userId, username });
            }

            await messagesCollection.updateOne({ _id: new ObjectId(messageId) }, { $set: { reactions: reactions } });
            const updatedMessage = await messagesCollection.findOne({ _id: new ObjectId(messageId) });
            
            io.to(conversationId).emit('message_updated', updatedMessage);
        } catch (error) {
            console.error("Error reacting to message:", error);
        }
    });

    socket.on('get_history', async (data) => {
        try {
            const history = await messagesCollection.find({ conversationId: data.conversationId }).sort({ timestamp: 1 }).toArray();
            socket.emit('chat_history', history);
        } catch (err) { console.error("Error fetching history:", err); }
    });

    socket.on('send_message', async (data) => {
        const message = {
            conversationId: data.conversationId, text: data.text,
            senderId: userId, timestamp: new Date(), status: 'sent',
            fileUrl: data.fileUrl || null, fileName: data.fileName || null, fileType: data.fileType || null,
        };
        try {
            const result = await messagesCollection.insertOne(message);
            const savedMessage = { ...message, _id: result.insertedId, tempId: data.tempId };
            const convo = await conversationsCollection.findOne({ _id: new ObjectId(data.conversationId) });
            const recipientIds = convo.participants.filter(pId => pId !== userId);
            let isRecipientOnline = recipientIds.some(recipientId => onlineUsers.has(recipientId));
            if (isRecipientOnline) {
                savedMessage.status = 'delivered';
                await messagesCollection.updateOne({ _id: savedMessage._id }, { $set: { status: 'delivered' } });
            }
            io.to(data.conversationId).emit('new_message', savedMessage);
        } catch (err) { console.error("Error saving message:", err); }
    });

    socket.on('messages_read', async (data) => {
        const { conversationId, readerId } = data;
        const result = await messagesCollection.updateMany(
            { conversationId: conversationId, senderId: { $ne: readerId }, status: { $ne: 'read' } },
            { $set: { status: 'read' } }
        );
        if (result.modifiedCount > 0) {
            io.to(conversationId).emit('messages_status_updated', { conversationId });
        }
    });

    socket.on('typing', (data) => {
        socket.to(data.conversationId).emit('typing_indicator', {
            conversationId: data.conversationId, isTyping: data.isTyping,
        });
    });

    socket.on('disconnect', () => {
        if (userId) {
            onlineUsers.delete(userId);
        }
        console.log(`❌ User disconnected: ${userId || socket.id}`);
    });
});

connectToDb().then(() => { server.listen(PORT, () => console.log(`🚀 Server is running on http://localhost:${PORT}`)); });