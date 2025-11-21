const Document = require('../models/Document');

exports.getDocuments = async (req, res) => {
    try {
        const documents = await Document.find({
            $or: [{ owner: req.user.id }, { collaborators: req.user.id }]
        }).populate('owner', 'username').sort({ updatedAt: -1 });
        res.json(documents);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createDocument = async (req, res) => {
    try {
        const { title } = req.body;
        const document = await Document.create({
            title,
            owner: req.user.id,
            content: ''
        });
        res.status(201).json(document);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDocumentById = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id).populate('owner', 'username');
        if (!document) return res.status(404).json({ message: 'Document not found' });

        const userId = req.user.id;
        const isOwner = document.owner._id.toString() === userId;
        const isCollaborator = document.collaborators.includes(userId);
        const isViewer = document.viewers.includes(userId);

        if (!isOwner && !isCollaborator && !isViewer) {
            return res.status(403).json({
                message: 'Access denied',
                requiresAccess: true,
                hasPendingRequest: document.pendingRequests.includes(userId)
            });
        }

        res.json({ ...document.toObject(), role: isOwner ? 'owner' : (isCollaborator ? 'editor' : 'viewer') });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.requestAccess = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });

        if (!document.pendingRequests.includes(req.user.id)) {
            document.pendingRequests.push(req.user.id);
            await document.save();
        }
        res.json({ message: 'Access requested' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.grantAccess = async (req, res) => {
    try {
        const { userId, role } = req.body;
        const document = await Document.findById(req.params.id);

        if (document.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only owner can grant access' });
        }


        document.pendingRequests = document.pendingRequests.filter(id => id.toString() !== userId);


        if (role === 'editor') {
            if (!document.collaborators.includes(userId)) document.collaborators.push(userId);
            document.viewers = document.viewers.filter(id => id.toString() !== userId);
        } else {
            if (!document.viewers.includes(userId)) document.viewers.push(userId);
            document.collaborators = document.collaborators.filter(id => id.toString() !== userId);
        }

        await document.save();
        res.json({ message: 'Access granted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateDocument = async (req, res) => {
    try {
        const { title, content } = req.body;
        let document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });




        if (document.owner.toString() !== req.user.id && !document.collaborators.includes(req.user.id)) {
            document.collaborators.push(req.user.id);
        }

        document.title = title || document.title;
        document.content = content || document.content;
        await document.save();

        res.json(document);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });

        if (document.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await document.deleteOne();
        res.json({ message: 'Document removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
