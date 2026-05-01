-- Companies master table: stores company name, logo and default contact details
-- shown when an admin picks the company in the Digital Business Cards form.

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo TEXT DEFAULT '',
  telephone TEXT DEFAULT '',
  website TEXT DEFAULT '',
  address TEXT DEFAULT '',
  location_link TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_sort_order ON companies (sort_order);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies (name);

-- Row level security: matches the management_profiles pattern.
-- Public can read (in case logos/contact info are later shown on profile pages),
-- writes go through the admin API which uses the service role key and bypasses RLS.
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read companies" ON companies;
CREATE POLICY "Public can read companies"
  ON companies FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage companies" ON companies;
CREATE POLICY "Admins can manage companies"
  ON companies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- Seed initial companies with the defaults previously hardcoded in the
-- admin UI so the new tab is immediately useful.
INSERT INTO companies (name, telephone, website, address, location_link, sort_order)
VALUES
  ('LEGEND Holding Group',
   '+971 4 234 0738',
   'https://www.legendholding.com',
   'Plot No- S30502 - opposite Redington, Gate5 - JAFZA - Dubai - UAE',
   'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3927.7844377633974!2d55.117593199999995!3d24.967728099999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f134e58a88347%3A0x9ee7ae329a203863!2sLegend%20Holding%20Group%20-%20Global%20HQ%20Space!5e1!3m2!1sen!2sae!4v1745214584825!5m2!1sen!2sae',
   1),
  ('Dealership - 212',
   '+971 4 386 1700',
   'https://212uae.com/',
   'Dealership - 212, Plot 128-246, Al Khabeesi Building, Dubai - UAE',
   'https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3608.230334145366!2d55.33505100000001!3d25.262836000000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMjXCsDE1JzQ2LjIiTiA1NcKwMjAnMDYuMiJF!5e0!3m2!1sar!2sae!4v1728038365894!5m2!1sar!2sae',
   2),
  ('LEGEND Multi Motors',
   '+971 4 221 9958',
   'https://legendmotorsuae.com/',
   'Showroom # S02, Al Khoory, Sky Garden,Port Saeed Deira, Dubai-UAE',
   'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3608.3992864126753!2d55.335217199999995!3d25.257150300000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5d07cce90e77%3A0x7efb9efd52256b5d!2sSkywell%20Electric%20Vehicles%20-%20Legend%20Motors!5e0!3m2!1sar!2sae!4v1716876906372!5m2!1sar!2sae',
   3),
  ('Legend Motors - Trading',
   '+971 4 258 0046',
   'https://legendmotorsuae.com/',
   'Showroom No -46, New Automarket, Al Aweer ,Ras Al Khor , Dubai-UAE',
   'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14443.99698501397!2d55.3681825!3d25.1695033!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f67b797eb5a31%3A0xc0f1a9fbb4f88db5!2sLegend%20Motors%2046%2C%20Dubai%201!5e0!3m2!1sen!2sae!4v1710409320109!5m2!1sen!2sae',
   4),
  ('LEGEND World Travel & Tourism',
   '+971 4 548 9489',
   'https://www.legendtravels.com',
   'Room 1904 Block D, Aspect Tower Business Bay, Dubai UAE',
   'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d125459.05103709637!2d55.183954688402046!3d25.192010332149927!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f615ac4a1c607%3A0xade3d2df27e4d9ab!2sLegend%20World%20Travel%20%26%20Tourism!5e1!3m2!1sen!2sae!4v1745485165402!5m2!1sen!2sae',
   5),
  ('LEGEND World Automobile Services',
   '+971 4 234 0738',
   'https://www.legendautoservices.com/',
   'Yard No:59, 22nd Street,Industrial Area -2 , Al Quoz,Dubai-UAE',
   'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14448.772422712113!2d55.2264637!3d25.1291615!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f696fe56cf769%3A0xf798a999ce6259d2!2sLegend%20Auto%20Services!5e0!3m2!1sen!2sae!4v1774443229325!5m2!1sen!2sae',
   6),
  ('LMM-D-Service',
   '+971 4 265 8047',
   'https://legendmotorsuae.com/',
   'PLOT S1-2 RAS AL KHOR IND 2 DUBAI. Plot S1-2',
   'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3921.2836209610464!2d55.348091800000006!3d25.1706187!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f670068ad1c43%3A0x9b216b2ac4eb584!2sLegend%20Multi%20Motors%20-%20Service%20center!5e1!3m2!1sen!2sae!4v1746268030518!5m2!1sen!2sae',
   7),
  ('Dealership - Kaiyi',
   '+971 800 52494',
   'https://www.kaiyi.ae/',
   'Kaiyi Showroom, Plot 128-246 Al Khabaisi Building, Al Ittihad Road, Deira Dubai, United Arab Emirates',
   'https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3608.230334145366!2d55.33505100000001!3d25.262836000000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMjXCsDE1JzQ2LjIiTiA1NcKwMjAnMDYuMiJF!5e0!3m2!1sar!2sae!4v1728038365894!5m2!1sar!2sae',
   8),
  ('ZUL Energy',
   '+971 4 272 7603',
   'https://www.zulenergy.com',
   '1903 - 19th Floor,  JBC4, Cluster N, JLT,  Dubai – UAE',
   'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3614.1575466931536!2d55.13583907570722!3d25.062648777797758!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f69587889e31d%3A0xe99198d629887eb4!2sZul%20Energy!5e0!3m2!1sen!2sae!4v1730707953773!5m2!1sen!2sae',
   9),
  ('LEGEND World Rent a Car',
   '+971 4 250 7867',
   'https://www.legendrentacar.com/',
   'Yard No:59, 22nd Street,Industrial Area -2 , Al Quoz,Dubai-UAE',
   'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3612.19155022003!2d55.24574!3d25.129214100000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f69c714664d71%3A0xcc04169981c4f1b2!2sLegend%20World%20Rent%20a%20Car!5e0!3m2!1sen!2sae!4v1710409659926!5m2!1sen!2sae',
   10),
  ('LEGEND World Investments',
   '+971 4 250 7867',
   'https://www.legendrentacar.com',
   'Yard No:59, 22nd Street,Industrial Area -2 , Al Quoz,Dubai-UAE',
   'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3612.19155022003!2d55.24574!3d25.129214100000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f69c714664d71%3A0xcc04169981c4f1b2!2sLegend%20World%20Rent%20a%20Car!5e0!3m2!1sen!2sae!4v1710409659926!5m2!1sen!2sae',
   11),
  ('Legend Motors',
   '+971 4 258 0046',
   'https://www.legendmotorsuae.com',
   'Showroom No -46, New Automarket, Al Aweer ,Ras Al Khor , Dubai-UAE',
   'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14443.99698501397!2d55.3681825!3d25.1695033!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f67b797eb5a31%3A0xc0f1a9fbb4f88db5!2sLegend%20Motors%2046%2C%20Dubai%201!5e0!3m2!1sen!2sae!4v1710409320109!5m2!1sen!2sae',
   12),
  ('Legend Motors FZCO',
   '+971 4 548 8872',
   'https://legendmotorsuae.com/',
   'Showroom No-26, DUCAMZ, Ras Al Khor, Al Awir, Dubai-UAE',
   'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14443.608864137535!2d55.3766311!3d25.1727794!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f678650c58d69%3A0xaa6cd74d7688f092!2sLegend%20Motors%2026%2C%20Dubai%204!5e0!3m2!1sen!2sae!4v1710409536184!5m2!1sen!2sae',
   13),
  ('Dealership - Skywell',
   '+971 800 759 9355',
   'https://legendmotorsuae.com/',
   'Showroom # S02, Al Khoory Sky Garden, Port Saeed, Deira, Dubai, UAE',
   'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3608.3992864126753!2d55.335217199999995!3d25.257150300000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5d07cce90e77%3A0x7efb9efd52256b5d!2sSkywell%20Electric%20Vehicles%20-%20Legend%20Motors!5e0!3m2!1sar!2sae!4v1716876906372!5m2!1sar!2sae',
   14),
  ('Legend World Travel and Tourism',
   '+971 4 548 9489',
   'https://www.legendtravels.com',
   'Room 1904 Block D, Aspect Tower Business Bay, Dubai UAE',
   'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14439.38262656364!2d55.276428!3d25.208427!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f437dde012255%3A0x40969e56c2aad502!2sEmirates%20Financial%20Towers!5e0!3m2!1sen!2sae!4v1710409761077!5m2!1sen!2sae',
   15),
  ('Legend Multi Motors - Lifan Motorbyke',
   '+971 4 548 4087',
   'https://legendlifan.com/',
   'Yard No:59, 22nd Street,Industrial Area -2 , Al Quoz,Dubai-UAE',
   'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3612.19155022003!2d55.24574!3d25.129214100000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f69c714664d71%3A0xcc04169981c4f1b2!2sLegend%20World%20Rent%20a%20Car!5e0!3m2!1sen!2sae!4v1710409659926!5m2!1sen!2sae',
   16)
ON CONFLICT (name) DO NOTHING;
