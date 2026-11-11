create table profiles(id uuid primary key references auth.users on delete cascade, username text unique not null check(length(username) between 3 and 20));
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,username) values(new.id,new.raw_user_meta_data->>'username'); return new; end $$;
create trigger on_signup after insert on auth.users for each row execute function handle_new_user();

create table friendships(id uuid primary key default gen_random_uuid(), requester uuid not null references profiles on delete cascade, addressee uuid not null references profiles on delete cascade, status text not null default 'pending', unique(requester,addressee), check(requester<>addressee));
create table servers(id uuid primary key default gen_random_uuid(), name text not null check(length(name)<=40), owner uuid not null default auth.uid() references profiles, is_public boolean default true);
create table server_members(server_id uuid references servers on delete cascade, user_id uuid references profiles on delete cascade, primary key(server_id,user_id));
create table channels(id uuid primary key default gen_random_uuid(), server_id uuid references servers on delete cascade, name text not null, kind text not null default 'text' check(kind in('text','voice')));
create table messages(id bigint generated always as identity primary key, room text not null, sender uuid not null default auth.uid() references profiles, content text not null check(length(content)<=2000), created_at timestamptz default now());
create index on messages(room,created_at);

create function is_member(sid uuid) returns boolean language sql security definer stable set search_path=public as $$ select exists(select 1 from server_members where server_id=sid and user_id=auth.uid()) $$;
create function can_access(r text) returns boolean language sql security definer stable set search_path=public as $$
 select (r like 'dm:%' and position(auth.uid()::text in r)>0) or exists(select 1 from channels c where c.id::text=r and is_member(c.server_id)) $$;

alter table profiles enable row level security; alter table friendships enable row level security; alter table servers enable row level security;
alter table server_members enable row level security; alter table channels enable row level security; alter table messages enable row level security;

create policy p_sel on profiles for select to authenticated using(true);
create policy f_sel on friendships for select using(auth.uid() in(requester,addressee));
create policy f_ins on friendships for insert with check(requester=auth.uid());
create policy f_upd on friendships for update using(addressee=auth.uid());
create policy f_del on friendships for delete using(auth.uid() in(requester,addressee));
create policy s_sel on servers for select using(is_public or owner=auth.uid() or is_member(id));
create policy s_ins on servers for insert with check(owner=auth.uid());
create policy s_del on servers for delete using(owner=auth.uid());
create policy m_sel on server_members for select using(user_id=auth.uid() or is_member(server_id));
create policy m_ins on server_members for insert with check(user_id=auth.uid() and exists(select 1 from servers s where s.id=server_id and (s.is_public or s.owner=auth.uid())));
create policy m_del on server_members for delete using(user_id=auth.uid());
create policy c_sel on channels for select using(is_member(server_id));
create policy c_ins on channels for insert with check(exists(select 1 from servers s where s.id=server_id and s.owner=auth.uid()));
create policy c_del on channels for delete using(exists(select 1 from servers s where s.id=server_id and s.owner=auth.uid()));
create policy msg_sel on messages for select using(can_access(room));
create policy msg_ins on messages for insert with check(sender=auth.uid() and can_access(room));

alter publication supabase_realtime add table messages, friendships, servers, server_members, channels;
