interface Props {
  email: string
}

export function VerifyEmailNotice({ email }: Props) {
  return (
    <div className="text-center max-w-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
      <p className="text-gray-500 text-sm">
        We sent a verification link to <strong>{email}</strong>. Click it to finish signing up.
      </p>
    </div>
  )
}
