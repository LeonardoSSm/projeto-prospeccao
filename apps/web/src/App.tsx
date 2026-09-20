import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { CampaignsPage } from "./pages/CampaignsPage";
import { LeadsPage } from "./pages/LeadsPage";
import { LeadDetailPage } from "./pages/LeadDetailPage";
import { NichesPage } from "./pages/NichesPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/campaigns" replace />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="leads/:id" element={<LeadDetailPage />} />
        <Route path="niches" element={<NichesPage />} />
      </Route>
    </Routes>
  );
}
