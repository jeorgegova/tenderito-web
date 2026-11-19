import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../theme';
import { MainLayout } from '../components/MainLayout';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { CustomerRegisterScreen } from '../screens/CustomerRegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CustomersScreen } from '../screens/CustomersScreen';
import { CustomerDetailScreen } from '../screens/CustomerDetailScreen';
import { CustomerHistoryScreen } from '../screens/CustomerHistoryScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { FreePortfolioScreen } from '../screens/FreePortfolioScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { NewCreditScreen } from '../screens/NewCreditScreen';
import { NewPaymentScreen } from '../screens/NewPaymentScreen';
import { CustomerHomeScreen } from '../screens/CustomerHomeScreen';

export function RootNavigator() {
  const { isLoading, isAuthenticated, userType } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Colors.background,
        }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: `4px solid ${Colors.primaryLight}`,
            borderTopColor: Colors.primary,
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/customer-register" element={<CustomerRegisterScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (userType === 'customer') {
    return (
      <Routes>
        <Route path="/" element={<CustomerHomeScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Rol Store / Tendero
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/customers" element={<CustomersScreen />} />
        <Route path="/clientes" element={<Navigate to="/customers" replace />} />
        <Route path="/customers/:id" element={<CustomerDetailScreen />} />
        <Route path="/clientes/:id" element={<CustomerDetailScreen />} />
        <Route path="/stats" element={<StatsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
      </Route>
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      <Route path="/customers/:id/history" element={<CustomerHistoryScreen />} />
      <Route path="/clientes/:id/historial" element={<CustomerHistoryScreen />} />
      <Route path="/free-portfolio" element={<FreePortfolioScreen />} />
      <Route path="/alerts" element={<ReportsScreen />} />
      <Route path="/new-credit" element={<NewCreditScreen />} />
      <Route path="/creditos/nuevo" element={<NewCreditScreen />} />
      <Route path="/new-payment" element={<NewPaymentScreen />} />
      <Route path="/pagos/nuevo" element={<NewPaymentScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
