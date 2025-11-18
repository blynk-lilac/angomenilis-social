-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Set replica identity to full for messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;
