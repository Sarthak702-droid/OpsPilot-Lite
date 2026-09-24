CREATE TABLE document_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  uploaded_by uuid NOT NULL,
  object_key text NOT NULL,
  original_name text NOT NULL,
  document_type text NOT NULL CHECK(document_type IN ('INVOICE','PURCHASE_ORDER','QUOTATION')),
  document_number text NOT NULL,
  reviewed_payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'REVIEWED' CHECK(status IN ('REVIEWED','FAILED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(organization_id,uploaded_by) REFERENCES users(organization_id,id),
  UNIQUE(organization_id,object_key)
);
CREATE INDEX document_imports_org_created_idx ON document_imports(organization_id,created_at DESC);

