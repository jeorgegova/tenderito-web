import { useState, useRef, useMemo } from 'react';
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
  const [phone, setPhone] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Validación estilo Formik (touched + errors en tiempo real)
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const phoneRef = useRef<HTMLInputElement>(null);
  const merchantNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!storeName.trim()) {
      errs.storeName = 'El nombre de la tienda es requerido';
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      errs.phone = 'El teléfono de contacto es requerido';
    } else if (cleanPhone.length < 7) {
      errs.phone = 'Ingresa un número de teléfono válido (mínimo 7 dígitos)';
    }
    if (!merchantName.trim()) {
      errs.merchantName = 'Tu nombre completo es requerido';
    }
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      errs.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errs.email = 'Ingresa un correo electrónico válido';
    }
    if (!password) {
      errs.password = 'La contraseña es requerida';
    } else if (password.length < 6) {
      errs.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Debes confirmar la contraseña';
    } else if (confirmPassword !== password) {
      errs.confirmPassword = 'Las contraseñas no coinciden';
    }
    return errs;
  }, [storeName, merchantName, email, password, confirmPassword]);

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Al digitar confirmar contraseña, valida inmediatamente si no coincide
  const confirmPasswordError =
    (touched.confirmPassword || confirmPassword.length > 0) && errors.confirmPassword
      ? errors.confirmPassword
      : undefined;

  const passwordError =
    (touched.password || (password.length > 0 && password.length < 6 && (touched.confirmPassword || confirmPassword.length > 0))) && errors.password
      ? errors.password
      : touched.password && errors.password
      ? errors.password
      : undefined;

  async function onRegister() {
    setTouched({
      storeName: true,
      phone: true,
      merchantName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (Object.keys(errors).length > 0) {
      const firstError =
        errors.storeName ||
        errors.phone ||
        errors.merchantName ||
        errors.email ||
        errors.password ||
        errors.confirmPassword;
      return showAlert({
        title: 'Verifica los campos',
        message: firstError,
        type: 'warning',
      });
    }

    setLoading(true);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          store_name: storeName.trim(),
          merchant_name: merchantName.trim(),
          phone: cleanPhone,
          store_phone: cleanPhone,
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

    // Si la sesión se inició automáticamente, garantizar que el teléfono se guarde en profiles y stores
    if (data.session && data.user) {
      try {
        await supabase
          .from('profiles')
          .update({ phone: cleanPhone })
          .eq('id', data.user.id);
      } catch (_pErr) {}

      try {
        await supabase
          .from('stores')
          .update({ phone: cleanPhone })
          .eq('owner_id', data.user.id);
      } catch (_sErr) {}
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
            onBlur={() => handleBlur('storeName')}
            error={touched.storeName ? errors.storeName : undefined}
            placeholder="Ej. Tienda La Floresta"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                phoneRef.current?.focus();
              }
            }}
          />

          <Input
            ref={phoneRef}
            label="Teléfono de contacto"
            value={phone}
            onChange={e => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setPhone(val);
            }}
            onBlur={() => handleBlur('phone')}
            error={touched.phone ? errors.phone : undefined}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Ej. 300 123 4567"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                merchantNameRef.current?.focus();
              }
            }}
          />

          <Input
            ref={merchantNameRef}
            label="Tu nombre completo"
            value={merchantName}
            onChange={e => setMerchantName(e.target.value)}
            onBlur={() => handleBlur('merchantName')}
            error={touched.merchantName ? errors.merchantName : undefined}
            placeholder="Ej. Carmen Rodríguez"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                emailRef.current?.focus();
              }
            }}
          />

          <Input
            ref={emailRef}
            label="Correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onBlur={() => handleBlur('email')}
            error={touched.email ? errors.email : undefined}
            type="email"
            placeholder="tutienda@mail.com"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                passwordRef.current?.focus();
              }
            }}
          />

          <Input
            ref={passwordRef}
            label="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onBlur={() => handleBlur('password')}
            error={passwordError}
            type="password"
            placeholder="Mínimo 6 caracteres"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                confirmPasswordRef.current?.focus();
              }
            }}
          />

          <Input
            ref={confirmPasswordRef}
            label="Confirmar contraseña"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onBlur={() => handleBlur('confirmPassword')}
            error={confirmPasswordError}
            type="password"
            placeholder="Repite tu contraseña"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onRegister();
              }
            }}
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
