-- Add term field to subjects table
ALTER TABLE public.subjects 
ADD COLUMN term text;

-- Add an index for better performance
CREATE INDEX idx_subjects_term ON public.subjects(term);