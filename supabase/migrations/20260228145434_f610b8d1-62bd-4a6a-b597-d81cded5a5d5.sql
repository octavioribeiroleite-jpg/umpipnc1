
-- Tabela de turmas da EBD
CREATE TABLE public.ebd_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de alunos por turma
CREATE TABLE public.ebd_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.ebd_classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de presença
CREATE TABLE public.ebd_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.ebd_students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.ebd_classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  present BOOLEAN NOT NULL DEFAULT false,
  marked_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Índices
CREATE INDEX idx_ebd_students_class ON public.ebd_students(class_id);
CREATE INDEX idx_ebd_attendance_date ON public.ebd_attendance(date);
CREATE INDEX idx_ebd_attendance_class_date ON public.ebd_attendance(class_id, date);

-- RLS: como o acesso é por senha fixa, liberamos anon para SELECT/INSERT/UPDATE
ALTER TABLE public.ebd_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebd_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebd_attendance ENABLE ROW LEVEL SECURITY;

-- ebd_classes: leitura pública, gestão por autenticados
CREATE POLICY "Anyone can view classes" ON public.ebd_classes FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage classes" ON public.ebd_classes FOR ALL USING (has_management_role(auth.uid()));

-- ebd_students: leitura pública, gestão por autenticados
CREATE POLICY "Anyone can view students" ON public.ebd_students FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage students" ON public.ebd_students FOR ALL USING (has_management_role(auth.uid()));

-- ebd_attendance: leitura e escrita pública (protegido por senha no frontend)
CREATE POLICY "Anyone can view attendance" ON public.ebd_attendance FOR SELECT USING (true);
CREATE POLICY "Anon can insert attendance" ON public.ebd_attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon can update attendance" ON public.ebd_attendance FOR UPDATE USING (true);
CREATE POLICY "Authenticated can manage attendance" ON public.ebd_attendance FOR ALL USING (has_management_role(auth.uid()));

-- Inserir senha padrão na tabela settings
INSERT INTO public.settings (key, value) VALUES ('secretaria_password', '1234')
ON CONFLICT DO NOTHING;

-- Permitir anon ler a senha da secretaria
-- (já existe policy "Anon can view pix settings" que filtra por key, precisamos adicionar secretaria_password)
DROP POLICY IF EXISTS "Anon can view pix settings" ON public.settings;
CREATE POLICY "Anon can view public settings" ON public.settings FOR SELECT
USING (key = ANY (ARRAY['pix_key', 'pix_key_type', 'pix_beneficiary', 'pix_instructions', 'secretaria_password']));
