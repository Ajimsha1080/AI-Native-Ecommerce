import readline from 'readline';
import bcrypt from 'bcryptjs';
import { db } from '../src/lib/db';

function askQuestion(query: string, hideInput: boolean = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hideInput && process.stdin.isTTY) {
      process.stdout.write(query);
      let input = '';
      const onData = (char: Buffer) => {
        const s = char.toString('utf-8');
        if (s === '\n' || s === '\r' || s === '\u0004') {
          process.stdin.removeListener('data', onData);
          process.stdin.setRawMode?.(false);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (s === '\u0003') {
          // Ctrl+C
          process.exit(1);
        } else if (s === '\b' || s === '\x7f') {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += s;
          process.stdout.write('*');
        }
      };
      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.on('data', onData);
    } else {
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

function validatePasswordPolicy(password: string): { valid: boolean; reason?: string } {
  if (password.length < 12) {
    return { valid: false, reason: 'Password must be at least 12 characters long.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one digit (0-9).' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one special character (!@#$%^&*...).' };
  }

  const commonWeak = [
    'password123', 'admin123456', 'administrator', 'qwerty123456', 'welcome12345',
    'shopmate1234', 'password123456', 'supersecret123', 'letmein12345'
  ];
  if (commonWeak.some(w => password.toLowerCase().includes(w))) {
    return { valid: false, reason: 'Password contains common dictionary sequences or predictable terms.' };
  }

  return { valid: true };
}

async function bootstrap() {
  console.log('================================================================');
  console.log('🔐 SHOPMATE ENTERPRISE ADMIN BOOTSTRAP CLI');
  console.log('================================================================\n');

  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;

  if (!email) {
    email = await askQuestion('Enter Admin Email: ');
  }
  email = email.trim().toLowerCase();

  if (!email || !email.includes('@') || !email.includes('.')) {
    console.error('❌ Error: A valid email address is required.');
    process.exit(1);
  }

  if (!password) {
    password = await askQuestion('Enter Admin Password (min 12 chars, upper, lower, digit, symbol): ', true);
  }

  const policyCheck = validatePasswordPolicy(password);
  if (!policyCheck.valid) {
    console.error(`❌ Weak Password Rejected: ${policyCheck.reason}`);
    process.exit(1);
  }

  console.log('\n[1/3] Hashing credentials with bcrypt (cost factor 12)...');
  const passwordHash = await bcrypt.hash(password, 12);

  console.log('[2/3] Checking database connectivity and existing administrator state...');
  const existingUser = await db.users.findByEmail(email);

  const userId = existingUser ? existingUser.id : `usr_${Date.now()}`;

  if (existingUser) {
    console.log(`ℹ️ Updating existing admin user (${email})...`);
    await db.users.update(userId, {
      password_hash: passwordHash,
      role: 'ADMIN',
    });
  } else {
    console.log(`ℹ️ Creating new superadmin user (${email})...`);
    await db.users.create({
      id: userId,
      email,
      name: 'System Administrator',
      role: 'ADMIN',
      password_hash: passwordHash,
      mfa_enabled: false,
    });
  }

  console.log('[3/3] Ensuring primary enterprise workspace and ownership assignment...');
  const workspaceId = 'ws_acme_corp';
  const existingWs = await db.workspaces.findById(workspaceId);

  if (!existingWs) {
    await db.workspaces.create({
      id: workspaceId,
      name: 'Primary Enterprise Workspace',
      slug: 'primary-enterprise',
      tier: 'ENTERPRISE',
    });
  }

  const existingMembers = await db.workspace_members.findByUser(userId);
  const isMember = existingMembers.some(m => m.workspace_id === workspaceId);

  if (!isMember) {
    await db.workspace_members.create(workspaceId, {
      id: `wsm_${Date.now()}`,
      workspace_id: workspaceId,
      user_id: userId,
      role: 'OWNER',
    });
  }

  console.log('\n================================================================');
  console.log('✅ BOOTSTRAP COMPLETE: SYSTEM READY FOR AUTHENTICATION');
  console.log('================================================================');
  console.log(`Admin User:      ${email}`);
  console.log(`Workspace ID:    ${workspaceId}`);
  console.log(`Login Endpoint:  POST /api/auth/login or Web UI at /login`);
  console.log('================================================================\n');

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed with exception:', err);
  process.exit(1);
});
