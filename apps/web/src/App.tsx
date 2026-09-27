import { useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Shell } from "./components/shell/Shell.tsx";
import { onUnauthorized } from "./lib/api.ts";
import { meKey, useMe } from "./lib/auth.ts";
import { useWorkspaces } from "./lib/queries.ts";
import { LoginPage } from "./pages/LoginPage.tsx";

// three.js (1.1 MB, 290 KB compressed) loads with the 3D pages only.
const ObservatoryPage = lazy(() => import("./pages/ObservatoryPage.tsx").then((m) => ({ default: m.ObservatoryPage })));
const HomePage = lazy(() => import("./pages/HomePage.tsx").then((m) => ({ default: m.HomePage })));
const PlanPage = lazy(() => import("./pages/PlanPage.tsx").then((m) => ({ default: m.PlanPage })));
const EvidencePage = lazy(() => import("./pages/EvidencePage.tsx").then((m) => ({ default: m.EvidencePage })));
const AgentsPage = lazy(() => import("./pages/AgentsPage.tsx").then((m) => ({ default: m.AgentsPage })));
const PoliciesPage = lazy(() => import("./pages/PoliciesPage.tsx").then((m) => ({ default: m.PoliciesPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage.tsx").then((m) => ({ default: m.ProfilePage })));
const CrosswalkPage = lazy(() => import("./pages/CrosswalkPage.tsx").then((m) => ({ default: m.CrosswalkPage })));
const Soc2Page = lazy(() => import("./pages/Soc2Page.tsx").then((m) => ({ default: m.Soc2Page })));
const RmfPage = lazy(() => import("./pages/RmfPage.tsx").then((m) => ({ default: m.RmfPage })));
const AiPage = lazy(() => import("./pages/AiPage.tsx").then((m) => ({ default: m.AiPage })));
const LawsPage = lazy(() => import("./pages/LawsPage.tsx").then((m) => ({ default: m.LawsPage })));
const ThreatsPage = lazy(() => import("./pages/ThreatsPage.tsx").then((m) => ({ default: m.ThreatsPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage.tsx").then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage.tsx").then((m) => ({ default: m.SettingsPage })));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage.tsx").then((m) => ({ default: m.OnboardingPage })));
const TrustPage = lazy(() => import("./pages/TrustPage.tsx").then((m) => ({ default: m.TrustPage })));
const OrganizationPage = lazy(() => import("./pages/OrganizationPage.tsx").then((m) => ({ default: m.OrganizationPage })));

function Landing() {
  const { data, isLoading } = useWorkspaces();
  const me = useMe();
  const navigate = useNavigate();
  const canCreate = !!me.data?.activeTenant?.capabilities.includes("workspace.configure");
  useEffect(() => {
    if (isLoading || !data) return;
    if (data.length) navigate(`/w/${data[0]!.workspace.slug}`, { replace: true });
    else if (canCreate) navigate("/onboarding", { replace: true });
  }, [data, isLoading, navigate, canCreate]);
  if (data && !data.length && !canCreate) {
    return (
      <div className="login">
        <div className="login__card panel">
          <h1 style={{ margin: 0 }}>No workspaces yet</h1>
          <p className="muted">{me.data?.activeTenant ? `${me.data.activeTenant.name} has no workspace you can see. An admin creates workspaces and invites people.` : "You are not a member of any organization yet. Ask an administrator to add you."}</p>
        </div>
      </div>
    );
  }
  return <div className="page muted">Loading Visua…</div>;
}

/** Everything except sign-in and public trust centers needs a signed-in principal. */
function RequireSignIn({ children }: { children: ReactNode }) {
  const me = useMe();
  const qc = useQueryClient();
  const location = useLocation();
  useEffect(() => onUnauthorized(() => qc.setQueryData(meKey, null)), [qc]);
  if (me.isLoading) return <div className="page muted">Loading Visua…</div>;
  if (!me.data) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

const Fallback = () => <div className="page muted">Loading…</div>;

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/trust/:slug" element={<TrustPage />} />
          <Route path="/" element={<RequireSignIn><Landing /></RequireSignIn>} />
          <Route path="/onboarding" element={<RequireSignIn><OnboardingPage /></RequireSignIn>} />
          <Route path="/w/:ws" element={<RequireSignIn><Shell /></RequireSignIn>}>
            <Route index element={<HomePage />} />
            <Route path="observatory" element={<ObservatoryPage />} />
            <Route path="observatory/:fw" element={<ObservatoryPage />} />
            <Route path="plan" element={<PlanPage />} />
            <Route path="evidence" element={<EvidencePage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="agents/:runId" element={<AgentsPage />} />
            <Route path="policies" element={<PoliciesPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="crosswalk" element={<CrosswalkPage />} />
            <Route path="soc2" element={<Soc2Page />} />
            <Route path="rmf" element={<RmfPage />} />
            <Route path="ai" element={<AiPage />} />
            <Route path="laws" element={<LawsPage />} />
            <Route path="threats" element={<ThreatsPage />} />
            <Route path="threats/:catalog" element={<ThreatsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="organization" element={<OrganizationPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
