DO $$
DECLARE
  org uuid := '00000000-0000-4000-8000-000000000001';
  supplier_ids uuid[] := ARRAY[]::uuid[];
  product_ids uuid[] := ARRAY[]::uuid[];
  customer_ids uuid[] := ARRAY[]::uuid[];
  invoice_ids uuid[] := ARRAY[]::uuid[];
  generated uuid;
  i integer;
  due date;
BEGIN
  INSERT INTO organizations(id,name,industry,currency,timezone)
    VALUES(org,'Demo Distribution Co.','Wholesale','INR','Asia/Kolkata') ON CONFLICT(id) DO NOTHING;
  IF EXISTS(SELECT 1 FROM products WHERE organization_id=org) THEN
    RAISE NOTICE 'Demo organization already seeded';
    RETURN;
  END IF;
  INSERT INTO users(organization_id,clerk_user_id,name,email,role)
    VALUES(org,'demo_clerk_user','Demo Owner','demo@example.invalid','OWNER');

  FOR i IN 1..30 LOOP
    INSERT INTO suppliers(organization_id,name,average_lead_time_days)
      VALUES(org,CASE i WHEN 1 THEN 'ABC Ceramics' WHEN 2 THEN 'XYZ Metals' ELSE 'Supplier '||i END,CASE i WHEN 1 THEN 6 ELSE 7 END)
      RETURNING id INTO generated;
    supplier_ids := array_append(supplier_ids,generated);
  END LOOP;
  FOR i IN 1..100 LOOP
    INSERT INTO products(organization_id,sku,name,category,cost_price,selling_price,current_stock,reorder_level,preferred_supplier_id)
      VALUES(org,'SKU-'||lpad(i::text,3,'0'),CASE i WHEN 1 THEN 'Tile X21' ELSE 'Product '||i END,'General',80,120,CASE i WHEN 1 THEN 80 ELSE 300 END,CASE i WHEN 1 THEN 150 ELSE 40 END,supplier_ids[((i-1)%30)+1])
      RETURNING id INTO generated;
    product_ids := array_append(product_ids,generated);
  END LOOP;
  FOR i IN 1..200 LOOP
    INSERT INTO customers(organization_id,name,business_name,credit_limit)
      VALUES(org,CASE i WHEN 1 THEN 'ABC Traders' WHEN 2 THEN 'Inactive High Value Customer' ELSE 'Customer '||i END,CASE i WHEN 1 THEN 'ABC Traders' ELSE 'Business '||i END,200000)
      RETURNING id INTO generated;
    customer_ids := array_append(customer_ids,generated);
  END LOOP;
  FOR i IN 1..2000 LOOP
    INSERT INTO sales(organization_id,customer_id,sale_date,subtotal,tax,discount,total_amount,status)
      VALUES(org,customer_ids[((i-1)%200)+1],CURRENT_DATE-(i%365),1000+(i%50)*75,0,0,1000+(i%50)*75,'COMPLETED');
  END LOOP;
  FOR i IN 1..500 LOOP
    due := CASE WHEN i=1 THEN CURRENT_DATE-47 ELSE CURRENT_DATE-((i%80)-20) END;
    INSERT INTO invoices(organization_id,customer_id,invoice_number,invoice_date,due_date,total,status)
      VALUES(org,customer_ids[((i-1)%200)+1],'INV-'||lpad(i::text,4,'0'),due-30,due,CASE WHEN i=1 THEN 120000 ELSE 2500+(i%40)*150 END,CASE WHEN due<CURRENT_DATE THEN 'OVERDUE' ELSE 'PENDING' END)
      RETURNING id INTO generated;
    invoice_ids := array_append(invoice_ids,generated);
  END LOOP;
  FOR i IN 1..400 LOOP
    INSERT INTO payments(organization_id,customer_id,invoice_id,amount,payment_method,payment_date)
      VALUES(org,customer_ids[(i%200)+1],invoice_ids[i+1],500,'BANK',CURRENT_DATE-(i%30));
    UPDATE invoices SET paid_amount=500,status='PARTIAL' WHERE organization_id=org AND id=invoice_ids[i+1];
  END LOOP;
  FOR i IN 1..1500 LOOP
    INSERT INTO inventory_transactions(organization_id,product_id,transaction_type,quantity,timestamp)
      VALUES(org,CASE WHEN i<=140 THEN product_ids[1] ELSE product_ids[((i-141)%99)+2] END,'SALE',1,now()-CASE WHEN i<=140 THEN ((i-1)/20)::int ELSE (i%30) END*interval '1 day');
  END LOOP;
  FOR i IN 1..5 LOOP
    due := CURRENT_DATE-(20+i);
    INSERT INTO purchase_orders(organization_id,supplier_id,po_number,order_date,expected_delivery_date,delivered_at,status)
      VALUES(org,supplier_ids[2],'DEMO-PO-'||i,due-7,due,due+CASE WHEN i<=3 THEN 3 ELSE -1 END,'DELIVERED');
  END LOOP;
END $$;

