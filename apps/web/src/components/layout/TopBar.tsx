import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Stack,
  ButtonBase,
  alpha,
  Button,
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useLogoutMutation } from '../../store/api';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { clearUser } from '../../store/slices/userSlice';
import { clearTenantState } from '../../store/slices/tenantSlice';
import { clearOnboardingStorage } from '../../App';
import {
  LocalHospital,
  Settings,
  AccountCircle,
  Public,
} from '@mui/icons-material';
import { tokens } from '../../theme/tokens';

export const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.user.currentUser);
  const [logoutRequest] = useLogoutMutation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    try {
      await logoutRequest().unwrap();
    } catch {
      // Logout is best-effort
    }
    clearOnboardingStorage(currentUser?.id);
    dispatch(logout());
    dispatch(clearUser());
    dispatch(clearTenantState());
    navigate('/login', { replace: true });
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: 'white',
        borderBottom: `1px solid ${tokens.colors.surfaceContainerHighest}`,
        color: tokens.colors.onSurface,
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <LocalHospital sx={{ color: tokens.colors.primaryContainer }} />
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 900,
              letterSpacing: '-0.04em',
              color: tokens.colors.primaryContainer,
            }}
          >
            Medical Center
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            component={RouterLink}
            to="/landing"
            startIcon={<Public />}
            size="small"
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              color: tokens.colors.onSurfaceVariant,
              mr: 1,
              borderRadius: '8px',
              px: 2,
              '&:hover': { bgcolor: alpha(tokens.colors.primary, 0.05) }
            }}
          >
            Public Site
          </Button>
          <IconButton 
            component={RouterLink}
            to="/settings/consent"
            size="large" 
            sx={{ color: tokens.colors.onSurfaceVariant }}
          >
            <Settings />
          </IconButton>
          <ButtonBase
            onClick={handleMenu}
            aria-haspopup="menu"
            aria-controls={anchorEl ? 'menu-appbar' : undefined}
            aria-expanded={Boolean(anchorEl)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              ml: 1,
              px: 1.5,
              py: 0.75,
              borderRadius: '12px',
              border: `1px solid transparent`,
              '&:hover': { 
                bgcolor: alpha(tokens.colors.primary, 0.04),
                borderColor: alpha(tokens.colors.primary, 0.1)
              },
              transition: 'all 0.2s',
              textAlign: 'left',
            }}
          >
            <AccountCircle sx={{ color: tokens.colors.onSurfaceVariant }} />
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {currentUser?.name ?? 'User'}
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 600 }}>
                {currentUser?.role ?? 'Staff'}
              </Typography>
            </Box>
          </ButtonBase>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                border: `1px solid ${tokens.colors.outlineVariant}`
              }
            }}
          >
            <MenuItem onClick={handleClose} sx={{ fontWeight: 600, px: 3, py: 1.5 }}>Profile</MenuItem>
            <MenuItem onClick={handleLogout} sx={{ fontWeight: 600, px: 3, py: 1.5, color: 'error.main' }}>Logout</MenuItem>
          </Menu>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};
