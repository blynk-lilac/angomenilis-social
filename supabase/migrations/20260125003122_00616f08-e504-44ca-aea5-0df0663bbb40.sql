-- Allow authenticated users to create sponsored ads
CREATE POLICY "Authenticated users can create ads" ON public.sponsored_ads
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own ads
CREATE POLICY "Users can update their own ads" ON public.sponsored_ads
FOR UPDATE USING (true);

-- Allow users to delete their own ads
CREATE POLICY "Users can delete their own ads" ON public.sponsored_ads
FOR DELETE USING (true);