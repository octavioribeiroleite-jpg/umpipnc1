
-- 1. Create helper function to get user's society_id
CREATE OR REPLACE FUNCTION public.get_user_society_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT society_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- =============================================
-- 2. CHARGES - drop old policies, create new
-- =============================================
DROP POLICY IF EXISTS "Charges viewable by authenticated" ON public.charges;
DROP POLICY IF EXISTS "Management can manage charges" ON public.charges;

CREATE POLICY "Society isolated SELECT charges" ON public.charges FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR society_id = get_user_society_id(auth.uid())
);

CREATE POLICY "Society isolated management charges" ON public.charges FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
);

-- =============================================
-- 3. TRANSACTIONS
-- =============================================
DROP POLICY IF EXISTS "Transactions viewable by authenticated" ON public.transactions;
DROP POLICY IF EXISTS "Management can manage transactions" ON public.transactions;

CREATE POLICY "Society isolated SELECT transactions" ON public.transactions FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR society_id = get_user_society_id(auth.uid())
);

CREATE POLICY "Society isolated management transactions" ON public.transactions FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
);

-- =============================================
-- 4. MEMBERS
-- =============================================
DROP POLICY IF EXISTS "Members viewable by authenticated" ON public.members;
DROP POLICY IF EXISTS "Management can manage members" ON public.members;

CREATE POLICY "Society isolated SELECT members" ON public.members FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR society_id = get_user_society_id(auth.uid())
);

CREATE POLICY "Society isolated management members" ON public.members FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
);

-- =============================================
-- 5. MEETINGS
-- =============================================
DROP POLICY IF EXISTS "Meetings viewable by authenticated" ON public.meetings;
DROP POLICY IF EXISTS "Management can manage meetings" ON public.meetings;

CREATE POLICY "Society isolated SELECT meetings" ON public.meetings FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR society_id = get_user_society_id(auth.uid())
);

CREATE POLICY "Society isolated management meetings" ON public.meetings FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
);

-- =============================================
-- 6. TASKS - keep assignee policies, update society ones
-- =============================================
DROP POLICY IF EXISTS "Tasks viewable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Management can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Management can delete all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Management can update all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Assignees can update their tasks" ON public.tasks;

CREATE POLICY "Society isolated SELECT tasks" ON public.tasks FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR society_id = get_user_society_id(auth.uid())
);

CREATE POLICY "Management can create tasks" ON public.tasks FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
);

CREATE POLICY "Management can update tasks" ON public.tasks FOR UPDATE
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
);

CREATE POLICY "Assignees can update their tasks" ON public.tasks FOR UPDATE
USING (auth.uid() = assignee_id)
WITH CHECK (auth.uid() = assignee_id);

CREATE POLICY "Management can delete tasks" ON public.tasks FOR DELETE
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
);

-- =============================================
-- 7. FILES
-- =============================================
DROP POLICY IF EXISTS "Files viewable by authenticated" ON public.files;
DROP POLICY IF EXISTS "Management can manage files" ON public.files;

CREATE POLICY "Society isolated SELECT files" ON public.files FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR society_id = get_user_society_id(auth.uid())
);

CREATE POLICY "Society isolated management files" ON public.files FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
);

-- =============================================
-- 8. FINANCIAL_SETTINGS
-- =============================================
DROP POLICY IF EXISTS "Financial settings viewable by authenticated" ON public.financial_settings;
DROP POLICY IF EXISTS "Management can manage financial settings" ON public.financial_settings;

CREATE POLICY "Society isolated SELECT financial_settings" ON public.financial_settings FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR society_id = get_user_society_id(auth.uid())
);

CREATE POLICY "Society isolated management financial_settings" ON public.financial_settings FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
);

-- =============================================
-- 9. FINANCIAL_CATEGORIES
-- =============================================
DROP POLICY IF EXISTS "Categories viewable by authenticated" ON public.financial_categories;
DROP POLICY IF EXISTS "Management can manage categories" ON public.financial_categories;

