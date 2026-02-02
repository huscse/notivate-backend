import supabase from '../config/supabase.js';

/**
 * GET /api/notes
 * Get all notes for the authenticated user
 */
async function getAllNotes(req, res) {
  try {
    const userId = req.user.id;

    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ notes });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
}

/**
 * GET /api/notes/:id
 * Get a specific note by ID
 */
async function getNoteById(req, res) {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;

    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (error || !note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ note });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
}

/**
 * POST /api/notes
 * Save a new note
 */
async function createNote(req, res) {
  try {
    const userId = req.user.id;
    const { studyGuide, rawText } = req.body;

    if (!studyGuide) {
      return res.status(400).json({ error: 'Study guide is required' });
    }

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        title: studyGuide.title,
        subject: studyGuide.subject,
        summary: studyGuide.summary,
        study_guide: studyGuide,
        raw_text: rawText,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, note });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to save note' });
  }
}

/**
 * DELETE /api/notes/:id
 * Delete a note
 */
async function deleteNote(req, res) {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
}

export default { getAllNotes, getNoteById, createNote, deleteNote };
