-- Drop and recreate the assignee update policy with explicit WITH CHECK
DROP POLICY IF EXISTS "Assignees can update their tasks" ON public.tasks;

CREATE POLICY "Assignees can update their tasks"
ON public.tasks
FOR UPDATE
USING (auth.uid() = assignee_id)
WITH CHECK (auth.uid() = assignee_id);