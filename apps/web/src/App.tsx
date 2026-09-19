import { Routes, Route } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchApiHealth } from "./api/client";

function Dashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["api-health"],
    queryFn: fetchApiHealth,
  });

  return (
    <main>
      <h1>Prospector</h1>
      <p>
        Status da Core API:{" "}
        {isLoading ? "verificando..." : isError ? "indisponível" : data?.status}
      </p>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
    </Routes>
  );
}
