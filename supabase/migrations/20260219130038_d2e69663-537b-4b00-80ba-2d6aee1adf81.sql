
-- Dropar as políticas RESTRICTIVAS de UPDATE
DROP POLICY IF EXISTS "Assignees can update their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Management can update all tasks" ON public.tasks;

-- Recriar como PERMISSIVE para que qualquer uma seja suficiente
CREATE POLICY "Management can update all tasks" 
ON public.tasks 
FOR UPDATE 
USING (has_management_role(auth.uid()))
WITH CHECK (has_management_role(auth.uid()));

CREATE POLICY "Assignees can update their tasks" 
ON public.tasks 
FOR UPDATE 
USING (auth.uid() = assignee_id)
WITH CHECK (auth.uid() = assignee_id);

-- Também corrigir as outras policies restritivas para PERMISSIVE
DROP POLICY IF EXISTS "Management can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Tasks viewable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Management can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Management can delete all tasks" ON public.tasks;

CREATE POLICY "Tasks viewable by authenticated" 
ON public.tasks 
FOR SELECT 
USING (true);

CREATE POLICY "Management can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (has_management_role(auth.uid()));

CREATE POLICY "Management can delete all tasks" 
ON public.tasks 
FOR DELETE 
USING (has_management_role(auth.uid()));

-- Forçar reload
NOTIFY pgrst, 'reload schema';
