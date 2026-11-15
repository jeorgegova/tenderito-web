import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoStorefrontOutline } from 'react-icons/io5';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';
import { Input } from '../components/ui/Input';
import { showAlert } from '../components/ui/AlertModal';
import { supabase } from '../lib/supabase';
import { Colors } from '../theme';
import nuevoLogo from '../assets/NuevoLogo.png';

export function RegisterScreen() {
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onRegister() {
    if (!storeName || !merchantName || !email || !password) {
      return showAlert({
        title: 'Faltan datos',
        message: 'Completa todos los campos',
        type: 'warning',
      });
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          store_name: storeName.trim(),
          merchant_name: merchantName.trim(),
          subscription_plan: 'free',
        },
      },
    });

    if (error || !data.user) {
      setLoading(false);
      return showAlert({
        title: 'Error',
        message: error?.message ?? 'No se pudo registrar',
        type: 'destructive',
      });
    }

    setLoading(false);

    if (!data.session) {
      return showAlert({
        title: 'Revisa tu correo',
        message:
          'Te enviamos un correo de comprobación. Valida tu cuenta para poder iniciar sesión.',
        type: 'info',
        buttons: [
          {
            text: 'Ir al inicio de sesión',
            onPress: () => navigate('/login'),
          },
        ],
      });
    }

    showAlert({
      title: 'Cuenta creada',
      message: 'Tu cuenta ya está lista para usar.',
      type: 'success',
      buttons: [
        {
          text: 'Continuar',
          onPress: () => navigate('/'),
        },
      ],
    });
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
      }}>
      <DynamicBrandCurves position="top-right" />

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
          border: `1px solid ${Colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
        <IoArrowBack size={22} color={Colors.text} />
      </button>

      <div
        style={{
          maxWidth: 420,
          margin: '36px auto 0',
          position: 'relative',
          zIndex: 1,
        }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img
            src={nuevoLogo}
            alt="Tenderito"
            style={{ width: 160, height: 'auto', margin: '0 auto', display: 'block' }}
          />
        </div>

        <Card
          style={{
            padding: '24px 20px',
            borderRadius: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            boxShadow: '0 8px 30px rgba(20, 32, 51, 0.08)',
          }}>
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: Colors.text, margin: 0 }}>
              Crea tu tienda
            </h2>
            <p style={{ fontSize: 13, color: Colors.textSecondary, margin: '4px 0 0' }}>
              Tu libreta digital gratis y segura
            </p>
          </div>

          <Input
            label="Nombre de tu tienda o negocio"
            value={storeName}
            onChange={e => setStoreName(e.target.value)}
            placeholder="Ej. Tienda La Floresta"
          />

          <Input
            label="Tu nombre completo"
            value={merchantName}
            onChange={e => setMerchantName(e.target.value)}
            placeholder="Ej. Carmen Rodríguez"
          />

          <Input
            label="Correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            placeholder="tutienda@mail.com"
          />

          <Input
            label="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder="Mínimo 6 caracteres"
          />

          <Button
            title={loading ? 'Creando cuenta…' : 'Crear mi tienda gratis'}
            onPress={onRegister}
            disabled={loading}
          />

          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: Colors.primary,
                cursor: 'pointer',
              }}>
              ¿Ya tienes cuenta? Inicia sesión
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
