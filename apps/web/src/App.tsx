import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Shell } from "./components/shell/Shell.tsx";
import { useWorkspaces } from "./lib/queries.ts";
import { ObservatoryPage } from "./pages/ObservatoryPage.tsx";

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
const ReportsPage = lazy(() => import("./pages/ReportsPage.tsx").then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage.tsx").then((m) => ({ default: m.SettingsPage })));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage.tsx").then((m) => ({ default: m.OnboardingPage })));
const TrustPage = lazy(() => import("./pages/TrustPage.tsx").then((m) => ({ default: m.TrustPage })));

function Landing() {
  const { data, isLoading } = useWorkspaces();
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoading || !data) return;
    navigate(data.length ? `/w/${data[0]!.workspace.slug}` : "/onboarding", { replace: true });
  }, [data, isLoading, navigate]);
  return <div className="page muted">Loading Visua…</div>;
}

const Fallback = () => <div className="page muted">Loading…</div>;

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/trust/:slug" element={<TrustPage />} />
          <Route path="/w/:ws" element={<Shell />}>
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
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
