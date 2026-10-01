-- Optional free-text notes on a customer. Empty string when absent (Django convention for text).
ALTER TABLE app_customer ADD COLUMN notes text NOT NULL DEFAULT '';
