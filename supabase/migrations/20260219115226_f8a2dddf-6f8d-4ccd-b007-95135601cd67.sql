-- Drop the ALL policy and replace with specific policies for clarity
DROP POLICY IF EXISTS "Management can manage all tasks" ON public.tasks;

-- Management SELECT
CREATE POLICY "Management can view all tasks" 
ON public.tasks FOR SELECT 
USING (has_management_role(auth.uid()));

-- Management INSERT
CREATE POLICY "Management can create tasks" 
ON public.tasks FOR INSERT 
WITH CHECK (has_management_role(auth.uid()));

-- Management UPDATE
CREATE POLICY "Management can update all tasks" 
ON public.tasks FOR UPDATE 
USING (has_management_role(auth.uid()))
WITH CHECK (has_management_role(auth.uid()));

-- Management DELETE
CREATE POLICY "Management can delete all tasks" 
ON public.tasks FOR DELETE 
USING (has_management_role(auth.uid()));