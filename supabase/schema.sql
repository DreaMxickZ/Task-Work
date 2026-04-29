-- ============================================================================
-- WORK TRACKER - Supabase Database Schema
-- ============================================================================
-- วิธีใช้:
-- 1. ไปที่ Supabase Dashboard > SQL Editor
-- 2. กด "New query"
-- 3. Copy ทั้งไฟล์นี้ไปวาง แล้วกด RUN
-- 4. ถ้ามี error ให้ดูที่หมายเหตุท้ายไฟล์
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ส่วนที่ 1: เปิด Extensions ที่จำเป็น
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ----------------------------------------------------------------------------
-- ส่วนที่ 2: ลบตารางเก่า (ถ้ามี) - ใช้สำหรับ reset DB
-- ----------------------------------------------------------------------------
-- ถ้ารันครั้งแรก ส่วนนี้จะไม่มีผลอะไร
-- ถ้าต้อง reset ให้ uncomment บรรทัดด้านล่าง
-- DROP TABLE IF EXISTS public.task_attachments CASCADE;
-- DROP TABLE IF EXISTS public.progress_logs CASCADE;
-- DROP TABLE IF EXISTS public.project_versions CASCADE;
-- DROP TABLE IF EXISTS public.tasks CASCADE;
-- DROP TABLE IF EXISTS public.holidays CASCADE;
-- DROP TABLE IF EXISTS public.work_schedule CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;


-- ----------------------------------------------------------------------------
-- ส่วนที่ 3: ตาราง profiles (ข้อมูลผู้ใช้เพิ่มเติม)
-- ----------------------------------------------------------------------------
-- Supabase มี auth.users อยู่แล้ว ตารางนี้เก็บข้อมูลเพิ่ม เช่น display name
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ----------------------------------------------------------------------------
-- ส่วนที่ 4: ตาราง tasks (งานหลัก)
-- ----------------------------------------------------------------------------
-- เก็บทั้งงาน Routine และ Project
-- category: หมวดงาน (it_support, data_analytic, media_ai)
-- task_type: ประเภท (routine, project)
-- status: สถานะ (todo, in_progress, done) - สำหรับ Drag & Drop
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  category TEXT NOT NULL CHECK (category IN ('it_support', 'data_analytic', 'media_ai')),
  task_type TEXT NOT NULL CHECK (task_type IN ('routine', 'project')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- วันเริ่ม / กำหนดเสร็จ
  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- สำหรับ Routine ที่ทำซ้ำ
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', NULL)),

  -- tags เก็บเป็น array ของ string
  tags TEXT[] DEFAULT '{}',

  -- order สำหรับ drag & drop ภายใน column เดียวกัน
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);


