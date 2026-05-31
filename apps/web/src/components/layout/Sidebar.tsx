// apps/web/src/components/layout/Sidebar.tsx
import React from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  alpha,
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  PeopleOutlined,
  SettingsOutlined,
  HistoryOutlined,
  EventNoteOutlined,
  ReceiptLongOutlined,
  MedicalServicesOutlined,
  ScienceOutlined,
  ShieldOutlined,
} from '@mui/icons-material';
import { tokens } from '../../theme/tokens';

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardOutlined />, path: '/dashboard' },
  { text: 'Patients', icon: <PeopleOutlined />, path: '/patients' },
  { text: 'Consents', icon: <ShieldOutlined />, path: '/consents' },
  { text: 'Appointments', icon: <EventNoteOutlined />, path: '/appointments' },
  { text: 'Billing', icon: <ReceiptLongOutlined />, path: '/billing' },
  { text: 'Pharmacy', icon: <MedicalServicesOutlined />, path: '/pharmacy' },
  { text: 'Lab', icon: <ScienceOutlined />, path: '/lab' },
  { text: 'System Status', icon: <HistoryOutlined />, path: '/status' },
  { text: 'Settings / Consent', icon: <SettingsOutlined />, path: '/settings/consent' },
  { text: 'Settings / MFA', icon: <ShieldOutlined />, path: '/settings/mfa' },
  { text: 'Export My Data', icon: <HistoryOutlined />, path: '/export-my-data' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: `1px solid ${tokens.colors.surfaceContainerHighest}`,
          bgcolor: tokens.colors.surface,
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto', px: 2, py: 4 }}>
        <Typography
          variant="caption"
          sx={{
            px: 2,
            mb: 2,
            display: 'block',
            fontWeight: 800,
            color: tokens.colors.onSurfaceVariant,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontSize: '0.65rem',
            opacity: 0.6
          }}
        >
          Clinical Management
        </Typography>
        <List sx={{ px: 1 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItemButton
                key={item.path}
                component={Link}
                to={item.path}
                sx={{
                  borderRadius: '14px',
                  mb: 0.75,
                  py: 1.25,
                  px: 2,
                  bgcolor: isActive ? 'white' : 'transparent',
                  boxShadow: isActive ? '0 8px 16px -4px rgba(0,0,0,0.06)' : 'none',
                  border: `1px solid ${isActive ? tokens.colors.outlineVariant : 'transparent'}`,
                  color: isActive ? tokens.colors.primary : tokens.colors.onSurfaceVariant,
                  '&:hover': {
                    bgcolor: isActive ? 'white' : alpha(tokens.colors.primary, 0.04),
                    color: tokens.colors.primary,
                    transform: isActive ? 'none' : 'translateX(4px)',
                    '& .MuiListItemIcon-root': { color: tokens.colors.primary },
                  },
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: isActive ? tokens.colors.primary : tokens.colors.onSurfaceVariant,
                    transition: 'color 0.2s ease',
                  }}
                >
                  {React.cloneElement(item.icon as React.ReactElement, { sx: { fontSize: '1.25rem' } })}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 800 : 600,
                    letterSpacing: isActive ? '-0.01em' : '0'
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
};
