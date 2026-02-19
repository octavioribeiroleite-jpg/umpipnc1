import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, task_id, updates } = await req.json();

    // Use direct SQL via database URL
    const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;
    const { Pool } = await import("https://deno.land/x/postgres@v0.19.3/mod.ts");
    const pool = new Pool(dbUrl, 3, true);
    const connection = await pool.connect();

    try {
      // Check permissions
      const rolesResult = await connection.queryObject<{ role: string }>(
        `SELECT role FROM user_roles WHERE user_id = $1`,
        [user.id]
      );
      const isManagement = rolesResult.rows.some(r => r.role === "admin" || r.role === "diretoria");

      if (action === "update_status") {
        // Check if user can update
        const taskResult = await connection.queryObject<{ assignee_id: string | null }>(
          `SELECT assignee_id FROM tasks WHERE id = $1`,
          [task_id]
        );

        if (taskResult.rows.length === 0) {
          return new Response(JSON.stringify({ error: "Tarefa não encontrada" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const task = taskResult.rows[0];
        if (!isManagement && task.assignee_id !== user.id) {
          return new Response(JSON.stringify({ error: "Sem permissão" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const result = await connection.queryObject(
          `UPDATE tasks SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
          [updates.status, task_id]
        );

        return new Response(JSON.stringify(result.rows[0] || {}), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "update") {
        const taskResult = await connection.queryObject<{ assignee_id: string | null }>(
          `SELECT assignee_id FROM tasks WHERE id = $1`,
          [task_id]
        );

        if (taskResult.rows.length === 0) {
          return new Response(JSON.stringify({ error: "Tarefa não encontrada" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const task = taskResult.rows[0];
        if (!isManagement && task.assignee_id !== user.id) {
          return new Response(JSON.stringify({ error: "Sem permissão" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Build dynamic update
        const setClauses: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (updates.title !== undefined) {
          setClauses.push(`title = $${paramIndex++}`);
          values.push(updates.title);
        }
        if (updates.description !== undefined) {
          setClauses.push(`description = $${paramIndex++}`);
          values.push(updates.description);
        }
        if (updates.status !== undefined) {
          setClauses.push(`status = $${paramIndex++}`);
          values.push(updates.status);
        }
        if (updates.priority !== undefined) {
          setClauses.push(`priority = $${paramIndex++}`);
          values.push(updates.priority);
        }
        if (updates.due_date !== undefined) {
          setClauses.push(`due_date = $${paramIndex++}`);
          values.push(updates.due_date);
        }
        if (updates.assignee_id !== undefined) {
          setClauses.push(`assignee_id = $${paramIndex++}`);
          values.push(updates.assignee_id);
        }
        if (updates.meeting_id !== undefined) {
          setClauses.push(`meeting_id = $${paramIndex++}`);
          values.push(updates.meeting_id);
        }

        setClauses.push(`updated_at = now()`);
        values.push(task_id);

        const sql = `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await connection.queryObject(sql, values);

        return new Response(JSON.stringify(result.rows[0] || {}), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "delete") {
        if (!isManagement) {
          return new Response(JSON.stringify({ error: "Apenas diretoria pode excluir" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await connection.queryObject(`DELETE FROM tasks WHERE id = $1`, [task_id]);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Ação inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      connection.release();
      await pool.end();
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
