import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient('https://igpybrzgdyfhzlvxivfu.supabase.co', 'sb_publishable_Fi2ayoW4V91biRL4cXUDtA_St6_yTcc');

async function hashPasswords() {
  console.log('Fetching users to hash passwords...');
  const { data: users, error } = await supabase.from('users').select('id, password');
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  for (const user of users) {
    // Only hash if it doesn't look like a bcrypt hash already
    if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(user.password, salt);
      console.log(`Hashing password for user ID: ${user.id}`);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', user.id);
        
      if (updateError) {
        console.error(`Error updating password for ${user.id}:`, updateError);
      }
    } else {
      console.log(`User ID: ${user.id} password is already hashed.`);
    }
  }
  console.log('Password hashing complete!');
}

hashPasswords();