-- ----------------------------------------------------------------------------
-- ส่วนที่ 5: ตาราง project_versions (เวอร์ชันของงาน Project)
-- ----------------------------------------------------------------------------
-- เก็บแต่ละ version ของ project (v1, v2, v3...)
-- มี relation กับ tasks (เฉพาะที่เป็น project)
CREATE TABLE IF NOT EXISTS public.project_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  version_number INTEGER NOT NULL,
  version_name TEXT,                      -- เช่น "MVP", "Beta", "Production"
  description TEXT,                       -- ทำอะไรบ้างใน version นี้
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'cancelled')),

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(task_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_versions_task_id ON public.project_versions(task_id);


-- ----------------------------------------------------------------------------
-- ส่วนที่ 6: ตาราง progress_logs (บันทึกความคืบหน้า)
-- ----------------------------------------------------------------------------
-- ใช้ได้ทั้งงาน routine และ project
-- ถ้าเป็น project log ของ version ไหน ก็ใส่ version_id
CREATE TABLE IF NOT EXISTS public.progress_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.project_versions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  content TEXT NOT NULL,                  -- เนื้อหา log (ทำอะไรบ้าง)
  log_type TEXT DEFAULT 'progress' CHECK (log_type IN ('progress', 'note', 'milestone', 'issue')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_task_id ON public.progress_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_logs_version_id ON public.progress_logs(version_id);


-- ----------------------------------------------------------------------------
-- ส่วนที่ 7: ตาราง task_attachments (ไฟล์แนบ / รูปภาพ)
-- ----------------------------------------------------------------------------
-- เก็บ URL ของไฟล์ที่อัพโหลดเข้า Supabase Storage
-- ผูกกับ task หรือ progress_log อย่างใดอย่างหนึ่ง
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  log_id UUID REFERENCES public.progress_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,                -- path ใน Supabase Storage
  file_url TEXT NOT NULL,                 -- public URL
  file_type TEXT,                         -- mime type เช่น image/png
  file_size INTEGER,                      -- bytes

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- ต้องผูกกับ task หรือ log อย่างน้อย 1 อย่าง
  CHECK (task_id IS NOT NULL OR log_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_log_id ON public.task_attachments(log_id);


-- ----------------------------------------------------------------------------
-- ส่วนที่ 8: ตาราง work_schedule (เวลาทำงานของแต่ละผู้ใช้)
-- ----------------------------------------------------------------------------
-- 0 = อาทิตย์, 1 = จันทร์, ..., 6 = เสาร์
CREATE TABLE IF NOT EXISTS public.work_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  is_working_day BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, day_of_week)
);


-- ----------------------------------------------------------------------------
-- ส่วนที่ 9: ตาราง holidays (วันหยุดที่กำหนดเอง)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  holiday_date DATE NOT NULL,
  holiday_name TEXT NOT NULL,
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, holiday_date)
);

CREATE INDEX IF NOT EXISTS idx_holidays_user_date ON public.holidays(user_id, holiday_date);


-- ============================================================================
-- ส่วนที่ 10: ROW LEVEL SECURITY (RLS) - สำคัญมาก!
-- ============================================================================
-- เปิด RLS ให้ทุกตาราง เพื่อให้ผู้ใช้เห็นแค่ข้อมูลของตัวเอง

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- Policies: profiles
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);


