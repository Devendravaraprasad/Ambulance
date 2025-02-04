/*
  # Create form submissions table

  1. New Tables
    - `form_submissions`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text)
      - `created_at` (timestamp)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `form_submissions` table
    - Add policies for users to insert and view their own submissions
*/

-- Create the form submissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies with existence checks
DO $$ 
BEGIN
  -- Check if insert policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'form_submissions' 
    AND policyname = 'Users can insert their own form submissions'
  ) THEN
    CREATE POLICY "Users can insert their own form submissions"
      ON form_submissions
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Check if select policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'form_submissions' 
    AND policyname = 'Users can view their own form submissions'
  ) THEN
    CREATE POLICY "Users can view their own form submissions"
      ON form_submissions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;