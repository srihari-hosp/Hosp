import { FC, ReactNode } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Stack,
  alpha,
  Paper,
  Button,
  LinearProgress,
} from "@mui/material";
import {
  ArrowBack,
  PlayCircleOutline,
  SchoolOutlined,
  WorkspacePremiumOutlined,
  AssignmentOutlined,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { tokens, glassmorphism } from "../theme/tokens";
import { PublicLayout } from "../components/layout/PublicLayout";

const CourseCard = ({ title, level, duration, progress, icon }: { title: string, level: string, duration: string, progress: number, icon: ReactNode }) => (
  <Paper
    elevation={0}
    sx={{
      p: 4,
      borderRadius: "24px",
      border: `1px solid ${tokens.colors.outlineVariant}`,
      bgcolor: "white",
      transition: "all 0.3s ease",
      "&:hover": {
        borderColor: tokens.colors.primary,
        boxShadow: "0 12px 24px rgba(0, 93, 172, 0.08)",
        transform: "translateY(-4px)"
      },
    }}
  >
    <Stack direction="row" spacing={3} sx={{ mb: 4 }}>
      <Box sx={{ 
        p: 1.5, 
        borderRadius: "14px", 
        bgcolor: alpha(tokens.colors.primary, 0.06), 
        color: tokens.colors.primary, 
        width: "fit-content",
        display: "flex"
      }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: "1.125rem", mb: 0.5 }}>{title}</Typography>
        <Typography sx={{ 
          fontSize: "0.75rem", 
          color: tokens.colors.onSurfaceVariant, 
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          {level} • {duration}
        </Typography>
      </Box>
    </Stack>
    <Box sx={{ mb: 4 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>Course Progress</Typography>
        <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: tokens.colors.primary }}>{progress}%</Typography>
      </Stack>
      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ 
          borderRadius: "100px", 
          height: 8, 
          bgcolor: alpha(tokens.colors.primary, 0.05), 
          "& .MuiLinearProgress-bar": { borderRadius: "100px", bgcolor: tokens.colors.primary } 
        }} 
      />
    </Box>
    <Button 
      variant="contained" 
      fullWidth 
      startIcon={<PlayCircleOutline />}
      sx={{ 
        borderRadius: "12px", 
        textTransform: "none", 
        fontWeight: 700, 
        py: 1.5,
        bgcolor: progress > 0 ? tokens.colors.primary : alpha(tokens.colors.onSurface, 0.05),
        color: progress > 0 ? "white" : tokens.colors.onSurface,
        boxShadow: "none",
        "&:hover": {
          bgcolor: progress > 0 ? tokens.colors.primaryContainer : alpha(tokens.colors.onSurface, 0.1),
          boxShadow: "none"
        }
      }}
    >
      {progress > 0 ? "Continue Lesson" : "Start Learning"}
    </Button>
  </Paper>
);

export const TrainingPage: FC = () => {
  return (
    <PublicLayout>
      <Box sx={{ 
        bgcolor: tokens.colors.surface, 
        minHeight: "100%", 
        py: 10,
        background: `radial-gradient(circle at 0% 100%, ${alpha(tokens.colors.primary, 0.05)} 0%, transparent 40%)`
      }}>
        <Container maxWidth="lg">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 10 }}>
            <Box>
              <Button
                component={RouterLink}
                to="/landing"
                startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
                sx={{ mb: 3, textTransform: "none", fontWeight: 600, color: tokens.colors.onSurfaceVariant, fontSize: "0.875rem" }}
              >
                Back to Home
              </Button>
              <Typography variant="h2" sx={{ fontWeight: 900, letterSpacing: "-0.04em", mb: 2 }}>
                MedCore Academy
              </Typography>
              <Typography sx={{ fontSize: "1.125rem", color: tokens.colors.onSurfaceVariant, fontWeight: 500 }}>
                Master the platform with structured learning paths designed for clinicians.
              </Typography>
            </Box>
            <Box sx={{ 
              p: 3, 
              borderRadius: "24px", 
              bgcolor: alpha(tokens.colors.primary, 0.08), 
              color: tokens.colors.primary, 
              display: { xs: "none", md: "flex" } 
            }}>
              <SchoolOutlined sx={{ fontSize: 48 }} />
            </Box>
          </Stack>

          <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography sx={{ fontWeight: 800, mb: 4, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>Your Active Courses</Typography>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CourseCard 
                    title="Clinical Basics" 
                    level="Beginner" 
                    duration="2h 15m" 
                    progress={75} 
                    icon={<AssignmentOutlined />} 
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CourseCard 
                    title="Advanced Billing" 
                    level="Advanced" 
                    duration="4h 30m" 
                    progress={20} 
                    icon={<WorkspacePremiumOutlined />} 
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CourseCard 
                    title="System Administration" 
                    level="Intermediate" 
                    duration="3h 45m" 
                    progress={0} 
                    icon={<SchoolOutlined />} 
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper elevation={0} sx={{ 
                p: 6, 
                borderRadius: "32px", 
                ...glassmorphism
              }}>
                <Typography sx={{ fontWeight: 800, mb: 4, fontSize: "1.125rem" }}>Learning Statistics</Typography>
                <Stack spacing={5}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 900, color: tokens.colors.primary, mb: 0.5 }}>12</Typography>
                    <Typography sx={{ fontWeight: 700, color: tokens.colors.onSurfaceVariant, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Lessons Completed</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 900, color: tokens.colors.primary, mb: 0.5 }}>4.5h</Typography>
                    <Typography sx={{ fontWeight: 700, color: tokens.colors.onSurfaceVariant, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Learning Time</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 900, color: tokens.colors.primary, mb: 0.5 }}>2</Typography>
                    <Typography sx={{ fontWeight: 700, color: tokens.colors.onSurfaceVariant, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Certificates Earned</Typography>
                  </Box>
                </Stack>
                <Button 
                  variant="outlined"
                  component={RouterLink}
                  to="/training/achievements"
                  fullWidth 
                  sx={{ 
                    mt: 6, 
                    borderRadius: "12px", 
                    borderColor: tokens.colors.outlineVariant,
                    color: tokens.colors.onSurface,
                    textTransform: "none",
                    fontWeight: 700,
                    py: 1.5
                  }}
                >
                  View All Achievements
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </PublicLayout>
  );
};
