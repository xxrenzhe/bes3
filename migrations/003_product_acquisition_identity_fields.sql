ALTER TABLE affiliate_products ADD COLUMN product_model TEXT;
ALTER TABLE affiliate_products ADD COLUMN model_number TEXT;
ALTER TABLE affiliate_products ADD COLUMN product_type TEXT;
ALTER TABLE affiliate_products ADD COLUMN category TEXT;
ALTER TABLE affiliate_products ADD COLUMN category_slug TEXT;
ALTER TABLE affiliate_products ADD COLUMN youtube_match_terms_json TEXT;

ALTER TABLE products ADD COLUMN product_model TEXT;
ALTER TABLE products ADD COLUMN model_number TEXT;
ALTER TABLE products ADD COLUMN product_type TEXT;
ALTER TABLE products ADD COLUMN category_slug TEXT;
ALTER TABLE products ADD COLUMN youtube_match_terms_json TEXT;

CREATE INDEX IF NOT EXISTS idx_products_identity_video_match
  ON products (brand, product_model, model_number, category_slug);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_identity
  ON affiliate_products (platform, brand, product_model, model_number, category_slug);
