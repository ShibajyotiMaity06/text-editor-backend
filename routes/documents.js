const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', documentController.getDocuments);
router.post('/', documentController.createDocument);
router.get('/:id', documentController.getDocumentById);
router.put('/:id', documentController.updateDocument);
router.post('/:id/request-access', documentController.requestAccess);
router.post('/:id/grant-access', documentController.grantAccess);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
