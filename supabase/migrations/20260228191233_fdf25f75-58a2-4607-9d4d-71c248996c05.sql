
-- Allow anon users to INSERT students (for secretary password-based access)
CREATE POLICY "Anon can insert students"
ON public.ebd_students
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon users to UPDATE students (for secretary password-based access)
CREATE POLICY "Anon can update students"
ON public.ebd_students
FOR UPDATE
TO anon
USING (true);

-- Allow anon users to INSERT classes (for secretary password-based access)
CREATE POLICY "Anon can insert classes"
ON public.ebd_classes
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon users to UPDATE classes (for secretary password-based access)
CREATE POLICY "Anon can update classes"
ON public.ebd_classes
FOR UPDATE
TO anon
USING (true);
