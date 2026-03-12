"use client";

interface EmailStatusMessagesProps {
  success: boolean;
  error: string | null;
}

export function EmailStatusMessages({
  success,
  error,
}: EmailStatusMessagesProps) {
  return (
    <div className="space-y-4">
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Email sent successfully! Your verification email has been delivered.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to send email: {error}
        </div>
      )}
    </div>
  );
}

