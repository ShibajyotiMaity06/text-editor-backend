const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const cookieParser = require('cookie-parser');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    },
});


app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());


mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));


app.use('/api/auth', require('./routes/auth'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/ai', require('./routes/ai'));

app.get('/', (req, res) => {
    res.send('API is running...');
});

const userMap = {};
const roomMap = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-document', ({ documentId, user, color }) => {
        socket.join(documentId);
        const userData = {
            socketId: socket.id,
            username: user?.username || 'Anonymous',
            color: color || '#' + Math.floor(Math.random() * 16777215).toString(16)
        };

        console.log(`User ${userData.username} (${socket.id}) joined document ${documentId}`);


        userMap[socket.id] = { ...userData, documentId };
        if (!roomMap[documentId]) roomMap[documentId] = new Set();
        roomMap[documentId].add(socket.id);


        const activeUsers = Array.from(roomMap[documentId]).map(id => userMap[id]);
        io.to(documentId).emit('active-users', activeUsers);
    });

    socket.on('send-changes', (delta) => {

        socket.broadcast.to(delta.documentId).emit('receive-changes', delta);
    });

    socket.on('cursor-move', (data) => {
        const user = userMap[socket.id];
        if (user) {
            socket.broadcast.to(data.documentId).emit('cursor-update', {
                range: data.range,
                socketId: socket.id,
                user: user.username,
                color: user.color
            });
        }
    });

    socket.on('typing', (data) => {
        const user = userMap[socket.id];
        if (user) {
            socket.broadcast.to(data.documentId).emit('user-typing', {
                user: user.username,
                isTyping: data.isTyping
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const user = userMap[socket.id];
        if (user) {
            const { documentId } = user;
            if (roomMap[documentId]) {
                roomMap[documentId].delete(socket.id);

                const activeUsers = Array.from(roomMap[documentId]).map(id => userMap[id]);
                io.to(documentId).emit('active-users', activeUsers);
            }
            delete userMap[socket.id];
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
