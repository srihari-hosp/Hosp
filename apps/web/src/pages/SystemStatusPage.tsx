import { Alert, Paper, Stack, Typography, Box } from "@mui/material";
import { useEffect, useState } from "react";

type HealthResponse = {
  status: string;
  database: string;
  redis: string;
  timestamp: string;
};

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiBaseUrl =
  configuredApiUrl && configuredApiUrl.length > 0
    ? configuredApiUrl
    : import.meta.env.PROD && typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3001";

export const SystemStatusPage = () => {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${apiBaseUrl}/api/health`, {
      credentials: "include",
    })
      .then(async (res) => {
        const body = (await res.json()) as HealthResponse;
        if (!active) return;
        if (!res.ok) {
          setError(`Health check failed: ${res.status}`);
          setData(body);
          return;
        }
        setData(body);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load system health.");
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            System Status
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time health monitoring of infrastructure services.
          </Typography>
        </Box>

        {error && (
          <Alert severity="warning" sx={{ borderRadius: "10px" }}>
            {error}
          </Alert>
        )}

        <Paper 
          variant="outlined" 
          sx={{ 
            p: 3, 
            borderRadius: "16px",
            borderColor: "rgba(0,0,0,0.06)",
          }}
        >
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>API Status</Typography>
              <Typography variant="body1" sx={{ 
                color: data?.status === 'ok' ? 'success.main' : 'text.secondary',
                fontWeight: 700 
              }}>
                {data?.status?.toUpperCase() ?? "LOADING..."}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>Database</Typography>
              <Typography variant="body1" sx={{ 
                color: data?.database === 'connected' ? 'success.main' : 'text.secondary',
                fontWeight: 700 
              }}>
                {data?.database?.toUpperCase() ?? "-"}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>Redis Cache</Typography>
              <Typography variant="body1" sx={{ 
                color: data?.redis === 'connected' ? 'success.main' : 'text.secondary',
                fontWeight: 700 
              }}>
                {data?.redis?.toUpperCase() ?? "-"}
              </Typography>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'right' }}>
              Last checked: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : "-"}
            </Typography>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
};
