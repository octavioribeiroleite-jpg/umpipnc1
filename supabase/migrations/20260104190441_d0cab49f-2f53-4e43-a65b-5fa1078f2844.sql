-- ============================================
-- IPNC - Painel da Diretoria de Jovens
-- Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USER ROLES (Security First)
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'diretoria', 'visualizador');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'visualizador',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Check if user has any management role (admin or diretoria)
CREATE OR REPLACE FUNCTION public.has_management_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'diretoria')
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 2. PROFILES
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 3. FINANCIAL CATEGORIES
-- ============================================
CREATE TABLE public.financial_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
    color TEXT DEFAULT '#10b981',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories viewable by authenticated"
ON public.financial_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Management can manage categories"
ON public.financial_categories FOR ALL
TO authenticated
USING (public.has_management_role(auth.uid()));

-- Default categories
INSERT INTO public.financial_categories (name, type, color) VALUES
('Dízimos', 'entrada', '#10b981'),
('Ofertas', 'entrada', '#059669'),
('Mensalidades', 'entrada', '#047857'),
('Doações', 'entrada', '#065f46'),
('Eventos', 'entrada', '#0d9488'),
('Alimentação', 'saida', '#ef4444'),
('Transporte', 'saida', '#f97316'),
('Material', 'saida', '#eab308'),
('Aluguel', 'saida', '#8b5cf6'),
('Outros', 'saida', '#6b7280');

-- ============================================
-- 4. TRANSACTIONS (Caixa)
-- ============================================
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.financial_categories(id),
    type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transactions viewable by authenticated"
ON public.transactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Management can manage transactions"
ON public.transactions FOR ALL
TO authenticated
USING (public.has_management_role(auth.uid()));

-- ============================================
-- 5. MEMBERS (for mensalidades)
-- ============================================
CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members viewable by authenticated"
ON public.members FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Management can manage members"
ON public.members FOR ALL
TO authenticated
USING (public.has_management_role(auth.uid()));

-- ============================================
-- 6. MEMBERSHIP PAYMENTS (Mensalidades)
-- ============================================
CREATE TABLE public.membership_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    competence TEXT NOT NULL, -- Format: YYYY-MM
    amount DECIMAL(12,2) NOT NULL,
    paid_at DATE,
    receipt_url TEXT,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(member_id, competence)
);

ALTER TABLE public.membership_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payments viewable by authenticated"
ON public.membership_payments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Management can manage payments"
ON public.membership_payments FOR ALL
TO authenticated
USING (public.has_management_role(auth.uid()));

-- ============================================
-- 7. EVENTS (Calendário)
-- ============================================
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    all_day BOOLEAN DEFAULT false,
    location TEXT,
    color TEXT DEFAULT '#10b981',
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events viewable by authenticated"
ON public.events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Management can manage events"
ON public.events FOR ALL
TO authenticated
USING (public.has_management_role(auth.uid()));

-- ============================================
-- 8. TASKS
-- ============================================
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');

CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'todo',
    priority task_priority NOT NULL DEFAULT 'medium',
    due_date DATE,
    assignee_id UUID REFERENCES auth.users(id),
    meeting_id UUID, -- Will be linked to meetings table
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks viewable by authenticated"
ON public.tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Management can manage all tasks"
ON public.tasks FOR ALL
TO authenticated
USING (public.has_management_role(auth.uid()));

CREATE POLICY "Assignees can update their tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (auth.uid() = assignee_id);

-- ============================================
-- 9. MEETINGS
-- ============================================
CREATE TYPE public.meeting_status AS ENUM ('aberta', 'fechada');

CREATE TABLE public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    moderator_id UUID REFERENCES auth.users(id) NOT NULL,
    status meeting_status NOT NULL DEFAULT 'aberta',
    contributions_revealed BOOLEAN NOT NULL DEFAULT false,
    ai_organized BOOLEAN NOT NULL DEFAULT false,
    final_minutes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Meetings viewable by authenticated"
ON public.meetings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Management can manage meetings"
ON public.meetings FOR ALL
TO authenticated
USING (public.has_management_role(auth.uid()));

-- Add foreign key to tasks for meeting_id
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_meeting_id_fkey 
FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE SET NULL;

-- ============================================
-- 10. MEETING PARTICIPANTS
-- ============================================
CREATE TABLE public.meeting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(meeting_id, user_id)
);

ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants viewable by authenticated"
ON public.meeting_participants FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Management can manage participants"
ON public.meeting_participants FOR ALL
TO authenticated
USING (public.has_management_role(auth.uid()));

-- ============================================
-- 11. AGENDA ITEMS
-- ============================================
CREATE TABLE public.agenda_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agenda items viewable by authenticated"
ON public.agenda_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Management can manage agenda items"
ON public.agenda_items FOR ALL
TO authenticated
USING (public.has_management_role(auth.uid()));

-- ============================================
-- 12. CONTRIBUTIONS
-- ============================================
CREATE TYPE public.contribution_status AS ENUM ('draft', 'final', 'revealed');

CREATE TABLE public.contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    agenda_item_id UUID REFERENCES public.agenda_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    status contribution_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

-- Users can see their own contributions always
CREATE POLICY "Users can view own contributions"
ON public.contributions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can see revealed contributions
CREATE POLICY "Users can view revealed contributions"
ON public.contributions FOR SELECT
TO authenticated
USING (status = 'revealed');

-- Users can manage their own contributions
CREATE POLICY "Users can manage own contributions"
ON public.contributions FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Management can view all contributions
CREATE POLICY "Management can view all contributions"
ON public.contributions FOR SELECT
TO authenticated
USING (public.has_management_role(auth.uid()));

-- ============================================
-- 13. AI SUGGESTIONS (from AI organization)
-- ============================================
CREATE TYPE public.suggestion_category AS ENUM (
    'pauta', 'pontos_discutidos', 'decisoes', 'tarefas', 
    'pendencias', 'divergencias', 'observacoes', 'eventos_sugeridos'
);

CREATE TYPE public.suggestion_status AS ENUM ('pending', 'accepted', 'rejected', 'edited');

CREATE TABLE public.ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    category suggestion_category NOT NULL,
    original_content TEXT NOT NULL,
    edited_content TEXT,
    status suggestion_status NOT NULL DEFAULT 'pending',
    -- For event suggestions
    suggested_event_title TEXT,
    suggested_event_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suggestions viewable by authenticated"
ON public.ai_suggestions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Management can manage suggestions"
ON public.ai_suggestions FOR ALL
TO authenticated
USING (public.has_management_role(auth.uid()));

-- ============================================
-- 14. FILES/ATTACHMENTS
-- ============================================
CREATE TABLE public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT,
    size INTEGER,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Files viewable by authenticated"
ON public.files FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Management can manage files"
ON public.files FOR ALL
TO authenticated
USING (public.has_management_role(auth.uid()));

-- ============================================
-- 15. SETTINGS
-- ============================================
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings viewable by authenticated"
ON public.settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage settings"
ON public.settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Default settings
INSERT INTO public.settings (key, value) VALUES
('default_membership_amount', '50.00'),
('require_receipt_for_expense', 'true');

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON public.meetings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contributions_updated_at
    BEFORE UPDATE ON public.contributions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FUNCTION TO CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NEW.email
    );
    
    -- Default role: visualizador
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'visualizador');
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();