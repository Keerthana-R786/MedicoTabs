import express from 'express';
import { supabase } from '../config/database.js';
import { requireDoctorOrPatientAuth } from '../middleware/anyAuth.js';
import { requireDoctorAuth } from '../middleware/doctorAuth.js';

const router = express.Router();
const DOCUMENTS_BUCKET = 'patient-documents';

/**
 * GET /api/documents/:id/download
 * Streams the real stored file back to the client. A patient may only
 * download their own documents; a doctor may download any.
 */
router.get('/:id/download', requireDoctorOrPatientAuth, async (req, res) => {
  try {
    const { data: doc, error } = await supabase
      .from('patient_documents')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (req.actorType === 'patient' && doc.patient_id !== req.patientId) {
      return res.status(403).json({ error: 'You do not have access to this document' });
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .download(doc.file_url);

    if (downloadError || !fileBlob) {
      console.error('Storage download error:', downloadError);
      return res.status(404).json({ error: 'Stored file not found' });
    }

    const buffer = Buffer.from(await fileBlob.arrayBuffer());

    res.setHeader('Content-Type', doc.file_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

/**
 * DELETE /api/documents/:id
 * Removes both the stored file and its metadata row
 */
router.delete('/:id', requireDoctorAuth, async (req, res) => {
  try {
    const { data: doc, error } = await supabase
      .from('patient_documents')
      .select('file_url')
      .eq('id', req.params.id)
      .single();

    if (error || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.file_url]);

    const { error: deleteError } = await supabase
      .from('patient_documents')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) throw deleteError;

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
