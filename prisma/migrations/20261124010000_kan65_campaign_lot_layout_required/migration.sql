-- KAN-65: every campaign works on a lot layout. Creating a campaign without one creates an
-- empty layout named after it (CampaignBusiness.create), so the front never has to handle a
-- campaign with nowhere to draw its lots. The column was nullable only until that existed.
-- Fails if a campaign still has no layout: assign one first (the table starts empty).
ALTER TABLE "campaigns" ALTER COLUMN "lotLayoutId" SET NOT NULL;
