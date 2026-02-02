import { Router } from 'express';
import notesController from '../controllers/notesController.js';
import { authenticateUser } from '../middleware/Authmiddleware.js';

const router = Router();

// All notes routes require authentication
router.use(authenticateUser);

router.get('/', notesController.getAllNotes);
router.get('/:id', notesController.getNoteById);
router.post('/', notesController.createNote);
router.delete('/:id', notesController.deleteNote);

export default router;
