-- 1. Enable pgcrypto extension for hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Add password_hash column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. Migrate existing passwords to hashes (Run once. Assumes 'password' column exists and contains plaintext)
UPDATE users SET password_hash = crypt(password, gen_salt('bf')) WHERE password IS NOT NULL AND password_hash IS NULL;

-- 4. Drop the plaintext password column to secure the table
-- ONLY UNCOMMENT AND RUN THIS ONCE MIGRATION IS CONFIRMED SUCCESSFUL
-- ALTER TABLE users DROP COLUMN password;

-- 5. Create secure login verification RPC
CREATE OR REPLACE FUNCTION verify_login(p_email TEXT, p_password TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Find the active user by email
  SELECT id, full_name, role, email, password_hash 
  INTO v_user
  FROM users
  WHERE email = p_email AND is_active = true
  LIMIT 1;

  -- If user exists and password matches the hash
  IF v_user.id IS NOT NULL AND v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
    -- Return safe user data without the hash
    RETURN jsonb_build_object(
      'id', v_user.id,
      'full_name', v_user.full_name,
      'role', v_user.role,
      'email', v_user.email
    );
  ELSE
    -- Generic failure (prevents user enumeration via timing/error messages)
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Create secure password reset RPC
CREATE OR REPLACE FUNCTION reset_password(p_email TEXT, p_new_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verify user exists
  SELECT id INTO v_user_id FROM users WHERE email = p_email LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Update password immediately with a fresh bcrypt salt
    UPDATE users 
    SET password_hash = crypt(p_new_password, gen_salt('bf'))
    WHERE id = v_user_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
