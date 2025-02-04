/*
  # Fix Database Schema

  1. Tables
    - Ensures PostGIS extension is enabled
    - Creates ambulances table if not exists
    - Creates hospitals table if not exists
    - Creates emergency_requests table if not exists
    
  2. Security
    - Enables RLS for all tables
    - Creates policies for ambulances table
    - Creates policies for hospitals table
    - Creates policies for emergency_requests table
    
  3. Sample Data
    - Inserts sample hospitals in Banashankari
    - Creates ambulance entries for drivers
*/

-- Enable PostGIS for location data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS emergency_requests;
DROP TABLE IF EXISTS ambulances;
DROP TABLE IF EXISTS hospitals;

-- Ambulances table
CREATE TABLE ambulances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES auth.users(id) NOT NULL,
  current_location geometry(Point, 4326),
  status text NOT NULL CHECK (status IN ('available', 'occupied', 'en_route')) DEFAULT 'available'
);

ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ambulances are viewable by everyone"
  ON ambulances FOR SELECT
  USING (true);

CREATE POLICY "Drivers can update their own ambulance"
  ON ambulances FOR UPDATE
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can insert their own ambulance"
  ON ambulances FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

-- Hospitals table
CREATE TABLE hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  total_beds integer NOT NULL DEFAULT 0,
  available_beds integer NOT NULL DEFAULT 0,
  CONSTRAINT beds_check CHECK (available_beds <= total_beds)
);

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospitals are viewable by everyone"
  ON hospitals FOR SELECT
  USING (true);

CREATE POLICY "Hospital staff can update their own hospital"
  ON hospitals FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Hospital staff can insert their own hospital"
  ON hospitals FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Emergency requests table
CREATE TABLE emergency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambulance_id uuid REFERENCES ambulances(id) NOT NULL,
  hospital_id uuid REFERENCES hospitals(id) NOT NULL,
  patient_name text NOT NULL,
  patient_age integer,
  symptoms text,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Emergency requests are viewable by involved parties"
  ON emergency_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ambulances a
      WHERE a.id = ambulance_id AND a.driver_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM hospitals h
      WHERE h.id = hospital_id AND h.profile_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can create emergency requests"
  ON emergency_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ambulances a
      WHERE a.id = ambulance_id AND a.driver_id = auth.uid()
    )
  );

CREATE POLICY "Involved parties can update emergency requests"
  ON emergency_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ambulances a
      WHERE a.id = ambulance_id AND a.driver_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM hospitals h
      WHERE h.id = hospital_id AND h.profile_id = auth.uid()
    )
  );

-- Insert sample hospitals
INSERT INTO hospitals (profile_id, name, address, total_beds, available_beds)
SELECT 
  auth.uid(),
  name,
  address,
  total_beds,
  available_beds
FROM (
  VALUES 
    ('Sagar Hospitals', 'Tilaknagar, Banashankari', 20, 15),
    ('Fortis Hospital', 'Bannerghatta Road, Banashankari', 25, 20)
) AS h(name, address, total_beds, available_beds)
WHERE EXISTS (
  SELECT 1 FROM auth.users
  WHERE auth.uid() = id
);

-- Create ambulance entries for drivers
INSERT INTO ambulances (driver_id)
SELECT id 
FROM auth.users u
WHERE 
  raw_user_meta_data->>'role' = 'driver'
  AND NOT EXISTS (
    SELECT 1 FROM ambulances a 
    WHERE a.driver_id = u.id
  );