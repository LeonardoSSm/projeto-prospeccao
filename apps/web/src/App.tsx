import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { CampaignsPage } from "./pages/CampaignsPage";
import { LeadsPage } from "./pages/LeadsPage";
import { LeadDetailPage } from "./pages/LeadDetailPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/campaigns" replace />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="leads/:id" element={<LeadDetailPage />} />
      </Route>
    </Routes>
  );
}
