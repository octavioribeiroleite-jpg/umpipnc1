
-- ============================================
-- FIX: Recriar políticas de tasks como PERMISSIVE
-- ============================================

-- Drop all existing RESTRICTIVE policies on tasks
DROP POLICY IF EXISTS "Tasks viewable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Management can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Management can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Management can update all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Assignees can update their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Management can delete all tasks" ON public.tasks;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Tasks viewable by authenticated" ON public.tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Management can view all tasks" ON public.tasks
  FOR SELECT TO authenticated USING (has_management_role(auth.uid()));

CREATE POLICY "Management can create tasks" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (has_management_role(auth.uid()));

CREATE POLICY "Management can update all tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (has_management_role(auth.uid()))
  WITH CHECK (has_management_role(auth.uid()));

CREATE POLICY "Assignees can update their tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (auth.uid() = assignee_id)
  WITH CHECK (auth.uid() = assignee_id);

CREATE POLICY "Management can delete all tasks" ON public.tasks
  FOR DELETE TO authenticated USING (has_management_role(auth.uid()));

-- ============================================
-- FIX: Recriar políticas de events como PERMISSIVE
-- ============================================

DROP POLICY IF EXISTS "Events viewable by authenticated" ON public.events;
DROP POLICY IF EXISTS "Management can manage events" ON public.events;

CREATE POLICY "Events viewable by authenticated" ON public.events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Management can manage events" ON public.events
  FOR ALL TO authenticated USING (has_management_role(auth.uid()));
