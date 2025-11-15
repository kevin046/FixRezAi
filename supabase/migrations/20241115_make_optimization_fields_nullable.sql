-- Make optimization history fields nullable since we only track metadata
ALTER TABLE optimization_history 
ALTER COLUMN job_description DROP NOT NULL,
ALTER COLUMN original_resume_text DROP NOT NULL,
ALTER COLUMN optimized_resume_data DROP NOT NULL;