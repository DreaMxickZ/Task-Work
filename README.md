# Work Tracker

เว็บติดตามงานส่วนตัว แบ่งเป็น 3 หมวด: IT Support / Data Analytic / Media & AI Automation

รองรับงาน Routine และ Project มี Versioning, Progress Logs, รูปภาพแนบ, Drag & Drop, ปฏิทิน, และ Custom Holidays

---

## ✨ Features

- 🔐 **Auth** - Sign up / Sign in ผ่าน Supabase
- 📋 **Kanban Board** - Drag & drop เปลี่ยนสถานะงาน (To Do / In Progress / Done)
- 🔄 **Project Versioning** - แต่ละ Project มี v1, v2, v3... แยก progress log ต่อ version
- 📝 **Progress Logs** - บันทึกความคืบหน้า, Milestone, Issue, Note
- 🖼️ **Image Upload** - แนบรูปได้ทั้งใน task และ progress log
- 📅 **Calendar** - ดูงานทั้งหมดแบบปฏิทิน เห็นวันหยุด
- ⏰ **Custom Schedule** - กำหนดเวลาทำงานเอง
- 🏖️ **Holidays** - กำหนดวันหยุดของคุณ
- 🏷️ **Tags & Priority** - จัดประเภทงานได้ละเอียด
- 🔍 **Search & Filter** - หางานเก่าได้ง่าย
- 🌙 **Dark Mode** - สบายตา
- 🔁 **Recurring Routine** - ตั้งงาน routine ทำซ้ำรายวัน/สัปดาห์/เดือน

---

## 🚀 Setup (อ่านให้ครบทุกขั้น)

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. ตั้ง Supabase Project

1. ไปที่ https://supabase.com → สร้าง Project ใหม่ (รอ 2 นาที)
2. ไปที่ **Project Settings → API** copy 2 ค่านี้:
   - `Project URL`
   - `anon public` key
3. สร้างไฟล์ `.env` (copy จาก `.env.example`)

```bash
cp .env.example .env
```

แล้วใส่ค่าจริงลงไป:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. รัน SQL Schema (สำคัญที่สุด!)

> ก่อนหน้านี้คุณบอกว่ามีปัญหาตอน create DB — ผมเขียนไฟล์ SQL ให้แบบละเอียดมาก แก้ปัญหาเดิมแล้ว

1. ไปที่ Supabase Dashboard → **SQL Editor**
2. กด **+ New query**
3. เปิดไฟล์ `supabase/schema.sql` copy ทั้งหมด
4. วางใน SQL Editor → กด **Run** (มุมขวาล่าง)

ถ้ารันสำเร็จจะขึ้น "Success. No rows returned"

**ไฟล์ schema.sql ทำอะไรบ้าง?**
- สร้างตาราง 7 ตาราง (profiles, tasks, project_versions, progress_logs, task_attachments, work_schedule, holidays)
- เปิด Row Level Security ทุกตาราง (user เห็นแค่ data ของตัวเอง)
- สร้าง Storage bucket `task-attachments` พร้อม policies
- สร้าง Trigger ที่ auto-create profile + work schedule เมื่อ user สมัครใหม่
- สร้าง Trigger update `updated_at` อัตโนมัติ

### 4. รันแอป

```bash
npm run dev
```

เปิด http://localhost:5173

---

## 🔧 ปัญหาที่อาจเจอ + วิธีแก้

### ปัญหา 1: "permission denied for schema auth"
**สาเหตุ:** รัน SQL ผิดที่
**แก้:** ใช้ Supabase Dashboard → SQL Editor (ไม่ใช่ psql terminal)

### ปัญหา 2: Login แล้วไม่มี profile / data ไม่บันทึก
**สาเหตุ:** สมัครก่อนรัน schema → trigger ยังไม่ทำงานตอนสมัคร
**แก้:** รัน SQL นี้ใน SQL Editor เพื่อ backfill:

```sql
INSERT INTO public.profiles (id, email, display_name)
SELECT id, email, split_part(email, '@', 1)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

INSERT INTO public.work_schedule (user_id, day_of_week, start_time, end_time, is_working_day)
SELECT u.id, dow, '09:00'::time, '18:00'::time,
       CASE WHEN dow IN (0, 6) THEN FALSE ELSE TRUE END
FROM auth.users u
CROSS JOIN generate_series(0, 6) dow
WHERE NOT EXISTS (
  SELECT 1 FROM public.work_schedule ws
  WHERE ws.user_id = u.id AND ws.day_of_week = dow
);
```

### ปัญหา 3: อัพรูปไม่ได้ (Storage error)
**แก้:**
1. ไปที่ Supabase Dashboard → **Storage** → ตรวจว่ามี bucket `task-attachments` (Public)
2. ถ้าไม่มี ให้รันส่วน "STORAGE BUCKET" ใน schema.sql อีกครั้ง

### ปัญหา 4: สมัครแล้วต้องยืนยันอีเมล แต่อยากเทสเร็ว ๆ
**แก้:** Supabase Dashboard → **Authentication → Providers → Email** → ปิด "Confirm email"

### ปัญหา 5: RLS error "new row violates row-level security policy"
**สาเหตุ:** policy ยังไม่สร้าง หรือผู้ใช้ไม่ได้ login
**แก้:** ตรวจให้ schema.sql รันครบ + login ก่อนใช้งาน

---

## 📂 โครงสร้างโปรเจกต์

```
work-tracker/
├── supabase/
│   └── schema.sql          ← SQL ทั้งหมด (รันใน SQL Editor)
├── src/
│   ├── components/         ← UI components ใช้ซ้ำ
│   ├── contexts/           ← Auth + Theme context
│   ├── hooks/              ← useTasks
│   ├── lib/supabase.js     ← Supabase client + constants
│   ├── pages/              ← หน้าหลัก
│   ├── App.jsx             ← Router
│   └── main.jsx
├── .env.example
├── package.json
└── vite.config.js
```

---

## 🗄️ โครงสร้าง Database

```
profiles            ข้อมูล user เพิ่มเติม
└── tasks           งานหลัก (routine / project)
    ├── project_versions    เวอร์ชันของ project (v1, v2...)
    │   └── progress_logs   log ของ version
    ├── progress_logs       log โดยตรงของ task
    └── task_attachments    รูป/ไฟล์แนบ

work_schedule       เวลาทำงานต่อวัน
holidays            วันหยุดที่กำหนดเอง
```

---

## 💡 Feature ที่อยากให้เพิ่มในอนาคต (ถ้าสนใจ)

- 📊 Charts สรุปเวลาทำงานต่อหมวด
- ⏱️ Time tracking - จับเวลาขณะทำงาน
- 🔔 Notifications - แจ้งเตือนงานใกล้กำหนด
- 👥 Team mode - แชร์งานกับเพื่อนร่วมทีม
- 📤 Export เป็น CSV / PDF report
- 🤖 AI summary - ให้ AI สรุปความคืบหน้ารายสัปดาห์

ลองใช้ดูแล้ว feedback กลับมาได้เลย จะปรับให้เพิ่มครับ 🎉
"# Task-Work" 
