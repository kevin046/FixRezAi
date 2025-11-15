-- Create table for tracking resume optimizations
CREATE TABLE optimization_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_title TEXT NOT NULL,
    job_description TEXT NOT NULL,
    original_resume_text TEXT NOT NULL,
    optimized_resume_data JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'error')),
    duration_seconds INTEGER,
    error_message TEXT,
    model_used TEXT,
    optimization_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for tracking exports
CREATE TABLE export_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    optimization_id UUID REFERENCES optimization_history(id) ON DELETE SET NULL,
    format TEXT NOT NULL CHECK (format IN ('pdf', 'text', 'json', 'linkedin')),
    template TEXT,
    filename TEXT,
    file_size_bytes INTEGER,
    export_data_hash TEXT,
    export_timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for storing complete export formats
CREATE TABLE export_formats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    export_id UUID NOT NULL REFERENCES export_history(id) ON DELETE CASCADE,
    format_type TEXT NOT NULL CHECK (format_type IN ('pdf', 'text', 'json', 'linkedin')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE optimization_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_formats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for optimization_history
CREATE POLICY "Users can view their own optimization history" ON optimization_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own optimization history" ON optimization_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own optimization history" ON optimization_history
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for export_history
CREATE POLICY "Users can view their own export history" ON export_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own export history" ON export_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own export history" ON export_history
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for export_formats
CREATE POLICY "Users can view their own export formats" ON export_formats
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM export_history 
        WHERE export_history.id = export_formats.export_id 
        AND export_history.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own export formats" ON export_formats
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM export_history 
        WHERE export_history.id = export_formats.export_id 
        AND export_history.user_id = auth.uid()
    ));

-- Create indexes for performance
CREATE INDEX idx_optimization_history_user_id ON optimization_history(user_id);
CREATE INDEX idx_optimization_history_timestamp ON optimization_history(optimization_timestamp DESC);
CREATE INDEX idx_optimization_history_status ON optimization_history(status);

CREATE INDEX idx_export_history_user_id ON export_history(user_id);
CREATE INDEX idx_export_history_timestamp ON export_history(export_timestamp DESC);
CREATE INDEX idx_export_history_format ON export_history(format);
CREATE INDEX idx_export_history_optimization_id ON export_history(optimization_id);

CREATE INDEX idx_export_formats_export_id ON export_formats(export_id);
CREATE INDEX idx_export_formats_format_type ON export_formats(format_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_optimization_history_updated_at
    BEFORE UPDATE ON optimization_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_export_history_updated_at
    BEFORE UPDATE ON export_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON optimization_history TO anon, authenticated;
GRANT INSERT ON optimization_history TO anon, authenticated;
GRANT UPDATE ON optimization_history TO anon, authenticated;

GRANT SELECT ON export_history TO anon, authenticated;
GRANT INSERT ON export_history TO anon, authenticated;
GRANT UPDATE ON export_history TO anon, authenticated;

GRANT SELECT ON export_formats TO anon, authenticated;
GRANT INSERT ON export_formats TO anon, authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;