-- Allow users to delete their own messages (for temporary messages feature)
CREATE POLICY "Users can delete their messages"
ON public.messages
FOR DELETE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);