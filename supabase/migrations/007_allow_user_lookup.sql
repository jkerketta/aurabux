-- Allow authenticated users to view any user profile (needed for friend search/lookup)
create policy "Authenticated users can view any user profile"
  on public.users for select
  using (auth.role() = 'authenticated');