CREATE POLICY "Society isolated SELECT financial_categories" ON public.financial_categories FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR society_id = get_user_society_id(auth.uid())
);

CREATE POLICY "Society isolated management financial_categories" ON public.financial_categories FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
);

-- =============================================
-- 10. MEMBERSHIP_PAYMENTS
-- =============================================
DROP POLICY IF EXISTS "Payments viewable by authenticated" ON public.membership_payments;
DROP POLICY IF EXISTS "Management can manage payments" ON public.membership_payments;

CREATE POLICY "Society isolated SELECT membership_payments" ON public.membership_payments FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR EXISTS (
    SELECT 1 FROM members m WHERE m.id = membership_payments.member_id
    AND m.society_id = get_user_society_id(auth.uid())
  )
);

CREATE POLICY "Society isolated management membership_payments" ON public.membership_payments FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND EXISTS (
    SELECT 1 FROM members m WHERE m.id = membership_payments.member_id
    AND m.society_id = get_user_society_id(auth.uid())
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND EXISTS (
    SELECT 1 FROM members m WHERE m.id = membership_payments.member_id
    AND m.society_id = get_user_society_id(auth.uid())
  ))
);

-- =============================================
-- 11. SHIRT_INVENTORY
-- =============================================
DROP POLICY IF EXISTS "Shirt inventory viewable by authenticated" ON public.shirt_inventory;
DROP POLICY IF EXISTS "Management can manage shirt inventory" ON public.shirt_inventory;

CREATE POLICY "Society isolated SELECT shirt_inventory" ON public.shirt_inventory FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR society_id = get_user_society_id(auth.uid())
);

CREATE POLICY "Society isolated management shirt_inventory" ON public.shirt_inventory FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
);

-- =============================================
-- 12. SHIRT_PURCHASES
-- =============================================
DROP POLICY IF EXISTS "Shirt purchases viewable by authenticated" ON public.shirt_purchases;
DROP POLICY IF EXISTS "Management can manage shirt purchases" ON public.shirt_purchases;

CREATE POLICY "Society isolated SELECT shirt_purchases" ON public.shirt_purchases FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR society_id = get_user_society_id(auth.uid())
);

CREATE POLICY "Society isolated management shirt_purchases" ON public.shirt_purchases FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
);

-- =============================================
-- 13. SHIRT_PURCHASE_ITEMS (via purchase_id -> shirt_purchases)
-- =============================================
DROP POLICY IF EXISTS "Shirt purchase items viewable by authenticated" ON public.shirt_purchase_items;
DROP POLICY IF EXISTS "Management can manage shirt purchase items" ON public.shirt_purchase_items;

CREATE POLICY "Society isolated SELECT shirt_purchase_items" ON public.shirt_purchase_items FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR EXISTS (
    SELECT 1 FROM shirt_purchases sp WHERE sp.id = shirt_purchase_items.purchase_id
    AND sp.society_id = get_user_society_id(auth.uid())
  )
);

CREATE POLICY "Society isolated management shirt_purchase_items" ON public.shirt_purchase_items FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND EXISTS (
    SELECT 1 FROM shirt_purchases sp WHERE sp.id = shirt_purchase_items.purchase_id
    AND sp.society_id = get_user_society_id(auth.uid())
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND EXISTS (
    SELECT 1 FROM shirt_purchases sp WHERE sp.id = shirt_purchase_items.purchase_id
    AND sp.society_id = get_user_society_id(auth.uid())
  ))
);

-- =============================================
-- 14. SHIRT_SALES
-- =============================================
DROP POLICY IF EXISTS "Shirt sales viewable by authenticated" ON public.shirt_sales;
DROP POLICY IF EXISTS "Management can manage shirt sales" ON public.shirt_sales;

CREATE POLICY "Society isolated SELECT shirt_sales" ON public.shirt_sales FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR society_id = get_user_society_id(auth.uid())
);

CREATE POLICY "Society isolated management shirt_sales" ON public.shirt_sales FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
);

