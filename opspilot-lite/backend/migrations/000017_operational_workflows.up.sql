ALTER TABLE sales ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE sales ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE sales ADD COLUMN created_by uuid;
ALTER TABLE sales ADD CONSTRAINT sales_created_by_fk FOREIGN KEY (organization_id,created_by) REFERENCES users(organization_id,id);
ALTER TABLE sales ADD CONSTRAINT sales_status_check CHECK (status IN ('DRAFT','COMPLETED'));
ALTER TABLE sale_items ADD CONSTRAINT sale_items_quantity_positive CHECK (quantity>0);
ALTER TABLE sale_items ADD CONSTRAINT sale_items_money_nonnegative CHECK (unit_price>=0 AND discount>=0 AND total>=0);
ALTER TABLE purchase_orders ADD COLUMN created_by uuid;
ALTER TABLE purchase_orders ADD COLUMN sent_at timestamptz;
ALTER TABLE purchase_orders ADD COLUMN send_state text NOT NULL DEFAULT 'NOT_SENT' CHECK(send_state IN ('NOT_SENT','SENDING','SENT','UNCERTAIN'));
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_created_by_fk FOREIGN KEY (organization_id,created_by) REFERENCES users(organization_id,id);
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_amount_nonnegative CHECK (total_amount>=0);
ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_org_id_unique UNIQUE(organization_id,id);
CREATE TABLE purchase_order_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  purchase_order_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity numeric(18,3) NOT NULL CHECK(quantity>0),
  received_by uuid NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  reference text NOT NULL,
  FOREIGN KEY (organization_id,purchase_order_id) REFERENCES purchase_orders(organization_id,id),
  FOREIGN KEY (organization_id,item_id) REFERENCES purchase_order_items(organization_id,id),
  FOREIGN KEY (organization_id,received_by) REFERENCES users(organization_id,id),
  UNIQUE(organization_id,purchase_order_id,item_id,reference)
);
CREATE INDEX purchase_order_receipts_order_idx ON purchase_order_receipts(organization_id,purchase_order_id);
ALTER TABLE payments ADD COLUMN reversed_at timestamptz;
ALTER TABLE payments ADD COLUMN reversed_by uuid;
ALTER TABLE payments ADD COLUMN reversal_reason text;
ALTER TABLE payments ADD CONSTRAINT payments_reversed_by_fk FOREIGN KEY (organization_id,reversed_by) REFERENCES users(organization_id,id);
ALTER TABLE actions ADD COLUMN requested_by uuid;
ALTER TABLE actions ADD CONSTRAINT actions_requested_by_fk FOREIGN KEY (organization_id,requested_by) REFERENCES users(organization_id,id);
CREATE UNIQUE INDEX actions_pending_po_send_unique ON actions(organization_id,((payload->>'purchase_order_id'))) WHERE action_type='SEND_PURCHASE_ORDER' AND status IN ('AWAITING_APPROVAL','APPROVED');
CREATE TABLE organization_settings (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id),
  overstock_days integer NOT NULL DEFAULT 90 CHECK(overstock_days BETWEEN 30 AND 365),
  high_value_threshold numeric(18,2) NOT NULL DEFAULT 100000 CHECK(high_value_threshold>0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  email text NOT NULL,
  role text NOT NULL CHECK(role IN ('ADMIN','MANAGER','STAFF','VIEWER')),
  token_hash bytea NOT NULL UNIQUE,
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  FOREIGN KEY (organization_id,invited_by) REFERENCES users(organization_id,id)
);
