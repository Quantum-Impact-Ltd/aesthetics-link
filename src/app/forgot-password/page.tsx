"use client";

import Link from "next/link";
import { useState } from "react";

import CaptchaField from "@/components/CaptchaField";
import Header from "@/components/Header";
import MotionProvider from "@/components/MotionProvider";
import { requestPasswordReset } from "@/lib/auth/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await requestPasswordReset({
        email,
        captchaToken: captchaToken ?? undefined,
      });
      setMessage(response.message ?? "If your account exists, reset instructions were sent.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to request reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page shop-page">
      <MotionProvider />
      <Header />
      <main className="auth-split">
        <div className="auth-visual">
          <div className="auth-visual-text">
            <h2>Reset your password.</h2>
            <p>Secure reset links expire quickly for account safety.</p>
          </div>
        </div>

        <div className="auth-content">
          <div className="auth-form-wrapper">
            <h1 className="auth-title">Forgot Password</h1>
            <p className="auth-subtitle">Enter your email to receive a reset link.</p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-input-group">
                <label className="auth-label" htmlFor="forgotEmail">
                  Email
                </label>
                <input
                  className="auth-input"
                  type="email"
                  id="forgotEmail"
                  placeholder="Email address"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <CaptchaField onTokenChange={setCaptchaToken} />

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>

            {message ? <p style={{ marginTop: "0.8rem", color: "var(--color-gray2)", fontSize: "0.85rem" }}>{message}</p> : null}
            {error ? <p style={{ marginTop: "0.8rem", color: "#b04545", fontSize: "0.85rem" }}>{error}</p> : null}

            <div className="auth-footer">
              Back to{" "}
              <Link href="/login" className="auth-link">
                Login
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
