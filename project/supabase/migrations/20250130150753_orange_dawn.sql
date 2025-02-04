/*
  # Emergency Response System Schema Update

  1. Tables
    - `ambulances`: For tracking ambulance locations and status
    - `hospitals`: For managing hospital information and bed availability
    - `emergency_requests`: For handling emergency transport requests
  
  2. Security
    - RLS policies for all tables
    - Safe policy creation with existence checks
  
  3. Sample Data
    - Two hospitals in Banashankari area
    - Ambulance entries for drivers
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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ambulances' AND policyname = 'Ambulances are viewable by everyone'
  ) THEN
    CREATE POLICY "Ambulances are viewable by everyone" ON ambulances FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ambulances' AND policyname = 'Drivers can update their own ambulance'
  ) THEN
    CREATE POLICY "Drivers can update their own ambulance" ON ambulances FOR UPDATE USING (auth.uid() = driver_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ambulances' AND policyname = 'Drivers can insert their own ambulance'
  ) THEN
    CREATE POLICY "Drivers can insert their own ambulance" ON ambulances FOR INSERT WITH CHECK (auth.uid() = driver_id);
  END IF;
END $$;

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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hospitals' AND policyname = 'Hospitals are viewable by everyone'
  ) THEN
    CREATE POLICY "Hospitals are viewable by everyone" ON hospitals FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hospitals' AND policyname = 'Hospital staff can update their own hospital'
  ) THEN
    CREATE POLICY "Hospital staff can update their own hospital" ON hospitals FOR UPDATE USING (auth.uid() = profile_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hospitals' AND policyname = 'Hospital staff can insert their own hospital'
  ) THEN
    CREATE POLICY "Hospital staff can insert their own hospital" ON hospitals FOR INSERT WITH CHECK (auth.uid() = profile_id);
  END IF;
END $$;

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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'emergency_requests' AND policyname = 'Emergency requests are viewable by involved parties'
  ) THEN
    CREATE POLICY "Emergency requests are viewable by involved parties" ON emergency_requests
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM ambulances a
        WHERE a.id = ambulance_id AND a.driver_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM hospitals h
        WHERE h.id = hospital_id AND h.profile_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'emergency_requests' AND policyname = 'Drivers can create emergency requests'
  ) THEN
    CREATE POLICY "Drivers can create emergency requests" ON emergency_requests
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM ambulances a
        WHERE a.id = ambulance_id AND a.driver_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'emergency_requests' AND policyname = 'Involved parties can update emergency requests'
  ) THEN
    CREATE POLICY "Involved parties can update emergency requests" ON emergency_requests
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM ambulances a
        WHERE a.id = ambulance_id AND a.driver_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM hospitals h
        WHERE h.id = hospital_id AND h.profile_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Insert sample hospitals
INSERT INTO hospitals (profile_id, name, address, total_beds, available_beds)
SELECT 
  auth.uid(),
  unnest(ARRAY['Sagar Hospitals', 'Fortis Hospital']),
  unnest(ARRAY['Tilaknagar, Banashankari', 'Bannerghatta Road, Banashankari']),
  unnest(ARRAY[20, 25]),
  unnest(ARRAY[15, 20])
FROM auth.users
WHERE auth.uid() IS NOT NULL
LIMIT 1;

-- Create ambulance entries for drivers
INSERT INTO ambulances (driver_id)
SELECT id 
FROM auth.users u
WHERE EXISTS (
  SELECT 1 FROM auth.users meta 
  WHERE meta.id = u.id 
  AND meta.raw_user_meta_data->>'role' = 'driver'
)
AND NOT EXISTS (
  SELECT 1 FROM ambulances a WHERE a.driver_id = u.id
);