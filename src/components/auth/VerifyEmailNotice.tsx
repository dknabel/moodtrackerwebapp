interface Props {
  email: string
}

export function VerifyEmailNotice({ email }: Props) {
  return (
    <div className="text-center max-w-sm">
      <h2 className="font-sans font-medium text-xl tracking-[-0.025em] text-ink mb-2">Check your email</h2>
      <p className="text-muted text-sm">
        We sent a verification link to <strong>{email}</strong>. Click it to finish signing up.
      </p>
    </div>
  )
}
