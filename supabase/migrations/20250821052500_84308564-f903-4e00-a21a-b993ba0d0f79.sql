-- 1. Enable RLS on subcategories table
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- 2. Create policies for subcategories (similar to categories)
CREATE POLICY "Anyone can view subcategories" 
ON public.subcategories 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage subcategories" 
ON public.subcategories 
FOR ALL 
USING (EXISTS ( 
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'::user_role
));

-- 3. Fix get_current_user_role function with secure search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

-- 4. Fix handle_new_user function with secure search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$function$;