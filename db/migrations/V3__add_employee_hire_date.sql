-- Employees get a hire date. Existing rows take the day they were created; new rows default to today.
ALTER TABLE app_employee ADD COLUMN hire_date date;
UPDATE app_employee SET hire_date = created_at::date;
ALTER TABLE app_employee
    ALTER COLUMN hire_date SET NOT NULL,
    ALTER COLUMN hire_date SET DEFAULT CURRENT_DATE;