-- ----------------------------------------------------------------------------
-- Policies: tasks
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
CREATE POLICY "tasks_select_own" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
CREATE POLICY "tasks_update_own" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_delete_own" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- Policies: project_versions
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "versions_select_own" ON public.project_versions;
CREATE POLICY "versions_select_own" ON public.project_versions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "versions_insert_own" ON public.project_versions;
CREATE POLICY "versions_insert_own" ON public.project_versions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "versions_update_own" ON public.project_versions;
CREATE POLICY "versions_update_own" ON public.project_versions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "versions_delete_own" ON public.project_versions;
CREATE POLICY "versions_delete_own" ON public.project_versions
  FOR DELETE USING (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- Policies: progress_logs
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "logs_select_own" ON public.progress_logs;
CREATE POLICY "logs_select_own" ON public.progress_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "logs_insert_own" ON public.progress_logs;
CREATE POLICY "logs_insert_own" ON public.progress_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "logs_update_own" ON public.progress_logs;
CREATE POLICY "logs_update_own" ON public.progress_logs
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "logs_delete_own" ON public.progress_logs;
CREATE POLICY "logs_delete_own" ON public.progress_logs
  FOR DELETE USING (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- Policies: task_attachments
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "attachments_select_own" ON public.task_attachments;
CREATE POLICY "attachments_select_own" ON public.task_attachments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "attachments_insert_own" ON public.task_attachments;
CREATE POLICY "attachments_insert_own" ON public.task_attachments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attachments_delete_own" ON public.task_attachments;
CREATE POLICY "attachments_delete_own" ON public.task_attachments
  FOR DELETE USING (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- Policies: work_schedule
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "schedule_select_own" ON public.work_schedule;
CREATE POLICY "schedule_select_own" ON public.work_schedule
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "schedule_insert_own" ON public.work_schedule;
CREATE POLICY "schedule_insert_own" ON public.work_schedule
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "schedule_update_own" ON public.work_schedule;
CREATE POLICY "schedule_update_own" ON public.work_schedule
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "schedule_delete_own" ON public.work_schedule;
CREATE POLICY "schedule_delete_own" ON public.work_schedule
  FOR DELETE USING (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- Policies: holidays
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "holidays_select_own" ON public.holidays;
CREATE POLICY "holidays_select_own" ON public.holidays
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "holidays_insert_own" ON public.holidays;
CREATE POLICY "holidays_insert_own" ON public.holidays
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "holidays_update_own" ON public.holidays;
CREATE POLICY "holidays_update_own" ON public.holidays
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "holidays_delete_own" ON public.holidays;
CREATE POLICY "holidays_delete_own" ON public.holidays
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================================
-- ส่วนที่ 11: TRIGGERS - อัพเดท updated_at อัตโนมัติ
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_versions_updated_at ON public.project_versions;
CREATE TRIGGER update_versions_updated_at
  BEFORE UPDATE ON public.project_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedule_updated_at ON public.work_schedule;
CREATE TRIGGER update_schedule_updated_at
  BEFORE UPDATE ON public.work_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- ส่วนที่ 12: TRIGGER สร้าง profile อัตโนมัติเมื่อ user สมัคร + work schedule default
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- สร้าง profile
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  -- สร้าง work schedule default (จันทร์-ศุกร์ 9:00-18:00, เสาร์-อาทิตย์ ปิด)
  INSERT INTO public.work_schedule (user_id, day_of_week, start_time, end_time, is_working_day)
  VALUES
    (NEW.id, 0, '09:00', '18:00', FALSE),  -- อาทิตย์
    (NEW.id, 1, '09:00', '18:00', TRUE),   -- จันทร์
    (NEW.id, 2, '09:00', '18:00', TRUE),   -- อังคาร
    (NEW.id, 3, '09:00', '18:00', TRUE),   -- พุธ
    (NEW.id, 4, '09:00', '18:00', TRUE),   -- พฤหัส
    (NEW.id, 5, '09:00', '18:00', TRUE),   -- ศุกร์
    (NEW.id, 6, '09:00', '18:00', FALSE);  -- เสาร์

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- ส่วนที่ 13: STORAGE BUCKET สำหรับเก็บรูป
-- ============================================================================
-- สร้าง bucket ชื่อ 'task-attachments' (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Policy ให้ user upload ได้เฉพาะใน folder ของตัวเอง (folder = user_id)
DROP POLICY IF EXISTS "storage_upload_own" ON storage.objects;
CREATE POLICY "storage_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "storage_select_all" ON storage.objects;
CREATE POLICY "storage_select_all" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "storage_delete_own" ON storage.objects;
CREATE POLICY "storage_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================================
-- เสร็จสิ้น! ✅
-- ============================================================================
-- ถ้ารันสำเร็จ ทุกอย่างพร้อมใช้งาน
--
-- ปัญหาที่พบบ่อย:
-- 1. "permission denied for schema auth"
--    → ใช้ Supabase Dashboard SQL Editor (ไม่ใช่ psql โดยตรง)
--
-- 2. "trigger on_auth_user_created already exists"
--    → ปกติ ไม่ต้องสนใจ ไฟล์นี้ใช้ DROP IF EXISTS แล้ว
--
-- 3. ถ้า login แล้วไม่มี profile
--    → user ที่สมัครก่อนสร้าง trigger จะไม่มี profile
--      ให้รัน SQL นี้เพื่อ backfill:
--    INSERT INTO public.profiles (id, email, display_name)
--    SELECT id, email, split_part(email, '@', 1)
--    FROM auth.users
--    WHERE id NOT IN (SELECT id FROM public.profiles);
--
-- 4. Storage upload ไม่ได้
--    → เช็คว่า bucket 'task-attachments' ถูกสร้างใน Storage tab แล้ว
--    → ตอน upload ต้องใช้ path: {user_id}/filename.png
-- ============================================================================
