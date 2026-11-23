import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoArrowBack,
  IoCheckmarkCircle,
  IoSearch,
  IoShieldCheckmarkOutline,
  IoCloudOfflineOutline,
} from 'react-icons/io5';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';
import { Input } from '../components/ui/Input';
import { showAlert } from '../utils/alert';
import { showToast } from '../utils/toast';
import { customerAuthEmail } from '../lib/customerAuth';
import { supabase } from '../lib/supabase';
import { findCustomerForActivation } from '../services/customerPortal';
import { Colors, Radius } from '../theme';
import nuevoLogo from '../assets/NuevoLogo.png';

export function CustomerRegisterScreen() {
  const navigate = useNavigate();
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Validación estilo Formik (touched + errors en tiempo real)
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const phoneRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!document.trim()) {
      errs.document = 'Ingresa tu documento o cédula';
    }
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!phone.trim()) {
      errs.phone = 'Ingresa tu número celular';
    } else if (cleanPhone.length < 10) {
      errs.phone = 'El celular debe tener al menos 10 dígitos';
    }
    if (!password) {
      errs.password = 'La contraseña es requerida';
    } else if (password.length < 6) {
      errs.password = 'Mínimo 6 caracteres';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Debes confirmar tu contraseña';
    } else if (confirmPassword !== password) {
      errs.confirmPassword = 'Las contraseñas no coinciden';
    }
    return errs;
  }, [document, phone, password, confirmPassword]);

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

  async function checkDocument() {
    if (!document.trim()) {
      setTouched(prev => ({ ...prev, document: true }));
      return showAlert({
        title: 'Faltan datos',
        message: 'Ingresa tu cédula',
        type: 'warning',
      });
    }
    setLoading(true);
    try {
      const cleanDoc = document.trim();
      const result = await findCustomerForActivation(cleanDoc);
      if (!result) {
        return showAlert({
          title: 'No te encontramos',
          message: 'Pídele al tendero que te registre primero.',
          type: 'warning',
        });
      }

      // Si la cuenta ya fue activada previamente
      if (result.is_activated) {
        return showAlert({
          title: 'Cuenta ya registrada',
          message: 'Esta cuenta ya existe y se encuentra activa. Puedes iniciar sesión o restablecer tu contraseña.',
          type: 'info',
          buttons: [
            {
              text: 'Restablecer contraseña',
              onPress: () =>
                navigate(
                  `/forgot-password?role=customer&document=${encodeURIComponent(cleanDoc)}`,
                ),
            },
            {
              text: 'Iniciar sesión',
              onPress: () =>
                navigate(
                  `/login?role=customer&document=${encodeURIComponent(cleanDoc)}`,
                ),
            },
          ],
        });
      }

      // Validación complementaria contra auth.users
      const { data: emailExists } = await supabase.rpc('check_user_email_exists', {
        p_email: customerAuthEmail(cleanDoc),
      });
      if (emailExists) {
        return showAlert({
          title: 'Cuenta ya registrada',
          message: 'Esta cuenta ya existe y se encuentra activa. Puedes iniciar sesión o restablecer tu contraseña.',
          type: 'info',
          buttons: [
            {
              text: 'Restablecer contraseña',
              onPress: () =>
                navigate(
                  `/forgot-password?role=customer&document=${encodeURIComponent(cleanDoc)}`,
                ),
            },
            {
              text: 'Iniciar sesión',
              onPress: () =>
                navigate(
                  `/login?role=customer&document=${encodeURIComponent(cleanDoc)}`,
                ),
            },
          ],
        });
      }

      setCustomer(result);
    } catch (error: any) {
      showAlert({
        title: 'No se pudo consultar',
        message: error?.message ?? 'Intenta de nuevo',
        type: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function activate() {
    setTouched(prev => ({
      ...prev,
      phone: true,
      password: true,
      confirmPassword: true,
    }));

    if (errors.phone || errors.password || errors.confirmPassword) {
      const firstError = errors.phone || errors.password || errors.confirmPassword;
      return showAlert({
        title: 'Verifica los campos',
        message: firstError,
        type: 'warning',
      });
    }

    setLoading(true);
    const cleanDoc = document.trim();
    const { data, error } = await supabase.auth.signUp({
      email: customerAuthEmail(cleanDoc),
      password,
      options: {
        data: { user_type: 'customer', customer_id: customer.customer_id, phone },
      },
    });

    if (error || !data.user) {
      setLoading(false);
      const errMsg = (error?.message || '').toLowerCase();
      if (
        errMsg.includes('already registered') ||
        errMsg.includes('ya está registrado') ||
        errMsg.includes('already exists')
      ) {
        return showAlert({
          title: 'Cuenta ya registrada',
          message: 'Tu cuenta ya fue activada anteriormente. Si no recuerdas tu contraseña, puedes restablecerla.',
          type: 'info',
          buttons: [
            {
              text: 'Restablecer contraseña',
              onPress: () =>
                navigate(
                  `/forgot-password?role=customer&document=${encodeURIComponent(cleanDoc)}`,
                ),
            },
            {
              text: 'Iniciar sesión',
              onPress: () =>
                navigate(
                  `/login?role=customer&document=${encodeURIComponent(cleanDoc)}`,
                ),
            },
          ],
        });
      }
      return showAlert({
        title: 'No se pudo activar',
        message: error?.message ?? 'Intenta de nuevo',
        type: 'destructive',
      });
    }

    // Si signUp no devolvió sesión directa, autenticar con las credenciales ingresadas
    if (!data.session) {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: customerAuthEmail(cleanDoc),
          password,
        });

      setLoading(false);

      if (signInError || !signInData.session) {
        return showAlert({
          title: 'Cuenta activada',
          message:
            'Tu cuenta ha sido activada correctamente. Por favor ingresa tu contraseña para acceder a tu perfil.',
          type: 'info',
          buttons: [
            {
              text: 'Iniciar sesión',
              onPress: () =>
                navigate(
                  `/login?role=customer&document=${encodeURIComponent(cleanDoc)}`,
                ),
            },
          ],
        });
      }
    } else {
      setLoading(false);
    }

    // Sesión establecida exitosamente: mostrar toast de bienvenida no bloqueante y entrar
    showToast(
      '¡Bienvenido a Tenderito!',
      'Tu cuenta ha sido activada correctamente',
    );
    navigate('/');
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
        {/* Logo */}
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <img
            src={nuevoLogo}
            alt="Tenderito"
            style={{ width: 200, height: 'auto', display: 'block', margin: '0 auto' }}
          />
        </div>

        {/* Formulario */}
        <Card
          style={{
            padding: 22,
            borderRadius: 22,
            border: `1.5px solid ${Colors.border}`,
            boxShadow: '0 4px 14px rgba(20, 32, 51, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: Colors.text, letterSpacing: '-0.3px' }}>
              Activa tu cuenta de cliente
            </div>
            <div style={{ fontSize: 13.5, color: Colors.textSecondary, lineHeight: '19px', marginTop: 4 }}>
              Ingresa tu número de documento para consultar si tu tendero ya te registró en su libreta.
            </div>
          </div>

          <Input
            label="Número de documento"
            value={document}
            onChange={e => setDocument(e.target.value)}
            onBlur={() => handleBlur('document')}
            error={touched.document ? errors.document : undefined}
            placeholder="Ej: 1020304050"
            disabled={!!customer}
          />

          {!customer ? (
            <Button
              title={loading ? 'Consultando…' : 'Consultar cédula'}
              onPress={checkDocument}
              disabled={loading}
              icon={<IoSearch size={18} />}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 6 }}>
              {/* Box cliente encontrado */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: '#E3F8EC',
                  border: '1px solid #B6E8CA',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <IoCheckmarkCircle size={18} color={Colors.success} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: Colors.success }}>
                    Cliente encontrado
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: Colors.text }}>
                  {customer.name}
                </div>
                {customer.phone && (
                  <div style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: 500 }}>
                    Teléfono registrado: {customer.phone}
                  </div>
                )}
              </div>

              <Input
                ref={phoneRef}
                label="Confirma tu celular"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onBlur={() => handleBlur('phone')}
                error={touched.phone ? errors.phone : undefined}
                placeholder="Ej: 3001234567"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    passwordRef.current?.focus();
                  }
                }}
              />

              <Input
                ref={passwordRef}
                label="Crea una contraseña"
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
                    activate();
                  }
                }}
              />

              <Button
                title={loading ? 'Activando cuenta…' : 'Activar mi cuenta'}
                onPress={activate}
                disabled={loading}
              />
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 4,
              marginTop: 6,
              padding: '4px 0',
            }}>
            <span style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: 500 }}>
              ¿Ya tienes cuenta activa?{' '}
            </span>
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/login?role=customer${document.trim() ? `&document=${encodeURIComponent(document.trim())}` : ''}`,
                )
              }
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: Colors.primary,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}>
              Inicia sesión
            </button>
          </div>
        </Card>

        {/* Sellos de confianza */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 14,
            marginTop: 8,
            padding: '6px 14px',
            borderRadius: 999,
            backgroundColor: 'rgba(255, 255, 255, 0.75)',
            alignSelf: 'center',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <IoShieldCheckmarkOutline size={13} color={Colors.textSecondary} />
            <span style={{ fontSize: 11.5, color: Colors.textSecondary, fontWeight: 600 }}>
              Tus datos siempre seguros
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <IoCloudOfflineOutline size={13} color={Colors.textSecondary} />
            <span style={{ fontSize: 11.5, color: Colors.textSecondary, fontWeight: 600 }}>
              Funciona sin internet
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
