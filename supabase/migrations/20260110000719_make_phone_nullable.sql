/*
  # Make phone column nullable in patients table

  1. Changes
    - Alter the `phone` column in `patients` table to allow NULL values
    - This allows importing patients from broker CSVs that may not have phone numbers
  
  2. Notes
    - Phone numbers are often missing in broker data
    - Patients can still be identified by name and other details
*/

ALTER TABLE patients 
ALTER COLUMN phone DROP NOT NULL;
