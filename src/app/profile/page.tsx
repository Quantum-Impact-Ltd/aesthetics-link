"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MotionProvider from "@/components/MotionProvider";
import { getMe, logout } from "@/lib/auth/client";
import type { AuthUser } from "@/lib/auth/types";

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page shop-page profile-page">
          <main className="container profile-main">
            <p className="profile-loading profile-loading--shell">Loading profile...</p>
          </main>
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const state = searchParams.get("state");

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setError(null);

      try {
        const response = await getMe();
        setUser(response.user);
      } catch (authError) {
        setUser(null);
        setError(authError instanceof Error ? authError.message : "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, []);

  async function handleLogout(): Promise<void> {
    if (logoutBusy) {
      return;
    }

    setLogoutBusy(true);
    try {
      await logout();
      router.push("/login");
      router.refresh();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Unable to log out.");
    } finally {
      setLogoutBusy(false);
    }
  }

  const clinicStatus = user?.clinicStatus ?? "pending";
  const clinicStatusTone =
    clinicStatus === "approved"
      ? "approved"
      : clinicStatus === "rejected"
        ? "rejected"
        : "pending";
  const clinicStatusMessage =
    clinicStatus === "approved"
      ? "Your business account is approved and wholesale pricing is active."
      : clinicStatus === "rejected"
        ? "Your business application was not approved. Contact support if you want it reviewed."
        : "Your business application is in review. Retail shopping remains available meanwhile.";

  return (
    <div className="auth-page shop-page profile-page">
      <MotionProvider />
      <Header />

      <main className="container profile-main">
        <div className="profile-shell">
          <div className="profile-heading">
            <p className="superscript profile-heading__eyebrow">Account</p>
            <h1 className="profile-heading__title">
              {user ? `Welcome back, ${user.firstName || "Customer"}` : "My Profile"}
            </h1>
            <p className="profile-heading__subtitle">
              Manage your account and continue your shopping journey.
            </p>
          </div>

          {loading ? <p className="profile-loading">Loading profile...</p> : null}

          {!loading && state === "signup-success" ? (
            <div className="profile-banner">
              Account created successfully. You can continue shopping whenever you are ready.
            </div>
          ) : null}

          {!loading && state === "clinic-pending" ? (
            <div className="profile-banner">
              Business application received. We will notify you after review.
            </div>
          ) : null}

          {!loading && !user ? (
            <div className="profile-card profile-card--auth">
              <h2 className="profile-card__title">Sign in to access your profile</h2>
              <p>{error ?? "You are not logged in."}</p>
              <div className="profile-actions">
                <Link href="/login" className="btn">
                  Log in
                </Link>
                <Link href="/signup" className="btn profile-btn-secondary">
                  Create account
                </Link>
              </div>
            </div>
          ) : null}

          {user ? (
            <div className="profile-grid">
              <article className="profile-card">
                <p className="profile-card__label superscript">Account Details</p>
                <h2 className="profile-card__title">
                  {user.firstName} {user.lastName}
                </h2>
                <ul className="profile-meta-list">
                  <li>
                    <span>Email</span>
                    <strong>{user.email}</strong>
                  </li>
                  <li>
                    <span>Display Name</span>
                    <strong>{user.displayName || `${user.firstName} ${user.lastName}`}</strong>
                  </li>
                  {user.accountType === "clinic" ? (
                    <li>
                      <span>Account</span>
                      <strong>Business Customer</strong>
                    </li>
                  ) : null}
                </ul>
              </article>

              <article className="profile-card">
                <p className="profile-card__label superscript">Quick Actions</p>
                <h2 className="profile-card__title">What would you like to do?</h2>
                <div className="profile-actions">
                  <Link href="/products" className="btn">
                    Continue Shopping
                  </Link>
                  <Link href="/cart" className="btn profile-btn-secondary">
                    View Bag
                  </Link>
                  <Link href="/forgot-password" className="btn profile-btn-secondary">
                    Reset Password
                  </Link>
                  <button
                    type="button"
                    className="btn profile-btn-secondary"
                    onClick={() => void handleLogout()}
                    disabled={logoutBusy}
                  >
                    {logoutBusy ? "Signing out..." : "Log out"}
                  </button>
                </div>
              </article>

              <article className="profile-card">
                <p className="profile-card__label superscript">Support</p>
                <h2 className="profile-card__title">Need help with your account?</h2>
                <p className="profile-card__copy">
                  For order updates, returns, or account support, contact our team and we will help you quickly.
                </p>
                <div className="profile-actions">
                  <Link href="/products" className="btn profile-btn-secondary">
                    Browse Products
                  </Link>
                  <Link href="/forgot-password" className="btn profile-btn-secondary">
                    Recover Password
                  </Link>
                </div>
              </article>

              {user.accountType === "clinic" ? (
                <article className={`profile-card profile-card--clinic profile-card--${clinicStatusTone}`}>
                  <p className="profile-card__label superscript">Business Account</p>
                  <h2 className="profile-card__title profile-clinic-status">
                    {clinicStatus === "approved"
                      ? "Approved"
                      : clinicStatus === "rejected"
                        ? "Not Approved"
                        : "Pending Review"}
                  </h2>
                  <p className="profile-card__copy">{clinicStatusMessage}</p>
                  {user.businessInfo?.businessName || user.businessInfo?.clinicName ? (
                    <p className="profile-card__copy">
                      Registered as: {user.businessInfo.businessName || user.businessInfo.clinicName}
                    </p>
                  ) : null}
                </article>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
