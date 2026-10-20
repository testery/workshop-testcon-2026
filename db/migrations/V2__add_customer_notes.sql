-- Optional free-text notes on a customer. Existing rows get an empty string.
ALTER TABLE app_customer ADD COLUMN notes text NOT NULL DEFAULT '';
