-- ============================================================
-- NETRA Hospital Management System — Supabase Schema
-- Run this entire file in: Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension (already enabled by default on Supabase)
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────────
-- 1. USERS  (extends Supabase Auth — one row per auth user)
-- ──────────────────────────────────────────────────────────────
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  role        text not null check (role in ('patient','nurse','doctor','admin')),
  phone       text unique,
  username    text unique,
  created_at  timestamptz default now()
);

-- Auto-create a row here when someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'New User'),
    coalesce(new.raw_user_meta_data->>'role', 'patient')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ──────────────────────────────────────────────────────────────
-- 2. PATIENTS  (created before beds to break the circular FK)
-- ──────────────────────────────────────────────────────────────
create table public.patients (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid references public.users(id) on delete set null,
  name                    text not null,
  age                     int not null check (age > 0 and age < 150),
  phone                   text,
  symptoms                text not null,
  self_assessed_severity  text not null check (self_assessed_severity in ('mild','moderate','severe','critical')),
  verified_priority       text not null default 'moderate'
                          check (verified_priority in ('mild','moderate','severe','critical')),
  ward_type               text not null default 'general'
                          check (ward_type in ('general','emergency')),
  status                  text not null default 'in-queue'
                          check (status in ('waiting','in-queue','admitted','discharged')),
  token_number            int unique,
  queue_position          int,
  estimated_wait_time     int default 30,    -- minutes
  bed_id                  uuid,              -- FK added after beds table exists
  nurse_verified          boolean default false,
  admission_requested     boolean default false,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 3. BEDS  (created after patients so both FKs can reference existing tables)
-- ──────────────────────────────────────────────────────────────
create table public.beds (
  id          uuid primary key default uuid_generate_v4(),
  number      text not null unique,       -- 'G-001', 'E-003', 'ICU-002'
  type        text not null check (type in ('general','emergency','icu')),
  ward        text not null check (ward in ('general','emergency','icu')),
  status      text not null default 'available'
              check (status in ('available','occupied','cleaning','maintenance')),
  patient_id  uuid,                       -- FK added below
  floor       int not null default 1,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Add cross-table FKs now that both tables exist
alter table public.patients
  add constraint patients_bed_id_fkey
  foreign key (bed_id) references public.beds(id) on delete set null;

alter table public.beds
  add constraint beds_patient_id_fkey
  foreign key (patient_id) references public.patients(id) on delete set null;

-- ──────────────────────────────────────────────────────────────
-- 4. DOCTORS  (staff profile, separate from auth users)
-- ──────────────────────────────────────────────────────────────
create table public.doctors (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.users(id) on delete cascade,
  name            text not null,
  specialty       text not null,
  registration_no text unique,
  status          text not null default 'available'
                  check (status in ('available','busy','in-surgery','on-leave')),
  assigned_nurse_id uuid references public.users(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 5. APPOINTMENT REQUESTS
-- ──────────────────────────────────────────────────────────────
create table public.appointment_requests (
  id              uuid primary key default uuid_generate_v4(),
  patient_id      uuid references public.patients(id) on delete cascade,
  patient_name    text not null,           -- denormalized for quick display
  doctor_id       uuid references public.doctors(id) on delete set null,
  doctor_name     text not null,
  specialty       text not null,
  slot            text not null,           -- '10:00 AM – 12:00 PM'
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  reviewed_by     uuid references public.users(id) on delete set null,  -- admin
  reviewed_at     timestamptz,
  notes           text,
  requested_at    timestamptz default now(),
  created_at      timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 6. SURGERY ALERTS
-- ──────────────────────────────────────────────────────────────
create table public.surgery_alerts (
  id              uuid primary key default uuid_generate_v4(),
  doctor_id       uuid references public.doctors(id) on delete cascade,
  doctor_name     text not null,
  duration        text not null,           -- '2–3 hours'
  active          boolean not null default true,
  started_at      timestamptz default now(),
  ended_at        timestamptz,
  created_at      timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 7. SURGERY AFFECTED APPOINTMENTS  (linked to a surgery alert)
-- ──────────────────────────────────────────────────────────────
create table public.surgery_affected_appointments (
  id                  uuid primary key default uuid_generate_v4(),
  surgery_alert_id    uuid references public.surgery_alerts(id) on delete cascade,
  patient_name        text not null,
  original_time       text not null,
  concern             text not null,
  rescheduled_to      text,                -- filled by nurse
  rescheduled_by      uuid references public.users(id) on delete set null,
  rescheduled_at      timestamptz,
  created_at          timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 8. EMERGENCY ALERTS  (admin → all nurses)
-- ──────────────────────────────────────────────────────────────
create table public.emergency_alerts (
  id              uuid primary key default uuid_generate_v4(),
  message         text not null,
  triggered_by    uuid references public.users(id) on delete set null,
  active          boolean not null default true,
  triggered_at    timestamptz default now(),
  dismissed_at    timestamptz,
  dismissed_by    uuid references public.users(id) on delete set null
);

-- ──────────────────────────────────────────────────────────────
-- 9. ACTIVITY LOGS
-- ──────────────────────────────────────────────────────────────
create table public.activity_logs (
  id          uuid primary key default uuid_generate_v4(),
  action      text not null,
  details     text,
  actor       text not null default 'System',
  actor_id    uuid references public.users(id) on delete set null,
  patient_id  uuid references public.patients(id) on delete set null,
  created_at  timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 10. QUEUE  (computed/cached queue positions — optional)
--     You can also derive this with a query instead of a table
-- ──────────────────────────────────────────────────────────────
-- This view computes the live queue ordered by priority + arrival
create or replace view public.queue_view as
select
  p.id,
  p.name,
  p.age,
  p.symptoms,
  p.verified_priority,
  p.ward_type,
  p.status,
  p.token_number,
  p.estimated_wait_time,
  p.nurse_verified,
  p.admission_requested,
  p.created_at,
  row_number() over (
    order by
      case p.verified_priority
        when 'critical' then 1
        when 'severe'   then 2
        when 'moderate' then 3
        when 'mild'     then 4
      end,
      p.created_at asc
  ) as queue_position
from public.patients p
where p.status = 'in-queue';

-- ──────────────────────────────────────────────────────────────
-- UPDATED_AT triggers (auto-update on every row change)
-- ──────────────────────────────────────────────────────────────
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger beds_updated_at    before update on public.beds    for each row execute procedure public.update_updated_at();
create trigger patients_updated_at before update on public.patients for each row execute procedure public.update_updated_at();
create trigger doctors_updated_at  before update on public.doctors  for each row execute procedure public.update_updated_at();

-- ──────────────────────────────────────────────────────────────
-- INDEXES  (for fast querying)
-- ──────────────────────────────────────────────────────────────
create index idx_patients_status         on public.patients(status);
create index idx_patients_priority       on public.patients(verified_priority);
create index idx_patients_token          on public.patients(token_number);
create index idx_beds_status             on public.beds(status);
create index idx_beds_ward               on public.beds(ward);
create index idx_appt_requests_status    on public.appointment_requests(status);
create index idx_appt_requests_doctor    on public.appointment_requests(doctor_id);
create index idx_surgery_alerts_active   on public.surgery_alerts(active);
create index idx_emergency_alerts_active on public.emergency_alerts(active);
create index idx_activity_logs_created  on public.activity_logs(created_at desc);

-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────────
-- Enable RLS on all tables
alter table public.users                         enable row level security;
alter table public.patients                      enable row level security;
alter table public.beds                          enable row level security;
alter table public.doctors                       enable row level security;
alter table public.appointment_requests          enable row level security;
alter table public.surgery_alerts                enable row level security;
alter table public.surgery_affected_appointments enable row level security;
alter table public.emergency_alerts              enable row level security;
alter table public.activity_logs                 enable row level security;

-- Helper: get current user's role from public.users
create or replace function public.current_user_role()
returns text language sql security definer stable as $$
  select role from public.users where id = auth.uid()
$$;

-- ── USERS table policies ──
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Admins can read all users"
  on public.users for select
  using (public.current_user_role() = 'admin');

-- ── PATIENTS — anyone authenticated can register; staff can see all ──
create policy "Anyone authenticated can insert patient"
  on public.patients for insert
  with check (auth.uid() is not null);

create policy "Staff can view all patients"
  on public.patients for select
  using (public.current_user_role() in ('nurse','doctor','admin'));

create policy "Patient can view own record"
  on public.patients for select
  using (user_id = auth.uid());

create policy "Nurse and doctor can update patients"
  on public.patients for update
  using (public.current_user_role() in ('nurse','doctor','admin'));

-- ── BEDS — staff read/write, patients read-only ──
create policy "Anyone authenticated can view beds"
  on public.beds for select
  using (auth.uid() is not null);

create policy "Admin can manage beds"
  on public.beds for all
  using (public.current_user_role() = 'admin');

create policy "Nurse can update bed status"
  on public.beds for update
  using (public.current_user_role() in ('nurse','admin'));

-- ── APPOINTMENT REQUESTS ──
create policy "Patients can create appointment requests"
  on public.appointment_requests for insert
  with check (auth.uid() is not null);

create policy "Patients can view own requests"
  on public.appointment_requests for select
  using (
    (select user_id from public.patients where id = patient_id) = auth.uid()
    or public.current_user_role() in ('admin','doctor','nurse')
  );

create policy "Admin can approve/reject requests"
  on public.appointment_requests for update
  using (public.current_user_role() = 'admin');

-- ── SURGERY ALERTS ──
create policy "Doctors can create surgery alerts"
  on public.surgery_alerts for insert
  with check (public.current_user_role() = 'doctor');

create policy "Staff can view surgery alerts"
  on public.surgery_alerts for select
  using (public.current_user_role() in ('doctor','nurse','admin'));

create policy "Doctor can update own surgery alert"
  on public.surgery_alerts for update
  using (public.current_user_role() in ('doctor','admin'));

-- ── SURGERY AFFECTED APPOINTMENTS ──
create policy "Staff can view affected appointments"
  on public.surgery_affected_appointments for select
  using (public.current_user_role() in ('doctor','nurse','admin'));

create policy "Nurse can reschedule affected appointments"
  on public.surgery_affected_appointments for update
  using (public.current_user_role() in ('nurse','admin'));

-- ── EMERGENCY ALERTS ──
create policy "Admin can manage emergency alerts"
  on public.emergency_alerts for all
  using (public.current_user_role() = 'admin');

create policy "Nurses can view and dismiss emergency alerts"
  on public.emergency_alerts for select
  using (public.current_user_role() in ('nurse','admin'));

create policy "Nurses can dismiss emergency alerts"
  on public.emergency_alerts for update
  using (public.current_user_role() in ('nurse','admin'));

-- ── ACTIVITY LOGS ──
create policy "Staff can view activity logs"
  on public.activity_logs for select
  using (public.current_user_role() in ('nurse','doctor','admin'));

create policy "System can insert activity logs"
  on public.activity_logs for insert
  with check (auth.uid() is not null);

-- ── DOCTORS ──
create policy "Anyone authenticated can view doctors"
  on public.doctors for select
  using (auth.uid() is not null);

create policy "Admin can manage doctors"
  on public.doctors for all
  using (public.current_user_role() = 'admin');

create policy "Doctor can update own status"
  on public.doctors for update
  using (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- REALTIME  (enable real-time subscriptions for live updates)
-- ──────────────────────────────────────────────────────────────
-- Run this to enable real-time on the tables that need live updates:
-- Dashboard → Database → Replication → Tables → toggle ON for:
--   patients, beds, appointment_requests, surgery_alerts,
--   surgery_affected_appointments, emergency_alerts

-- Or via SQL:
alter publication supabase_realtime add table public.patients;
alter publication supabase_realtime add table public.beds;
alter publication supabase_realtime add table public.appointment_requests;
alter publication supabase_realtime add table public.surgery_alerts;
alter publication supabase_realtime add table public.surgery_affected_appointments;
alter publication supabase_realtime add table public.emergency_alerts;
alter publication supabase_realtime add table public.activity_logs;
