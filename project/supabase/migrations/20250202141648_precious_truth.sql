/*
  # Add area and status to form submissions

  1. New Columns
    - `area` (text) - Area of incident
    - `hospital_id` (uuid) - Reference to selected hospital
    - `status` (text) - Request status (pending/accepted/rejected)

  2. Security
    - Update RLS policies to allow hospital staff to update submissions
*/

-- Add new columns to form_submissions
ALTER TABLE form_submissions 
ADD COLUMN IF NOT EXISTS area text,
ADD COLUMN IF NOT EXISTS hospital_id uuid REFERENCES hospitals(id),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected'));

-- Update RLS policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'form_submissions' 
    AND policyname = 'Hospital staff can update submissions'
  ) THEN
    CREATE POLICY "Hospital staff can update submissions"
      ON form_submissions
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM hospitals h
          WHERE h.id = hospital_id 
          AND h.profile_id = auth.uid()
        )
      );
  END IF;
END $$;