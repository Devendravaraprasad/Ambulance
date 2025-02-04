/*
  # Emergency Response System Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - Links to auth.users
      - `role` (text) - Either 'driver' or 'hospital'
      - `name` (text) - Name of the driver or hospital
      - `created_at` (timestamp)
    
    - `hospitals`
      - `id` (uuid, primary key)
      - `profile_id` (uuid) - References profiles
      - `location` (point) - Geographic coordinates
      - `address` (text)
      - `total_beds` (integer)
      - `available_beds` (integer)
      
    - `ambulances`
      - `id` (uuid, primary key)
      - `driver_id` (uuid) - References profiles
      - `current_location` (point)
      - `status` (text) - 'available', 'occupied', 'en_route'
      
    - `emergency_requests`
      - `id` (uuid, primary key)
      - `ambulance_id` (uuid) - References ambulances
      - `hospital_id` (uuid) - References hospitals
      - `patient_name` (text)
      - `patient_age` (integer)
      - `symptoms` (text)
      - `status` (text) - 'pending', 'approved', 'rejected', 'completed'
      - `created_at` (timestamp)
      
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on their role
*/

-- Enable postgis extension for location-based queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('driver', 'hospital')),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Hospitals table
CREATE TABLE hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) NOT NULL,
  location geometry(Point, 4326) NOT NULL,
  address text NOT NULL,
  total_beds integer NOT NULL DEFAULT 0,
  available_beds integer NOT NULL DEFAULT 0,
  CONSTRAINT beds_check CHECK (available_beds <= total_beds)
);

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospitals are viewable by everyone"
  ON hospitals FOR SELECT
  USING (true);

CREATE POLICY "Hospital staff can update their hospital"
  ON hospitals FOR UPDATE
  USING (auth.uid() = profile_id);

-- Ambulances table
CREATE TABLE ambulances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES profiles(id) NOT NULL,
  current_location geometry(Point, 4326),
  status text NOT NULL CHECK (status IN ('available', 'occupied', 'en_route'))
);

ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ambulances are viewable by everyone"
  ON ambulances FOR SELECT
  USING (true);

CREATE POLICY "Drivers can update their ambulance"
  ON ambulances FOR UPDATE
  USING (auth.uid() = driver_id);

-- Emergency requests table
CREATE TABLE emergency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambulance_id uuid REFERENCES ambulances(id) NOT NULL,
  hospital_id uuid REFERENCES hospitals(id) NOT NULL,
  patient_name text NOT NULL,
  patient_age integer,
  symptoms text,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
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