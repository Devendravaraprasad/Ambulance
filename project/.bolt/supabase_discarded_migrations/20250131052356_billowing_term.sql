/*
  # Create form submissions table

  1. New Tables
    - `form_submissions`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text)
      - `message` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `form_submissions` table
    - Add policy for authenticated users to insert data
    - Add policy for authenticated users to view their own submissions
*/

CREATE TABLE IF NOT EXISTS form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own form submissions"
  ON form_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own form submissions"
  ON form_submissions
  FOR SELECT
  USING (auth.uid() = user_id);