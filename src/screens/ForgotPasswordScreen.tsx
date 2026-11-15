import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  IoArrowBack,
  IoStorefrontOutline,
  IoPersonOutline,
  IoMailOutline,
  IoKeyOutline,
  IoCheckmarkCircle,
  IoShieldCheckmarkOutline,
  IoCloudOfflineOutline,
  IoLockClosedOutline,
  IoCallOutline,
} from 'react-icons/io5';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';
import { showAlert } from '../utils/alert';
import { supabase } from '../lib/supabase';
import { Colors } from '../theme';
import nuevoLogo from '../assets/NuevoLogo.png';

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get('role') as 'store' | 'customer') || 'store';
  const initialEmail = searchParams.get('email') || '';
  const initialDoc = searchParams.get('document') || '';

  const [role, setRole] = useState<'store' | 'customer'>(initialRole);
  
  // Estado Tendero
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState('');
  const [stepStore, setStepStore] = useState<'request' | 'verify'>('request');
  const [newPasswordStore, setNewPasswordStore] = useState('');
  const [confirmPasswordStore, setConfirmPasswordStore] = useState('');

  // Estado Cliente
  const [document, setDocument] = useState(initialDoc);
  const [phone, setPhone] = useState('');
  const [newPasswordCust, setNewPasswordCust] = useState('');
  const [confirmPasswordCust, setConfirmPasswordCust] = useState('');

  const [loading, setLoading] = useState(false);

  // ─── 1. Flujo Tendero: Solicitar código OTP al correo ─────────────────────────
  async function handleSendStoreOtp() {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return showAlert({
        title: 'Correo inválido',
        message: 'Por favor ingresa un correo electrónico válido.',
        type: 'warning',
      });
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        throw error;
      }

      setStepStore('verify');
      showAlert({
        title: 'Código enviado',
        message: `Hemos enviado un código de 6 dígitos a ${cleanEmail}. Revisa también tu carpeta de spam o correo no deseado.`,
        type: 'success',
      });
    } catch (err: any) {
      console.warn('[ForgotPassword] Error enviando recuperación:', err);
      showAlert({
        title: 'No se pudo enviar',
        message: err?.message || 'Verifica que el correo esté registrado y vuelve a intentarlo.',
        type: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  // ─── 2. Flujo Tendero: Validar código OTP y cambiar contraseña ───────────────
  async function handleVerifyStoreOtp() {
    const cleanEmail = email.trim();
    const cleanCode = otpCode.trim();

    if (!cleanCode || cleanCode.length < 6) {
      return showAlert({
        title: 'Código incompleto',
        message: 'Ingresa el código de 6 dígitos enviado a tu correo.',
        type: 'warning',
      });
    }

    if (newPasswordStore.length < 6) {
      return showAlert({
        title: 'Contraseña muy corta',
        message: 'La nueva contraseña debe tener al menos 6 caracteres.',
        type: 'warning',
      });
    }

    if (newPasswordStore !== confirmPasswordStore) {
      return showAlert({
        title: 'Las contraseñas no coinciden',
        message: 'Verifica que ambas contraseñas coincidan.',
        type: 'warning',
      });
    }

    setLoading(true);
    try {
      // Validar código OTP de recuperación
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'recovery',
      });

      if (error || !data.session) {
        throw new Error(error?.message || 'El código es inválido o ha expirado.');
      }

      // Actualizar la contraseña en Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPasswordStore,
      });

      if (updateError) {
        throw updateError;
      }

      // Cerrar sesión de recuperación para que entre limpio
      await supabase.auth.signOut();

      showAlert({
        title: '¡Contraseña restablecida!',
        message: 'Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión.',
        type: 'success',
        buttons: [
          {
            text: 'Ir a Iniciar Sesión',
            onPress: () => navigate(`/login?role=store&email=${encodeURIComponent(cleanEmail)}`),
          },
        ],
      });
    } catch (err: any) {
      showAlert({
        title: 'Error al restablecer',
        message: err?.message || 'El código es incorrecto o venció. Intenta pedir uno nuevo.',
        type: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  // ─── 3. Flujo Cliente: Validar Cédula + Celular y actualizar contraseña ──────
  async function handleResetCustomerPassword() {
    const cleanDoc = document.trim();
    const cleanPhone = phone.trim();

    if (!cleanDoc) {
      return showAlert({
        title: 'Faltan datos',
        message: 'Ingresa tu número de identificación o cédula.',
        type: 'warning',
      });
    }

    if (!cleanPhone || cleanPhone.length < 7) {
      return showAlert({
        title: 'Faltan datos',
        message: 'Confirma el número de celular registrado en tu cuenta.',
        type: 'warning',
      });
    }

    if (newPasswordCust.length < 6) {
      return showAlert({
        title: 'Contraseña corta',
        message: 'La nueva contraseña debe tener mínimo 6 caracteres.',
        type: 'warning',
      });
    }

    if (newPasswordCust !== confirmPasswordCust) {
      return showAlert({
        title: 'No coinciden',
        message: 'La confirmación de la contraseña no coincide.',
        type: 'warning',
      });
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('reset_customer_password', {
        p_document_number: cleanDoc,
        p_phone: cleanPhone,
        p_new_password: newPasswordCust,
      });

      if (error) {
        throw error;
      }

      if (data && !data.success) {
        throw new Error(data.error || 'No fue posible restablecer la contraseña.');
      }

      showAlert({
        title: '¡Contraseña actualizada!',
        message: 'Ya puedes ingresar con tu documento y tu nueva contraseña.',
        type: 'success',
        buttons: [
          {
            text: 'Iniciar sesión',
            onPress: () => navigate(`/login?role=customer&document=${encodeURIComponent(cleanDoc)}`),
          },
        ],
      });
    } catch (err: any) {
      showAlert({
        title: 'No se pudo restablecer',
        message: err?.message || 'Verifica tus datos o pídele a tu tendero que confirme tu celular.',
        type: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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
        <div style={{ textAlign: 'center', padding: '4px 0' }}>
          <img
            src={nuevoLogo}
            alt="Tenderito"
            style={{ width: 170, height: 'auto', display: 'block', margin: '0 auto' }}
          />
        </div>

        {/* Selector de Rol */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: 4,
            width: '100%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            boxSizing: 'border-box',
          }}>
          {[
            { id: 'store', label: 'Soy tendero', icon: <IoStorefrontOutline size={18} /> },
            { id: 'customer', label: 'Soy cliente', icon: <IoPersonOutline size={18} /> },
          ].map(r => {
            const active = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRole(r.id as any);
                  setStepStore('request');
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 20,
                  backgroundColor: active ? Colors.primaryLight : 'transparent',
                  color: active ? Colors.primary : Colors.textSecondary,
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}>
                {r.icon}
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tarjeta de Recuperación */}
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
              ¿Olvidaste tu contraseña?
            </h2>
            <p
              style={{
                fontSize: 13,
                color: Colors.textSecondary,
                textAlign: 'center',
                margin: 0,
                lineHeight: '19px',
              }}>
              {role === 'store'
                ? stepStore === 'request'
                  ? 'Ingresa tu correo registrado y te enviaremos un código de 6 dígitos para restablecerla.'
                  : `Ingresa el código que enviamos a tu correo ${email} y tu nueva contraseña.`
                : 'Ingresa tu documento y confirma tu celular registrado para crear una nueva contraseña.'}
            </p>
          </div>

          {/* ─── VISTA TENDERO ─── */}
          {role === 'store' && (
            <>
              {stepStore === 'request' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Input
                    label="Correo electrónico"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    type="email"
                    placeholder="tutienda@mail.com"
                    disabled={loading}
                  />

                  <Button
                    title={loading ? 'Enviando código…' : 'Enviar código de recuperación'}
                    onPress={handleSendStoreOtp}
                    disabled={loading}
                    icon={<IoMailOutline size={18} />}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Banner de código enviado */}
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: '#EBF5FF',
                      border: '1px solid #C3E0FF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                    <IoCheckmarkCircle size={20} color={Colors.primary} />
                    <span style={{ fontSize: 12.5, color: Colors.primaryDark, fontWeight: 600 }}>
                      Código enviado a {email}
                    </span>
                  </div>

                  <Input
                    label="Código de 6 dígitos"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="Ej: 123456"
                    maxLength={6}
                  />

                  <Input
                    label="Nueva contraseña"
                    value={newPasswordStore}
                    onChange={e => setNewPasswordStore(e.target.value)}
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                  />

                  <Input
                    label="Confirmar nueva contraseña"
                    value={confirmPasswordStore}
                    onChange={e => setConfirmPasswordStore(e.target.value)}
                    type="password"
                    placeholder="Repite la contraseña"
                  />

                  <Button
                    title={loading ? 'Restableciendo…' : 'Restablecer contraseña'}
                    onPress={handleVerifyStoreOtp}
                    disabled={loading}
                    icon={<IoKeyOutline size={18} />}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setStepStore('request')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: Colors.textSecondary,
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}>
                      Cambiar correo
                    </button>
                    <button
                      type="button"
                      onClick={handleSendStoreOtp}
                      disabled={loading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: Colors.primary,
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                      }}>
                      Reenviar código
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── VISTA CLIENTE ─── */}
          {role === 'customer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input
                label="Número de documento"
                value={document}
                onChange={e => setDocument(e.target.value)}
                placeholder="Tu cédula"
                disabled={loading}
              />

              <Input
                label="Celular registrado"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ej: 3001234567"
                disabled={loading}
              />

              <Input
                label="Nueva contraseña"
                value={newPasswordCust}
                onChange={e => setNewPasswordCust(e.target.value)}
                type="password"
                placeholder="Mínimo 6 caracteres"
              />

              <Input
                label="Confirmar nueva contraseña"
                value={confirmPasswordCust}
                onChange={e => setConfirmPasswordCust(e.target.value)}
                type="password"
                placeholder="Repite la contraseña"
              />

              <Button
                title={loading ? 'Restableciendo…' : 'Restablecer contraseña'}
                onPress={handleResetCustomerPassword}
                disabled={loading}
                icon={<IoLockClosedOutline size={18} />}
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
              paddingTop: 8,
              borderTop: `1px solid ${Colors.border}`,
            }}>
            <span style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: 500 }}>
              ¿Te acordaste de tu contraseña?{' '}
            </span>
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
              Protección Tenderito
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}