/**
 * Validates that all required environment variables are set
 * Call this at startup to fail fast if configuration is missing
 */
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_EMAIL',
    'NEXT_PUBLIC_ADMIN_PASSWORD',
  ];

  const missing: string[] = [];
  const invalid: string[] = [];

  for (const key of required) {
    const value = process.env[key];

    if (!value) {
      missing.push(key);
    } else if (value.includes('your_') || value.includes('example')) {
      invalid.push(key);
    }
  }

  if (missing.length > 0 || invalid.length > 0) {
    const errors: string[] = [];

    if (missing.length > 0) {
      errors.push(`Missing required environment variables:\n  - ${missing.join('\n  - ')}`);
    }

    if (invalid.length > 0) {
      errors.push(`Environment variables contain placeholder values:\n  - ${invalid.join('\n  - ')}`);
    }

    throw new Error(
      `❌ Environment validation failed:\n\n${errors.join('\n\n')}\n\n` +
      `Please check your .env file and compare with .env.example\n`
    );
  }

  // Validate Supabase URL format
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must start with https://');
  }

  // Validate VAPID email format
  if (!process.env.VAPID_EMAIL?.startsWith('mailto:')) {
    throw new Error('VAPID_EMAIL must start with mailto:');
  }

  console.log('✅ Environment variables validated successfully');
}

/**
 * Client-side environment validation (only checks NEXT_PUBLIC_ vars)
 */
export function validateClientEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `❌ Missing required environment variables:\n  - ${missing.join('\n  - ')}`
    );
    return false;
  }

  return true;
}
