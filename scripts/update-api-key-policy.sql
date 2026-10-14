ALTER POLICY api_keys_tenant_isolation ON api_keys
USING (
  tenant_id = current_setting('app.current_tenant', true)
  OR current_setting('app.allow_key_lookup', true) = 'true'
)
WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
