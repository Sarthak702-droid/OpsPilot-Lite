CREATE UNIQUE INDEX payments_org_reference_unique ON payments(organization_id,reference_number) WHERE reference_number<>'';

