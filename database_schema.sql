-- Dealer Site Survey App - initial Database Schema

-- Enable Row Level Security
CREATE TABLE dealers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  external_salesforce_id TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;

CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), -- Tracks who conducted it
  status TEXT DEFAULT 'Draft',
  overall_score NUMERIC,
  recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  question_text TEXT NOT NULL,
  response_value TEXT, -- Yes, No, Partially, N/A
  score NUMERIC,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE TABLE survey_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_response_id UUID REFERENCES survey_responses(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE survey_photos ENABLE ROW LEVEL SECURITY;

-- Note: Proper RLS policies (e.g., users can only read/write their own surveys, or Admins can read all) should be applied.
-- For now, allowing all authenticated users full access to these tables during initial dev:
CREATE POLICY "Allow authenticated full access to dealers" ON dealers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access to surveys" ON surveys FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access to survey_responses" ON survey_responses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access to survey_photos" ON survey_photos FOR ALL USING (auth.role() = 'authenticated');


CREATE TABLE survey_weights (
  category TEXT PRIMARY KEY,
  weight NUMERIC NOT NULL,
  is_gatekeeper BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE survey_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated access to survey_weights" ON survey_weights FOR ALL USING (auth.role() = 'authenticated');

INSERT INTO survey_weights (category, weight, is_gatekeeper) VALUES
  ('Visibility & Accessibility', 20, false),
  ('Parking & Traffic Flow', 20, false),
  ('Customer Journey Potential', 20, false),
  ('Brand Identity Feasibility', 15, false),
  ('Facility & Technical Readiness', 15, false),
  ('Charging & Signage Readiness', 10, false),
  ('Compliance (Gatekeeper)', 0, true);
