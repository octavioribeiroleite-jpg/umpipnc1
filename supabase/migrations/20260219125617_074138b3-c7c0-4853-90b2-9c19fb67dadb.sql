
-- Função para atualizar status de tarefa (management OU assignee)
CREATE OR REPLACE FUNCTION public.update_task_status(task_id uuid, new_status task_status)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  current_assignee uuid;
BEGIN
  SELECT assignee_id INTO current_assignee FROM tasks WHERE id = task_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tarefa não encontrada';
  END IF;
  
  IF NOT (has_management_role(auth.uid()) OR auth.uid() = current_assignee) THEN
    RAISE EXCEPTION 'Sem permissão para atualizar esta tarefa';
  END IF;
  
  UPDATE tasks SET status = new_status, updated_at = now() WHERE id = task_id
  RETURNING row_to_json(tasks.*) INTO result;
  
  RETURN result;
END;
$$;

-- Função para atualizar tarefa completa (management OU assignee)
CREATE OR REPLACE FUNCTION public.update_task(
  task_id uuid,
  new_title text DEFAULT NULL,
  new_description text DEFAULT NULL,
  new_status task_status DEFAULT NULL,
  new_priority task_priority DEFAULT NULL,
  new_due_date date DEFAULT NULL,
  new_assignee_id uuid DEFAULT NULL,
  new_meeting_id uuid DEFAULT NULL,
  clear_due_date boolean DEFAULT false,
  clear_assignee boolean DEFAULT false,
  clear_meeting boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  current_assignee uuid;
BEGIN
  SELECT assignee_id INTO current_assignee FROM tasks WHERE id = task_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tarefa não encontrada';
  END IF;
  
  IF NOT (has_management_role(auth.uid()) OR auth.uid() = current_assignee) THEN
    RAISE EXCEPTION 'Sem permissão para atualizar esta tarefa';
  END IF;
  
  UPDATE tasks SET
    title = COALESCE(new_title, title),
    description = CASE WHEN new_description IS NOT NULL THEN new_description ELSE description END,
    status = COALESCE(new_status, status),
    priority = COALESCE(new_priority, priority),
    due_date = CASE WHEN clear_due_date THEN NULL WHEN new_due_date IS NOT NULL THEN new_due_date ELSE due_date END,
    assignee_id = CASE WHEN clear_assignee THEN NULL WHEN new_assignee_id IS NOT NULL THEN new_assignee_id ELSE assignee_id END,
    meeting_id = CASE WHEN clear_meeting THEN NULL WHEN new_meeting_id IS NOT NULL THEN new_meeting_id ELSE meeting_id END,
    updated_at = now()
  WHERE id = task_id
  RETURNING row_to_json(tasks.*) INTO result;
  
  RETURN result;
END;
$$;

-- Função para deletar tarefa (apenas management)
CREATE OR REPLACE FUNCTION public.delete_task(task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_management_role(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas diretoria pode excluir tarefas';
  END IF;
  
  DELETE FROM tasks WHERE id = task_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tarefa não encontrada';
  END IF;
END;
$$;

-- Forçar reload do cache do PostgREST
NOTIFY pgrst, 'reload schema';
