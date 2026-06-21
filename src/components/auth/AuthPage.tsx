import { useState } from 'react'
import { GoogleButton } from './GoogleButton'
import { AuthDivider } from './AuthDivider'
import { SignInForm } from './SignInForm'
import { SignUpForm } from './SignUpForm'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { VerifyEmailNotice } from './VerifyEmailNotice'
import { ResetPasswordForm } from './ResetPasswordForm'

type Mode = 'sign-in' | 'sign-up' | 'forgot-password' | 'verify-email' | 'reset-password'

interface Props {
  initialMode?: Mode
}

export function AuthPage({ initialMode = 'sign-in' }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [verifyEmail, setVerifyEmail] = useState('')

  const handleSignUpSuccess = (email: string) => {
    setVerifyEmail(email)
    setMode('verify-email')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
      <h1 className="text-2xl font-bold text-gray-900">Mood Tracker</h1>

      {mode === 'verify-email' && <VerifyEmailNotice email={verifyEmail} />}

      {mode === 'reset-password' && <ResetPasswordForm />}

      {mode === 'forgot-password' && (
        <>
          <p className="text-gray-500 text-sm">Reset your password</p>
          <ForgotPasswordForm />
          <button
            type="button"
            onClick={() => setMode('sign-in')}
            className="text-sm text-blue-600"
          >
            Back to sign in
          </button>
        </>
      )}

      {(mode === 'sign-in' || mode === 'sign-up') && (
        <>
          <p className="text-gray-500 text-sm">
            {mode === 'sign-in' ? 'Sign in to your account' : 'Create an account'}
          </p>
          <GoogleButton />
          <AuthDivider />
          {mode === 'sign-in' && (
            <SignInForm onForgotPassword={() => setMode('forgot-password')} />
          )}
          {mode === 'sign-up' && (
            <SignUpForm onSuccess={handleSignUpSuccess} />
          )}
          <p className="text-sm text-gray-500">
            {mode === 'sign-in' ? (
              <>
                No account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('sign-up')}
                  className="text-blue-600"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('sign-in')}
                  className="text-blue-600"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </>
      )}
    </div>
  )
}
