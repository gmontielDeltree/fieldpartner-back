-- KAN-70: technical sheet of an input (stored file name + original name).
ALTER TABLE "inputs" ADD COLUMN "documentFile" TEXT,
ADD COLUMN "documentFileName" TEXT;