-- =============================================
-- 15. MEMBER_PAYMENT_SUBMISSIONS
-- =============================================
DROP POLICY IF EXISTS "Users can view own submissions" ON public.member_payment_submissions;
DROP POLICY IF EXISTS "Users can insert own submissions" ON public.member_payment_submissions;
DROP POLICY IF EXISTS "Management can manage submissions" ON public.member_payment_submissions;

CREATE POLICY "Users can view own submissions" ON public.member_payment_submissions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions" ON public.member_payment_submissions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Society isolated SELECT member_payment_submissions" ON public.member_payment_submissions FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR society_id = get_user_society_id(auth.uid())
);

CREATE POLICY "Society isolated management member_payment_submissions" ON public.member_payment_submissions FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND society_id = get_user_society_id(auth.uid()))
);

-- =============================================
-- 16. AGENDA_ITEMS (via meeting_id)
-- =============================================
DROP POLICY IF EXISTS "Agenda items viewable by authenticated" ON public.agenda_items;
DROP POLICY IF EXISTS "Management can manage agenda items" ON public.agenda_items;

CREATE POLICY "Society isolated SELECT agenda_items" ON public.agenda_items FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = agenda_items.meeting_id
    AND m.society_id = get_user_society_id(auth.uid())
  )
);

CREATE POLICY "Society isolated management agenda_items" ON public.agenda_items FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = agenda_items.meeting_id
    AND m.society_id = get_user_society_id(auth.uid())
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = agenda_items.meeting_id
    AND m.society_id = get_user_society_id(auth.uid())
  ))
);

-- =============================================
-- 17. MEETING_PARTICIPANTS (via meeting_id)
-- =============================================
DROP POLICY IF EXISTS "Participants viewable by authenticated" ON public.meeting_participants;
DROP POLICY IF EXISTS "Management can manage participants" ON public.meeting_participants;

CREATE POLICY "Society isolated SELECT meeting_participants" ON public.meeting_participants FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = meeting_participants.meeting_id
    AND m.society_id = get_user_society_id(auth.uid())
  )
);

CREATE POLICY "Society isolated management meeting_participants" ON public.meeting_participants FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = meeting_participants.meeting_id
    AND m.society_id = get_user_society_id(auth.uid())
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = meeting_participants.meeting_id
    AND m.society_id = get_user_society_id(auth.uid())
  ))
);

-- =============================================
-- 18. CONTRIBUTIONS (via meeting_id) - keep user own policies
-- =============================================
DROP POLICY IF EXISTS "Users can view revealed contributions" ON public.contributions;
DROP POLICY IF EXISTS "Management can view all contributions" ON public.contributions;
DROP POLICY IF EXISTS "Users can manage own contributions" ON public.contributions;
DROP POLICY IF EXISTS "Users can view own contributions" ON public.contributions;

CREATE POLICY "Users can manage own contributions" ON public.contributions FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Society isolated SELECT contributions" ON public.contributions FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = contributions.meeting_id
    AND m.society_id = get_user_society_id(auth.uid())
  )
);

CREATE POLICY "Users can view revealed contributions" ON public.contributions FOR SELECT
USING (status = 'revealed');

-- =============================================
-- 19. AI_SUGGESTIONS (via meeting_id)
-- =============================================
DROP POLICY IF EXISTS "Suggestions viewable by authenticated" ON public.ai_suggestions;
DROP POLICY IF EXISTS "Management can manage suggestions" ON public.ai_suggestions;

CREATE POLICY "Society isolated SELECT ai_suggestions" ON public.ai_suggestions FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_pastor_role(auth.uid())
  OR EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = ai_suggestions.meeting_id
    AND m.society_id = get_user_society_id(auth.uid())
  )
);

CREATE POLICY "Society isolated management ai_suggestions" ON public.ai_suggestions FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = ai_suggestions.meeting_id
    AND m.society_id = get_user_society_id(auth.uid())
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'diretoria') AND EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = ai_suggestions.meeting_id
    AND m.society_id = get_user_society_id(auth.uid())
  ))
);
