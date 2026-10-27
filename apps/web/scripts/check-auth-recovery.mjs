import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
try {
  for (const scenario of ['unfinished', 'verifyEmail', 'resetPassword']) {
    const page = await browser.newPage();
    let meRequests = 0;
    await page.route('**/src/auth.ts', r => r.fulfill({ contentType: 'application/javascript', body: `
      export const authConfigurationError='';
      const identity={uid:'fixture',email:'parent@example.invalid',emailVerified:${scenario !== 'unfinished'}};
      export const firebaseAuth={currentUser:identity};
      export const restoreSession=async()=>identity, bearerToken=()=> 'fixture', tokenFor=async()=> 'fixture', signOut=async()=>{};
      export const signInWithEmail=async()=>identity, signInWithGoogle=async()=>identity, signInWithFirebaseCustomToken=async()=>identity;
      export const createAccount=async()=>({identity,verificationSent:true}),resendVerification=async()=>{},sendRecovery=async()=>{},completePasswordReset=async()=>{};
      export const verifyEmailAction=async()=>{window.verificationCalls=(window.verificationCalls||0)+1; await new Promise(r=>setTimeout(r,50));};
    ` }));
    await page.route('**/v1/**', r => {
      if (r.request().url().includes('/me/')) meRequests++;
      return r.fulfill({ json: { id:'fixture',username:'parentname',display_name:'Parent',role:'parent',language:'en' } });
    });
    const suffix = scenario === 'unfinished' ? '/' : `/auth/callback?mode=${scenario}&oobCode=fixture-code`;
    await page.goto(`http://localhost:${server.httpServer.address().port}${suffix}`);
    if (scenario === 'unfinished') {
      await page.getByRole('heading', { name: 'Verify your email', exact: true }).waitFor();
    } else if (scenario === 'verifyEmail') {
      await page.getByText('Your email is verified. Sign in with your email to finish setup.', { exact: true }).waitFor();
      assert.equal(await page.evaluate(()=>window.verificationCalls), 1);
      assert(await page.getByRole('button', { name: 'Sign in', exact: true }).isEnabled());
    } else {
      await page.getByRole('heading', { name: 'Set a new password', exact: true }).waitFor();
    }
    assert.equal(meRequests, 0, 'Recovery must not be intercepted by workspace restoration');
    await page.close();
    console.log(`PASS: ${scenario} with a saved identity and React StrictMode`);
  }
} finally { await browser.close(); await server.close(); }
