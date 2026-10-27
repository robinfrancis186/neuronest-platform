import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const server = await createServer({ define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:8123') }, server: { port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
try {
  const page = await browser.newPage();
  page.on('pageerror', error => console.error(error.message));
  await page.route('**/src/main.tsx', r => r.fulfill({ contentType: 'application/javascript', body: `import React from '/node_modules/.vite/deps/react.js'; import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js'; import Login from '/src/Login.tsx'; ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Login,{onLogin:()=>document.body.dataset.completed='yes'}));` }));
  await page.route('**/src/auth.ts', r => r.fulfill({ contentType: 'application/javascript', body: `
    export const authConfigurationError='',firebaseAuth=null;
    export const bearerToken=()=> 'fixture', tokenFor=async()=> 'fixture', signOut=async()=>{}, restoreSession=async()=>null;
    const identity={uid:'fixture',email:'parent@example.invalid',displayName:'Parent Name',emailVerified:true};
    export const signInWithEmail=async(email)=>{window.emailUsed=email;return {...identity,emailVerified:!!window.verified}};
    export const createAccount=async()=>({identity,verificationSent:false});
    export const resendVerification=async()=>{},completePasswordReset=async()=>{},sendRecovery=async()=>{},verifyEmailAction=async()=>{},signInWithGoogle=async()=>identity,signInWithFirebaseCustomToken=async()=>identity;
  ` }));
  let claimed = false;
  await page.route('**/v1/**', r => {
    const claim = r.request().url().includes('claim');
    if (claim) claimed = true;
    return r.fulfill({ json: { id:'fixture',display_name:'Parent Name',username:claim?'parentname':'',role:'parent',language:'en' } });
  });
  await page.goto(`http://localhost:${server.httpServer.address().port}`);
  await page.getByLabel('Username or email', { exact: true }).fill('parent@example.invalid');
  assert(await page.getByLabel('Username or email', { exact: true }).evaluate(el=>el.checkValidity()));
  await page.getByRole('button',{name:'Create an account',exact:true}).click();
  await page.getByLabel('Full name',{exact:true}).fill('Parent Name');
  await page.getByLabel('Username',{exact:true}).fill('parentname');
  await page.getByLabel('Email address',{exact:true}).fill('parent@example.invalid');
  await page.getByLabel('New password').fill('long-fixture-password');
  await page.getByLabel('Confirm password',{exact:true}).fill('long-fixture-password');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.getByText('Your account was created, but the verification email could not be sent. Use the resend button below.').waitFor();
  await page.getByRole('button',{name:'I’ve verified my email — continue',exact:true}).click();
  await page.getByText('Your email still needs verification. Open the link we sent you, or enter your password below to send a fresh link.').waitFor();
  assert.equal(claimed, false, 'Unverified identities must not claim a profile');
  await page.evaluate(()=>window.verified=true);
  await page.getByLabel('Password',{exact:true}).fill('long-fixture-password');
  await page.getByRole('button',{name:'I’ve verified my email — continue',exact:true}).click();
  await page.waitForFunction(()=>document.body.dataset.completed==='yes');
  assert(claimed, 'Previously entered username should be claimed without another form');
  assert.equal(await page.evaluate(()=>window.emailUsed),'parent@example.invalid');
  console.log('PASS: email input, signup, mail-failure recovery, verified continuation and automatic profile completion (mock providers).');
} finally { await browser.close(); await server.close(); }
