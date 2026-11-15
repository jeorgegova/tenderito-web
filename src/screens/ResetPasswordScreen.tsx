import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoArrowBack,
  IoCheckmarkCircle,
  IoKeyOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';
import { showAlert } from '../utils/alert';
import { supabase } from '../lib/supabase';
import { Colors } from '../theme';
import nuevoLogo from '../assets/NuevoLogo.png';

export function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // 1. Escuchar evento de recuperación de contraseña de Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY' || session) {
          setHasSession(true);
        }
        setChecking(false);
      },
    );

    // 2. Comprobar si ya existe una sesión en curso desde el hash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      }
      setChecking(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleResetPassword() {
    if (password.length < 6) {
      return showAlert({
        title: 'Contraseña muy corta',
        message: 'La contraseña debe tener mínimo 6 caracteres.',
        type: 'warning',
      });
    }

    if (password !== confirmPassword) {
      return showAlert({
        title: 'No coinciden',
        message: 'Las contraseñas ingresadas no son iguales.',
        type: 'warning',
      });
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();

      showAlert({
        title: '¡Contraseña actualizada!',
        message: 'Tu contraseña ha sido restablecida con éxito. Ya puedes ingresar.',
        type: 'success',
        buttons: [
          {
            text: 'Ir a Iniciar Sesión',
            onPress: () => navigate('/login'),
          },
        ],
      });
    } catch (err: any) {
      showAlert({
        title: 'Error al cambiar contraseña',
        message: err?.message || 'El enlace ha expirado o no es válido.',
        type: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Colors.background,
        }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: `3px solid ${Colors.primaryLight}`,
            borderTopColor: Colors.primary,
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        backgroundColor: Colors.background,
        overflow: 'hidden',
        padding: '24px 20px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}>
      <DynamicBrandCurves position="bottom-left" />

      {/* Botón Volver */}
      <button
        onClick={() => navigate('/login')}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: '#FFFFFF',
          border: `1.5px solid ${Colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          boxShadow: '0 2px 6px rgba(20, 32, 51, 0.05)',
        }}>
        <IoArrowBack size={20} color={Colors.primary} />
      </button>

      <div
        style={{
          width: '100%',
          maxWidth: 420,
          margin: '20px auto 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
        <div style={{ textAlign: 'center', padding: '4px 0' }}>
          <img
            src={nuevoLogo}
            alt="Tenderito"
            style={{ width: 170, height: 'auto', display: 'block', margin: '0 auto' }}
          />
        </div>

        <Card
          style={{
            padding: '24px 20px',
            borderRadius: 24,
            border: `1.5px solid ${Colors.border}`,
            boxShadow: '0 8px 30px rgba(20, 32, 51, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
          <div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: Colors.text,
                margin: '0 0 6px',
                textAlign: 'center',
              }}>
              Nueva contraseña
            </h2>
            <p
              style={{
                fontSize: 13,
                color: Colors.textSecondary,
                textAlign: 'center',
                margin: 0,
                lineHeight: '19px',
              }}>
              {hasSession
                ? 'Ingresa tu nueva contraseña para acceder a tu cuenta.'
                : 'El enlace de recuperación es inválido o ha expirado. Por favor solicita uno nuevo.'}
            </p>
          </div>

          {hasSession ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input
                label="Nueva contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
              />

              <Input
                label="Confirmar nueva contraseña"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                type="password"
                placeholder="Repite la contraseña"
                disabled={loading}
              />

              <Button
                title={loading ? 'Actualizando…' : 'Guardar nueva contraseña'}
                onPress={handleResetPassword}
                disabled={loading}
                icon={<IoKeyOutline size={18} />}
              />
            </div>
          ) : (
            <Button
              title="Solicitar nuevo enlace"
              onPress={() => navigate('/forgot-password')}
            />
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 4,
              marginTop: 6,
              paddingTop: 8,
              borderTop: `1px solid ${Colors.border}`,
            }}>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: Colors.primary,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}>
              Volver al inicio de sesión
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}