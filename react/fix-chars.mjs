import { readFileSync, writeFileSync } from 'fs';

const files = [
  'src/pages/auth/ForgotPasswordPage.jsx',
  'src/pages/auth/LoginPage.jsx',
  'src/pages/auth/RegisterPage.jsx',
  'src/pages/auth/ResetPasswordPage.jsx',
  'src/pages/landing/LandingPage.jsx',
  'src/pages/NotFoundPage.jsx',
  'src/components/layout/Topbar.jsx',
];

for (const f of files) {
  let content = readFileSync(f, 'utf8');
  const original = content;

  // Remove backslash before any non-ASCII character (accented letters, bullets, dashes, etc.)
  // Pattern: literal backslash + any character with code > 127
  content = content.replace(/\\(?=[^\x00-\x7F])/g, '');

  if (content !== original) {
    writeFileSync(f, content, 'utf8');
    console.log(`Fixed: ${f}`);
  } else {
    console.log(`Clean: ${f}`);
  }
}
