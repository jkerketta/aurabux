-- Allow users to insert their own portfolio row (needed for auto-create on first buy)
create policy "Users can insert own portfolio"
  on public.portfolios for insert
  with check (auth.uid() = user_id);
