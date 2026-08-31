-- Document Requests feature
-- Run this in the Supabase SQL Editor once.

CREATE TABLE IF NOT EXISTS document_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id),
  requested_by_name TEXT,
  record_types TEXT[],
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'submitted', 'completed')),
  documents UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_doc_requests_referral ON document_requests(referral_id);
CREATE INDEX IF NOT EXISTS idx_doc_requests_requested_by ON document_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_doc_requests_status ON document_requests(status);
